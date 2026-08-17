import { Client, Events, GatewayIntentBits, MessageType } from 'discord.js';

import { config } from './config.js';
import { log } from './log.js';
import { claim } from './dedupe.js';
import { boostMessage, welcomeMessage } from './messages.js';

// a repeat boost leaves premiumSince untouched, so the system message is the only other source
const BOOST_MESSAGE_TYPES = new Set([
  MessageType.GuildBoost,
  MessageType.GuildBoostTier1,
  MessageType.GuildBoostTier2,
  MessageType.GuildBoostTier3
]);

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});

let channel = null;

const post = async (content, mentionUserId) => {
  if (!config.announce) {
    log.info(`DISCORD_ANNOUNCE is false, not posted: ${content.split('\n')[0]}`);
    return;
  }

  if (!channel) {
    log.warn('no announce channel resolved, nothing posted');
    return;
  }

  await channel.send({
    content,
    allowedMentions: { users: mentionUserId ? [mentionUserId] : [] }
  });
};

const announceJoin = async (member) => {
  if (!config.welcomeEnabled || member.guild.id !== config.guildId || member.user.bot) {
    return;
  }

  if (!claim(`join:${member.id}`)) {
    return;
  }

  await post(
    welcomeMessage({ userId: member.id, memberCount: member.guild.memberCount }),
    member.id
  );
};

const announceBoost = async (guild, user, displayName) => {
  if (!config.boostEnabled || guild.id !== config.guildId) {
    return;
  }

  if (!claim(`boost:${user.id}`)) {
    return;
  }

  await post(
    boostMessage({
      displayName: displayName || user.displayName || user.username,
      boostCount: guild.premiumSubscriptionCount,
      tier: guild.premiumTier
    })
  );
};

const guard =
  (name, handler) =>
  (...args) =>
    handler(...args).catch((error) => log.error(`${name} failed`, error));

client.once(Events.ClientReady, async () => {
  log.info(`signed in as ${client.user.tag}`);

  try {
    channel = await client.channels.fetch(config.announceChannelId);
  } catch (error) {
    log.error(`announce channel ${config.announceChannelId} could not be fetched`, error);
    return;
  }

  if (!channel?.isTextBased() || channel.isDMBased()) {
    log.error(`announce channel ${config.announceChannelId} is not a guild text channel`);
    channel = null;
    return;
  }

  if (channel.guild.id !== config.guildId) {
    log.error(`announce channel belongs to guild ${channel.guild.id}, not ${config.guildId}`);
    channel = null;
    return;
  }

  log.info(`announcing in #${channel.name} of ${channel.guild.name}`);

  if (!config.announce) {
    log.warn('DISCORD_ANNOUNCE is false — events are logged, nothing is posted');
  }
});

client.on(Events.GuildMemberAdd, guard('welcome', announceJoin));

client.on(
  Events.GuildMemberUpdate,
  guard('boost via member update', async (before, after) => {
    if (before.premiumSince || !after.premiumSince) {
      return;
    }

    await announceBoost(after.guild, after.user, after.displayName);
  })
);

client.on(
  Events.MessageCreate,
  guard('boost via system message', async (message) => {
    if (!message.guild || !BOOST_MESSAGE_TYPES.has(message.type)) {
      return;
    }

    await announceBoost(message.guild, message.author, message.member?.displayName);
  })
);

client.on(Events.Error, (error) => log.error('gateway error', error));

client.on(Events.Warn, (message) => log.warn(`gateway: ${message}`));

export const isReady = () => client.isReady();

export const pingMs = () => (client.ws.ping >= 0 ? Math.round(client.ws.ping) : null);

export const start = () => client.login(config.token);

export const stop = () => client.destroy();
