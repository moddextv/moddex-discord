import { estateStats, lookupAccount, lookupChannel, lookupRoles, suggestAccounts } from './api.js';
import { accountEmbed, channelEmbed, notFoundReply, rolesEmbed, statsEmbed } from './messages.js';
import { config } from './config.js';
import { log } from './log.js';

// the api refuses a shorter prefix: it would match too much to rank
const MIN_PREFIX = 3;

const loginOption = (name, description) => ({
  type: 3,
  name,
  description,
  required: true,
  max_length: 25,
  autocomplete: true
});

const COMMANDS = {
  user: {
    description: 'roles this account holds elsewhere',
    options: [loginOption('login', 'the twitch login to look up')],
    lookup: ([login]) => lookupAccount(login),
    run: async (account) => accountEmbed(account, account.roles)
  },
  channel: {
    description: 'roles this channel has handed out',
    options: [loginOption('login', 'the twitch login to look up')],
    lookup: ([login]) => lookupChannel(login),
    run: async (account) => channelEmbed(account, account.granted)
  },
  roles: {
    description: 'whether one account holds a role in one channel',
    options: [
      loginOption('account', 'the account to ask about'),
      loginOption('channel', 'the channel to ask about')
    ],
    lookup: ([account, channel]) => lookupRoles(account, channel),
    run: async (held, logins) => rolesEmbed(logins, held)
  },
  stats: {
    description: 'how much of twitch moddex has indexed',
    run: async () => statsEmbed(await estateStats())
  }
};

export const definitions = Object.entries(COMMANDS).map(([name, command]) => ({
  name,
  description: command.description,
  ...(command.options ? { options: command.options } : {})
}));

const typed = (value) => value.trim().replace(/^@/, '');

const answer = async (command, interaction) => {
  if (!command.options) return { embeds: [await command.run()] };

  const logins = command.options.map((option) =>
    typed(interaction.options.getString(option.name, true))
  );
  const found = await command.lookup(logins);

  return found ? { embeds: [await command.run(found, logins)] } : notFoundReply(logins);
};

export const handle = async (interaction) => {
  const command = COMMANDS[interaction.commandName];

  if (!command) return;

  await interaction.deferReply();

  try {
    await interaction.editReply(await answer(command, interaction));
  } catch (error) {
    log.error(`/${interaction.commandName} failed`, error);
    await interaction.editReply('moddex could not answer that just now. Try again in a moment.');
  }
};

const label = ({ login, name }) =>
  name && name.toLowerCase() !== login ? `${name} (${login})` : login;

export const suggestions = async (prefix) => {
  const wanted = typed(prefix);

  if (wanted.length < MIN_PREFIX) return [];

  const found = await suggestAccounts(wanted);

  return (found?.items ?? []).map((account) => ({ name: label(account), value: account.login }));
};

/**
 * A failed suggestion is worth no noise and no fallback: discord has dropped the
 * reply by the time a slow api answers, and the person is still typing anyway.
 */
export const suggest = async (interaction) => {
  const choices = await suggestions(interaction.options.getFocused()).catch(() => []);

  await interaction.respond(choices).catch(() => {});
};

// guild-scoped, so a changed command is live at once instead of within the hour
export const register = async (client) => {
  if (!config.guildId) {
    log.warn('no guild id, slash commands not registered');
    return;
  }

  const guild = await client.guilds.fetch(config.guildId);
  await guild.commands.set(definitions);

  log.info(`slash commands registered: ${definitions.map((one) => `/${one.name}`).join(' ')}`);
};
