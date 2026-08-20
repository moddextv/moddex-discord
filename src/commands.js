import { estateStats, lookupAccount, lookupChannel } from './api.js';
import { accountEmbed, channelEmbed, notFoundReply, statsEmbed } from './messages.js';
import { config } from './config.js';
import { log } from './log.js';

const login = {
  type: 3,
  name: 'login',
  description: 'the twitch login to look up',
  required: true,
  max_length: 25
};

const COMMANDS = {
  user: {
    description: 'roles this account holds elsewhere',
    options: [login],
    lookup: lookupAccount,
    run: async (account) => accountEmbed(account, account.roles)
  },
  channel: {
    description: 'roles this channel has handed out',
    options: [login],
    lookup: lookupChannel,
    run: async (account) => channelEmbed(account, account.granted)
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

const answer = async (command, interaction) => {
  if (!command.options) return { embeds: [await command.run()] };

  const wanted = interaction.options.getString('login', true).trim().replace(/^@/, '');
  const account = await command.lookup(wanted);

  return account ? { embeds: [await command.run(account)] } : notFoundReply(wanted);
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
