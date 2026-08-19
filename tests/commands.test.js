import { strict as assert } from 'node:assert';
import { afterEach, describe, it, mock } from 'node:test';

import { definitions, handle } from '../src/commands.js';
import { BADGE_EMOJI, accountEmbed, channelEmbed } from '../src/messages.js';

const ACCOUNT = {
  id: '22484632',
  login: 'forsen',
  name: 'forsen',
  avatar: 'https://cdn/forsen.png',
  follower: 1784565,
  banned: '',
  bot: false,
  badges: [{ id: 7, name: 'partner' }]
};

const interaction = (commandName, value = 'forsen') => {
  const replies = [];

  return {
    replies,
    commandName,
    isChatInputCommand: () => true,
    options: { getString: () => value },
    deferReply: async () => {},
    editReply: async (payload) => replies.push(payload)
  };
};

const stubFetch = (routes) => {
  mock.method(globalThis, 'fetch', async (url) => {
    const path = String(url).replace('https://api.moddex.tv', '');
    const match = Object.keys(routes).find((key) => path.startsWith(key));

    if (!match) return { ok: false, status: 500, json: async () => ({}) };

    const body = routes[match];

    if (body === 404) return { ok: false, status: 404, json: async () => ({}) };

    return { ok: true, status: 200, json: async () => body };
  });
};

afterEach(() => mock.restoreAll());

describe('the slash commands', () => {
  it('offers only reads, never anything that manages a badge or a role', () => {
    const names = definitions.map((one) => one.name).sort();

    assert.deepEqual(names, ['channel', 'stats', 'user']);

    for (const gone of ['abadge', 'rbadge', 'badges', 'role']) {
      assert.equal(names.includes(gone), false, `${gone} belongs on the website`);
    }
  });

  it('answers /stats from the estate rollup', async () => {
    stubFetch({
      '/v1/stats': { channels: 2084295, users: 8266656, mods: 11, vips: 2, founders: 3 }
    });

    const call = interaction('stats');
    await handle(call);

    const [embed] = call.replies[0].embeds;
    assert.equal(embed.fields[0].value, '2,084,295');
  });

  it('answers /user from the account and its held counts', async () => {
    stubFetch({
      '/v1/users?login=': [ACCOUNT],
      '/v1/users/22484632/stats': {
        mod: { count: 251, position: 203 },
        vip: { count: 30, position: 12439 },
        founder: { count: 2, position: 598756 }
      }
    });

    const call = interaction('user');
    await handle(call);

    const [embed] = call.replies[0].embeds;
    assert.equal(embed.author.name, 'forsen', 'the id belongs in the footer, not the title');
    assert.match(embed.footer.text, /1,784,565 followers · 22484632/);
    assert.equal(embed.fields[0].value, '251\n-# #203');
  });

  it('never asks for a role list it would have to count itself', async () => {
    stubFetch({
      '/v1/users?login=': [ACCOUNT],
      '/v1/mods': { total: 39 },
      '/v1/vips': { total: 3 },
      '/v1/founders': { total: 24 }
    });

    await handle(interaction('channel'));

    const asked = globalThis.fetch.mock.calls.map((one) => String(one.arguments[0]));
    const lists = asked.filter((url) => /\/v1\/(mods|vips|founders)/.test(url));

    assert.equal(lists.length, 3);
    for (const url of lists) {
      assert.match(url, /limit=1/, 'nightbot has 590k rows; only the total is wanted');
    }
  });

  it('tells an opted-out account apart from nothing at all — it must not', async () => {
    stubFetch({ '/v1/users?login=': 404 });

    const call = interaction('user', 'someone');
    await handle(call);

    assert.match(call.replies[0], /not in the moddex index/);
    assert.doesNotMatch(call.replies[0], /opted|ignored|private/i);
  });

  it('says so plainly when the api is down rather than pretending', async () => {
    stubFetch({});

    const call = interaction('user');
    await handle(call);

    assert.match(call.replies[0], /could not answer/);
  });
});

const SPACER_NAME = '​';

describe('the lookup embeds', () => {
  it('lays the roles out two to a row, so a fourth does not strand one alone', () => {
    const embed = accountEmbed(ACCOUNT, null);
    const gaps = embed.fields.filter((f) => f.name === SPACER_NAME).length;

    assert.equal(embed.fields.length, 4, 'three roles plus one spacer');
    assert.equal(gaps, 1);
    assert.equal(embed.fields[2].name, SPACER_NAME, 'the spacer closes the first row');
  });

  it('puts the badges above the links, not below', () => {
    const [first, second] = accountEmbed(ACCOUNT, null).description.split('\n');

    assert.match(first, /^<:partner:/);
    assert.match(second, /twitch/);
  });

  it('shows a dash where a granted total could not be read', () => {
    const embed = channelEmbed(ACCOUNT, { mod: 39, vip: null, founder: 24 });

    assert.equal(embed.fields[1].value, '—');
  });

  it('renders badges as names until every one of them has an emoji', () => {
    const two = { ...ACCOUNT, badges: [{ name: 'partner' }, { name: 'donator' }] };
    const half = new Map([['partner', '1']]);
    const both = new Map([
      ['partner', '1'],
      ['donator', '2']
    ]);

    assert.match(accountEmbed(two, null, new Map()).description, /-# partner · donator/);
    assert.match(
      accountEmbed(two, null, half).description,
      /-# partner · donator/,
      'a half-mapped row would read as a mix of pictures and words'
    );
    assert.match(accountEmbed(two, null, both).description, /<:partner:1> <:donator:2>/);
  });

  it('carries the ban reason and the bot flag when they are set', () => {
    const embed = accountEmbed({ ...ACCOUNT, banned: 'TOS', bot: true }, null, new Map());

    assert.match(embed.description, /banned: TOS/);
    assert.match(embed.description, /flagged as a bot/);
  });
});

describe('the badge emoji map', () => {
  it('is keyed by the name the api sends, spaces and all', () => {
    assert.equal(BADGE_EMOJI.has('top donator'), true, 'the api sends a space, the file has _');
    assert.equal(BADGE_EMOJI.has('top_donator'), false);
  });

  it('carries an id for every badge, so a row never falls back for one missing entry', () => {
    for (const name of [
      'bot',
      'admin',
      'top donator',
      'donator',
      'booster',
      'staff',
      'partner',
      'affiliate'
    ]) {
      assert.match(BADGE_EMOJI.get(name) || '', /^\d{17,20}$/, `${name} has no emoji id`);
    }
  });
});
