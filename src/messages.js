import { escapeMarkdown } from 'discord.js';

const JOIN_EMOJI = '👋';
const BOOST_EMOJI = '💜';

const count = (value) => value.toLocaleString('en-US');

export const welcomeMessage = ({ userId, memberCount }) => {
  const lines = [`${JOIN_EMOJI} <@${userId}> just joined the server!`];

  if (memberCount) {
    lines.push(`-# Member #${count(memberCount)}`);
  }

  return lines.join('\n');
};

export const boostMessage = ({ displayName, boostCount, tier }) => {
  const lines = [`${BOOST_EMOJI} **${escapeMarkdown(displayName)}** just boosted the server!`];
  const detail = [];

  if (boostCount) {
    detail.push(`${count(boostCount)} boost${boostCount === 1 ? '' : 's'}`);
  }

  if (tier) {
    detail.push(`Level ${tier}`);
  }

  if (detail.length) {
    lines.push(`-# The server is now at ${detail.join(' — ')}`);
  }

  return lines.join('\n');
};
