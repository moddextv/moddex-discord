// discord's nitro pink, the colour of the boost bar and the boost gem
const BOOST_COLOR = 0xff73fa;
const JOIN_COLOR = 0x5865f2;

const count = (value) => value.toLocaleString('en-US');

const author = ({ displayName, avatarUrl, userId }) => ({
  name: displayName,
  icon_url: avatarUrl,
  url: `https://discord.com/users/${userId}`
});

const describe = (sentence, subtext) => (subtext ? `${sentence}\n-# ${subtext}` : sentence);

/**
 * The author line is not markdown and a display name is left alone there. A
 * description is markdown, and a discord username may hold `_` and `.` — so
 * `some_user_name` would come out with "user" in italics. Escaped here and
 * nowhere else, because nowhere else puts a name a stranger chose into markdown.
 */
const escape = (text) => String(text).replace(/([\\_*~`|>])/g, '\\$1');

// the handle, not the display name: the author line already carries that one
const did = (username, verb) => (username ? `**${escape(username)}** ${verb}` : verb);

export const welcomeEmbed = ({ displayName, username, avatarUrl, userId, memberCount }) => ({
  color: JOIN_COLOR,
  author: author({ displayName, avatarUrl, userId }),
  description: describe(
    did(username, 'just joined the server!'),
    memberCount ? `Member #${count(memberCount)}` : ''
  )
});

export const boostEmbed = ({ displayName, username, avatarUrl, userId, boostCount, tier }) => {
  const detail = [];

  if (boostCount) {
    detail.push(`${count(boostCount)} boost${boostCount === 1 ? '' : 's'}`);
  }

  if (tier) {
    detail.push(`Level ${tier}`);
  }

  return {
    color: BOOST_COLOR,
    author: author({ displayName, avatarUrl, userId }),
    description: describe(
      did(username, 'just boosted the server!'),
      detail.length ? `The server is now at ${detail.join(', ')}` : ''
    )
  };
};

// the mark's outer bracket — vip pink, and nothing else in discord wears it
const MODDEX_COLOR = 0xf472b6;

const profileAuthor = (account, kind) => ({
  name: account.name || account.login,
  icon_url: account.avatar || undefined,
  url: `https://moddex.tv/${kind}/${account.login}`
});

// an empty inline field fills the third slot, so a row holds two and not three
const SPACER = { name: '​', value: '​', inline: true };

const pairs = (fields) => fields.flatMap((field, i) => (i % 2 ? [field, SPACER] : [field]));

const links = (account, kind) =>
  `[twitch](https://twitch.tv/${account.login}) · [moddex](https://moddex.tv/${kind}/${account.login})`;

// a missing scale is the api declining to say; a zero count is an answer
const holds = (scale) => {
  if (!scale) return '—';
  if (!scale.count) return '0';

  return scale.rank ? `${count(scale.count)}\n-# #${count(scale.rank)}` : count(scale.count);
};

// application emoji ids, keyed by the badge name the api sends — "top donator" has a space
export const BADGE_EMOJI = new Map([
  ['bot', '1539603630594723924'],
  ['admin', '1539603601377198190'],
  ['top donator', '1539603661146169435'],
  ['donator', '1539603638916489246'],
  ['booster', '1539603622210310185'],
  ['staff', '1539603653877305415'],
  ['partner', '1539603646059126875'],
  ['affiliate', '1539603613410918430'],
  ['translator', '1542129520696631316']
]);

/**
 * A row falls back to plain names unless every badge on it has an emoji, so one
 * missing entry costs an account its whole row rather than one picture. The map
 * is a second copy of a list the api owns, and a test against a third copy only
 * proves the three were written on the same day: `translator` shipped on
 * 2026-08-26 and nothing here noticed.
 *
 * So the api is asked once at boot instead. It names what it cannot draw, which
 * is the part a person needs, and returns the names rather than logging them
 * itself so a caller can decide how loud to be.
 */
export const unrenderableBadges = (badges, emoji = BADGE_EMOJI) =>
  (badges || []).map((badge) => badge.name).filter((name) => !emoji.has(name));

const badgeLine = (account, emoji) => {
  const names = (account.badges || []).map((badge) => badge.name);

  if (!names.length) return '';

  const known = names.filter((name) => emoji.has(name));

  if (known.length === names.length) {
    return names
      .map((name) => `<:${name.replace(/[^a-z0-9_]/gi, '_')}:${emoji.get(name)}>`)
      .join(' ');
  }

  return `-# ${names.join(' · ')}`;
};

const notes = (account, kind, emoji = BADGE_EMOJI) => {
  const lines = [badgeLine(account, emoji), links(account, kind)];

  if (account.banned) lines.push(`-# banned: ${account.banned.reason}`);
  if (account.bot) lines.push('-# flagged as a bot');

  return lines.filter(Boolean).join('\n');
};

const stamp = (account) => `${count(account.followers || 0)} followers · ${account.id}`;

export const accountEmbed = (account, stats, emoji = BADGE_EMOJI) => ({
  color: MODDEX_COLOR,
  author: profileAuthor(account, 'user'),
  description: notes(account, 'user', emoji),
  fields: pairs([
    { name: 'Modding', value: holds(stats && stats.mod), inline: true },
    { name: 'Viping', value: holds(stats && stats.vip), inline: true },
    { name: 'Founding', value: holds(stats && stats.founder), inline: true }
  ]),
  footer: { text: stamp(account) }
});

export const channelEmbed = (account, granted, emoji = BADGE_EMOJI) => ({
  color: MODDEX_COLOR,
  author: profileAuthor(account, 'channel'),
  description: notes(account, 'channel', emoji),
  fields: pairs([
    { name: 'Mods', value: holds(granted && granted.mod), inline: true },
    { name: 'Vips', value: holds(granted && granted.vip), inline: true },
    { name: 'Founders', value: holds(granted && granted.founder), inline: true }
  ]),
  footer: { text: stamp(account) }
});

export const notFoundReply = (login) => `**${login}** is not in the moddex index.`;

export const statsEmbed = (stats) => ({
  color: MODDEX_COLOR,
  author: { name: 'moddex', url: 'https://moddex.tv' },
  fields: [
    { name: 'Channels', value: count(stats.channels), inline: true },
    { name: 'Accounts', value: count(stats.users), inline: true },
    SPACER,
    { name: 'Mods', value: count(stats.mods), inline: true },
    { name: 'Vips', value: count(stats.vips), inline: true },
    { name: 'Founders', value: count(stats.founders || 0), inline: true }
  ]
});
