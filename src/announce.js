import { config } from './config.js';
import { log } from './log.js';
import { claim } from './dedupe.js';
import { boostEmbed, welcomeEmbed } from './messages.js';

let channel = null;

export const resolveChannel = async (client) => {
  channel = null;

  const found = await client.channels.fetch(config.announceChannelId).catch((error) => {
    log.error(`announce channel ${config.announceChannelId} could not be fetched`, error);
    return null;
  });

  if (!found) return;

  if (!found.isTextBased() || found.isDMBased()) {
    log.error(`announce channel ${config.announceChannelId} is not a guild text channel`);
    return;
  }

  if (found.guild.id !== config.guildId) {
    log.error(`announce channel belongs to guild ${found.guild.id}, not ${config.guildId}`);
    return;
  }

  channel = found;
  log.info(`announcing in #${channel.name} of ${channel.guild.name}`);

  if (!config.announce) {
    log.warn('DISCORD_ANNOUNCE is false, events are logged and nothing is posted');
  }
};

const post = async (embed) => {
  if (!config.announce) {
    log.info(`DISCORD_ANNOUNCE is false, not posted: ${embed.author.name} ${embed.description}`);
    return;
  }

  if (!channel) {
    log.warn('no announce channel resolved, nothing posted');
    return;
  }

  await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
};

const identify = (user, member) => ({
  displayName: member?.displayName || user.displayName || user.username,
  avatarUrl: (member ?? user).displayAvatarURL({ size: 128 }),
  userId: user.id
});

export const announceJoin = async (member) => {
  if (!config.welcomeEnabled || member.guild.id !== config.guildId || member.user.bot) return;

  if (!claim(`join:${member.id}`)) return;

  await post(
    welcomeEmbed({ ...identify(member.user, member), memberCount: member.guild.memberCount })
  );
};

export const announceBoost = async (guild, user, member) => {
  if (!config.boostEnabled || guild.id !== config.guildId) return;

  if (!claim(`boost:${user.id}`)) return;

  await post(
    boostEmbed({
      ...identify(user, member),
      boostCount: guild.premiumSubscriptionCount,
      tier: guild.premiumTier
    })
  );
};
