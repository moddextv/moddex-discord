const optional = (key, fallback) => process.env[key] || fallback;

export const config = {
  port: Number(optional('PORT', '4003')),

  token: optional('DISCORD_TOKEN', ''),

  guildId: optional('DISCORD_GUILD_ID', ''),

  announceChannelId: optional('DISCORD_ANNOUNCE_CHANNEL_ID', ''),

  announce: optional('DISCORD_ANNOUNCE', 'false') === 'true',

  welcomeEnabled: optional('DISCORD_WELCOME_ENABLED', 'true') === 'true',

  boostEnabled: optional('DISCORD_BOOST_ENABLED', 'true') === 'true',

  dedupeSeconds: Number(optional('DISCORD_DEDUPE_SECONDS', '300'))
};

export const missingKeys = (from = config) =>
  ['token', 'guildId', 'announceChannelId'].filter((key) => !from[key]);
