const optional = (key, fallback) => process.env[key] || fallback;

export const config = {
  port: Number(optional('PORT', '4003')),

  token: optional('DISCORD_TOKEN', ''),

  guildId: optional('DISCORD_GUILD_ID', ''),

  announceChannelId: optional('DISCORD_ANNOUNCE_CHANNEL_ID', ''),

  announce: optional('DISCORD_ANNOUNCE', 'false') === 'true',

  welcomeEnabled: optional('DISCORD_WELCOME_ENABLED', 'true') === 'true',

  boostEnabled: optional('DISCORD_BOOST_ENABLED', 'true') === 'true',

  dedupeSeconds: Number(optional('DISCORD_DEDUPE_SECONDS', '300')),

  boosterRoleId: optional('DISCORD_BOOSTER_ROLE_ID', ''),

  boosterSyncSeconds: Number(optional('BOOSTER_SYNC_SECONDS', '3600')),

  apiUrl: optional('MODDEX_API_URL', 'https://api.moddex.tv'),

  internalToken: optional('INTERNAL_API_TOKEN', ''),

  apiTimeoutMs: Number(optional('MODDEX_API_TIMEOUT_MS', '10000'))
};

export const missingKeys = (from = config) =>
  ['token', 'guildId', 'announceChannelId'].filter((key) => !from[key]);
