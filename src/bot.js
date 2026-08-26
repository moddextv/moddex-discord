import { Client, Events, GatewayIntentBits, MessageType } from 'discord.js';

import { config } from './config.js';
import { log } from './log.js';
import { announceBoost, announceJoin, resolveChannel } from './announce.js';
import { handle, register, suggest } from './commands.js';
import { reconcile } from './reconcile.js';
import { allBadges } from './api.js';
import { unrenderableBadges } from './messages.js';

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

const guard =
  (name, handler) =>
  (...args) =>
    handler(...args).catch((error) => log.error(`${name} failed`, error));

const runSync = (guild) => reconcile(guild).catch((error) => log.error('sync failed', error));

// the api owns the badge list; a name it sends that this bot has no emoji for
// costs an account its whole row, so say so once here rather than degrade quietly
const checkBadgeEmoji = async () => {
  const badges = await allBadges().catch((error) => {
    log.warn(`could not read the badge list, emoji left unchecked: ${error.message}`);
    return null;
  });

  if (!badges) return;

  const missing = unrenderableBadges(badges);

  if (missing.length) {
    log.warn(
      `no emoji for ${missing.join(', ')} — every badge row on those accounts is plain text`
    );
    return;
  }

  log.info(`badge emoji cover all ${badges.length} badges`);
};

const scheduleSync = async () => {
  const guild = await client.guilds.fetch(config.guildId).catch((error) => {
    log.error(`guild ${config.guildId} could not be fetched, sync is off`, error);
    return null;
  });

  if (!guild) return;

  await runSync(guild);

  setInterval(() => runSync(guild), config.syncSeconds * 1000).unref();
};

client.once(Events.ClientReady, async () => {
  log.info(`signed in as ${client.user.tag}`);

  await resolveChannel(client);
  await register(client).catch((error) => log.error('slash commands failed to register', error));
  await checkBadgeEmoji();
  await scheduleSync();
});

client.on(Events.GuildMemberAdd, guard('welcome', announceJoin));

client.on(
  Events.GuildMemberUpdate,
  guard('boost via member update', async (before, after) => {
    if (Boolean(before.premiumSince) === Boolean(after.premiumSince)) return;

    if (after.premiumSince) {
      await announceBoost(after.guild, after.user, after);
    }

    await runSync(after.guild);
  })
);

client.on(
  Events.MessageCreate,
  guard('boost via system message', async (message) => {
    if (!message.guild || !BOOST_MESSAGE_TYPES.has(message.type)) return;

    await announceBoost(message.guild, message.author, message.member);
    await runSync(message.guild);
  })
);

client.on(
  Events.InteractionCreate,
  guard('interaction', async (interaction) => {
    if (interaction.isAutocomplete()) return suggest(interaction);

    if (interaction.isChatInputCommand()) await handle(interaction);
  })
);

client.on(Events.Error, (error) => log.error('gateway error', error));

client.on(Events.Warn, (message) => log.warn(`gateway: ${message}`));

export const isReady = () => client.isReady();

export const pingMs = () => (client.ws.ping >= 0 ? Math.round(client.ws.ping) : null);

export const start = () => client.login(config.token);

export const stop = () => client.destroy();
