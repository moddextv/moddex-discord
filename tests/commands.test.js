import { strict as assert } from 'node:assert';
import { afterEach, describe, it, mock } from 'node:test';

import { definitions, handle, suggest } from '../src/commands.js';
import { BADGE_EMOJI, accountEmbed, channelEmbed, unrenderableBadges } from '../src/messages.js';

const ACCOUNT = {
  id: '22484632',
  login: 'forsen',
  name: 'forsen',
  avatar: 'https://cdn/forsen.png',
  followers: 1784565,
  banned: null,
  bot: false,
  badges: [{ id: 7, name: 'partner' }]
};

const interaction = (commandName, values = 'forsen') => {
  const replies = [];
  const given = typeof values === 'string' ? { login: values } : values;

  return {
    replies,
    commandName,
    isChatInputCommand: () => true,
    options: { getString: (name) => given[name] },
    deferReply: async () => {},
    editReply: async (payload) => replies.push(payload)
  };
};

const typing = (focused) => {
  const answered = [];

  return {
    answered,
    options: { getFocused: () => focused },
    respond: async (choices) => answered.push(choices)
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

    assert.deepEqual(names, ['channel', 'roles', 'stats', 'user']);

    // `roles` reads one pair; the old bot's `role add` wrote one, and that is the one still gone
    for (const gone of ['abadge', 'rbadge', 'badges', 'role']) {
      assert.equal(names.includes(gone), false, `${gone} belongs on the website`);
    }
  });

  it('lets every login be completed, so a new one cannot arrive without it', () => {
    const options = definitions.flatMap((one) => one.options ?? []);

    assert.equal(options.length, 4);

    for (const option of options) {
      assert.equal(option.autocomplete, true, `${option.name} would be typed blind`);
      assert.equal(option.max_length, 25, 'a twitch login is at most 25 characters');
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
      '/v1/users/forsen': {
        ...ACCOUNT,
        roles: {
          mod: { count: 251, rank: 203, of: 4023901 },
          vip: { count: 30, rank: 12439, of: 4085984 },
          founder: { count: 2, rank: 598756, of: 3476497 }
        }
      }
    });

    const call = interaction('user');
    await handle(call);

    const [embed] = call.replies[0].embeds;
    assert.equal(embed.author.name, 'forsen', 'the id belongs in the footer, not the title');
    assert.match(embed.footer.text, /1,784,565 followers · 22484632/);
    assert.equal(embed.fields[0].value, '251\n-# #203');
  });

  it('answers a whole command in one request, not two', async () => {
    stubFetch({
      '/v1/users/forsen': { ...ACCOUNT, roles: { mod: { count: 251, rank: 203 } } }
    });

    await handle(interaction('user'));

    assert.equal(
      globalThis.fetch.mock.calls.length,
      1,
      'the account and its counts arrive together'
    );
  });

  it('never asks for a role list it would have to count itself', async () => {
    stubFetch({
      '/v1/channels/forsen': {
        ...ACCOUNT,
        granted: { mod: { count: 39 }, vip: { count: 3 }, founder: { count: 24 } }
      }
    });

    await handle(interaction('channel'));

    const asked = globalThis.fetch.mock.calls.map((one) => String(one.arguments[0]));
    const lists = asked.filter((url) => /\/(mods|vips|founders)(\?|$)/.test(url));

    assert.equal(lists.length, 0, 'nightbot has 590k rows; the counts come off the channel itself');
    assert.equal(asked.length, 1);
  });

  it('answers /roles for one pair, in one request', async () => {
    stubFetch({
      '/v1/users/snusbot/roles/forsen': {
        mod: { grantedAt: '2025-02-09T17:22:48.000Z' },
        vip: null,
        founder: null
      }
    });

    const call = interaction('roles', { account: 'snusbot', channel: 'forsen' });
    await handle(call);

    const [embed] = call.replies[0].embeds;

    assert.equal(globalThis.fetch.mock.calls.length, 1, 'the pair is one question');
    assert.match(embed.description, /\*\*snusbot\*\* holds a role in \*\*forsen\*\*/);
    assert.match(embed.fields[0].value, /^held\n-# <t:1739121768:D>$/);
    assert.equal(embed.fields[1].value, 'not held');
  });

  it('says so plainly when the pair shares nothing', async () => {
    stubFetch({
      '/v1/users/pajlada/roles/forsen': { mod: null, vip: null, founder: null }
    });

    const call = interaction('roles', { account: 'pajlada', channel: 'forsen' });
    await handle(call);

    assert.match(call.replies[0].embeds[0].description, /holds nothing in \*\*forsen\*\*/);
  });

  it('never says which half of a pair is missing, because one of them may be opted out', async () => {
    stubFetch({ '/v1/users/someone/roles/forsen': 404 });

    const call = interaction('roles', { account: 'someone', channel: 'forsen' });
    await handle(call);

    assert.match(call.replies[0], /Either \*\*someone\*\* or \*\*forsen\*\*/);
    assert.doesNotMatch(call.replies[0], /opted|ignored|private/i);
  });

  it('tells an opted-out account apart from nothing at all — it must not', async () => {
    stubFetch({ '/v1/users/someone': 404 });

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

describe('the login autocomplete', () => {
  it('asks nothing at all below three characters, which the api would refuse', async () => {
    stubFetch({ '/v1/search': { items: [] } });

    const call = typing('fo');
    await suggest(call);

    assert.equal(globalThis.fetch.mock.calls.length, 0);
    assert.deepEqual(call.answered[0], []);
  });

  // a display name that is only a case variant of the login says nothing the login does not
  it('offers the logins the api ranked, and submits the login rather than the label', async () => {
    stubFetch({
      '/v1/search': {
        items: [
          { login: 'forsen', name: 'forsen' },
          { login: 'forsenlol', name: 'ForsenLOL' },
          { login: 'forsen_jp', name: 'フォルセン' }
        ]
      }
    });

    const call = typing(' @for ');
    await suggest(call);

    assert.deepEqual(call.answered[0], [
      { name: 'forsen', value: 'forsen' },
      { name: 'forsenlol', value: 'forsenlol' },
      { name: 'フォルセン (forsen_jp)', value: 'forsen_jp' }
    ]);

    const [url] = globalThis.fetch.mock.calls[0].arguments;
    assert.match(String(url), /\/v1\/search\?q=for&limit=8$/, 'the @ and the spaces are ours');
  });

  it('offers nothing rather than an error when the api is slow or down', async () => {
    stubFetch({});

    const call = typing('forsen');
    await suggest(call);

    assert.deepEqual(call.answered[0], []);
  });

  it('waits less than discord does, or the answer arrives after the reply is dropped', async () => {
    stubFetch({ '/v1/search': { items: [] } });

    await suggest(typing('forsen'));

    const [, init] = globalThis.fetch.mock.calls[0].arguments;
    assert.ok(init.signal, 'the suggestion carries its own deadline');
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

  it('tells a zero apart from an answer the api did not give', () => {
    const embed = channelEmbed(ACCOUNT, { mod: { count: 39 }, founder: { count: 0 } });

    assert.equal(embed.fields[0].value, '39');
    assert.equal(embed.fields[1].value, '—', 'vip is absent, which is not the same as none');
    assert.equal(embed.fields[3].value, '0', 'founder answered zero, and zero is an answer');
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
    const embed = accountEmbed(
      { ...ACCOUNT, banned: { reason: 'TOS' }, bot: true },
      null,
      new Map()
    );

    assert.match(embed.description, /banned: TOS/);
    assert.match(embed.description, /flagged as a bot/);
  });
});

describe('the badge emoji map', () => {
  it('is keyed by the name the api sends, spaces and all', () => {
    assert.equal(BADGE_EMOJI.has('top donator'), true, 'the api sends a space, the file has _');
    assert.equal(BADGE_EMOJI.has('top_donator'), false);
  });

  it('holds a real snowflake for every name it does know', () => {
    for (const [name, id] of BADGE_EMOJI) {
      assert.match(id, /^\d{17,20}$/, `${name} has no emoji id`);
    }
  });

  /**
   * The list this used to check against was a third copy of a list the api owns,
   * so it agreed with the map and both were wrong: `translator` shipped on
   * 2026-08-26 and nothing here noticed. A test cannot ask production, so the
   * completeness check moved to boot; what is testable is the reporting.
   */
  // a badge that will never exist, so this stays a miss however many are added
  const ABSENT = 'no such badge';

  it('names every badge it cannot draw, and says nothing when it can draw them all', () => {
    const known = [...BADGE_EMOJI.keys()].map((name) => ({ name }));

    assert.deepEqual(unrenderableBadges(known), []);
    assert.deepEqual(unrenderableBadges([...known, { name: ABSENT }]), [ABSENT]);
    assert.deepEqual(unrenderableBadges([]), []);
    assert.deepEqual(unrenderableBadges(null), []);
  });

  it('reports the missing one even when the rest are fine, which is what costs the row', () => {
    const row = [{ name: 'admin' }, { name: ABSENT }, { name: 'donator' }];

    assert.deepEqual(unrenderableBadges(row), [ABSENT]);
    assert.match(
      accountEmbed({ ...ACCOUNT, badges: row }, null).description,
      /-# admin · no such badge · donator/,
      'one missing entry drops the whole row to plain text'
    );
  });

  it('can draw the translator, which is what this whole check was written for', () => {
    assert.deepEqual(unrenderableBadges([{ name: 'translator' }]), []);
    assert.match(
      accountEmbed({ ...ACCOUNT, badges: [{ name: 'translator' }] }, null).description,
      /^<:translator:\d{17,20}>/
    );
  });
});
