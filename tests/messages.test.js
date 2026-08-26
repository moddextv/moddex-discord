import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { boostEmbed, welcomeEmbed } from '../src/messages.js';

const who = {
  displayName: 'lellol',
  username: 'lellol',
  avatarUrl: 'https://cdn.discordapp.com/avatars/1/a.png',
  userId: '1'
};

describe('welcomeEmbed', () => {
  it('puts the member in the author line, which is where discord renders a name white', () => {
    const embed = welcomeEmbed({ ...who, memberCount: 1284 });

    assert.equal(embed.author.name, 'lellol');
    assert.equal(embed.author.icon_url, who.avatarUrl);
    assert.equal(embed.author.url, 'https://discord.com/users/1');
  });

  it('renders the member number as subtext with a thousands separator', () => {
    const embed = welcomeEmbed({ ...who, memberCount: 1284 });

    assert.equal(embed.description, '**lellol** just joined the server!\n-# Member #1,284');
  });

  it('omits the subtext when the member count is unknown', () => {
    assert.equal(
      welcomeEmbed({ ...who, memberCount: 0 }).description,
      '**lellol** just joined the server!'
    );
  });

  /**
   * The handle, not the display name. The author line already carries the one a
   * person chose to show; the line underneath says who that actually is, which
   * is the part that survives a rename.
   */
  it('names the handle even when the display name is something else', () => {
    const embed = welcomeEmbed({
      ...who,
      displayName: 'Kyelin',
      username: 'kyelin',
      memberCount: 93
    });

    assert.equal(embed.author.name, 'Kyelin');
    assert.equal(embed.description, '**kyelin** just joined the server!\n-# Member #93');
  });

  /**
   * A description is markdown and a username may hold `_`, so `some_user_name`
   * would arrive with "user" in italics and the underscores eaten.
   */
  it('escapes a username, because a description is markdown and the author line is not', () => {
    const embed = welcomeEmbed({ ...who, username: 'some_user_name', memberCount: 0 });

    assert.equal(embed.description, '**some\\_user\\_name** just joined the server!');
    assert.doesNotMatch(embed.description, /[^\\]_/);
  });

  it('falls back to the bare sentence rather than naming nobody', () => {
    assert.equal(
      welcomeEmbed({ ...who, username: undefined, memberCount: 0 }).description,
      'just joined the server!'
    );
  });
});

describe('boostEmbed', () => {
  it('carries discord nitro pink so the bar matches the boost gem', () => {
    assert.equal(boostEmbed({ ...who, boostCount: 15, tier: 2 }).color, 0xff73fa);
  });

  it('names the server total and level as subtext', () => {
    const embed = boostEmbed({ ...who, boostCount: 15, tier: 2 });

    assert.equal(
      embed.description,
      '**lellol** just boosted the server!\n-# The server is now at 15 boosts, Level 2'
    );
  });

  it('says boost rather than boosts for a single one', () => {
    assert.match(boostEmbed({ ...who, boostCount: 1, tier: 0 }).description, /1 boost$/);
  });

  it('drops the subtext entirely when neither count nor tier is known', () => {
    assert.equal(
      boostEmbed({ ...who, boostCount: 0, tier: 0 }).description,
      '**lellol** just boosted the server!'
    );
  });

  it('leaves a display name alone, because an embed author line is not markdown', () => {
    assert.equal(
      boostEmbed({ ...who, displayName: '**not** _me_', boostCount: 0, tier: 0 }).author.name,
      '**not** _me_'
    );
  });
});
