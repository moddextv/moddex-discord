import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { boostMessage, welcomeMessage } from '../src/messages.js';

describe('welcomeMessage', () => {
  it('mentions the member so the line is clickable', () => {
    const message = welcomeMessage({ userId: '123', memberCount: 1284 });

    assert.match(message, /<@123>/);
    assert.match(message, /just joined the server!/);
  });

  it('renders the member number as subtext with a thousands separator', () => {
    assert.match(welcomeMessage({ userId: '1', memberCount: 1284 }), /^-# Member #1,284$/m);
  });

  it('omits the subtext when the member count is unknown', () => {
    assert.equal(welcomeMessage({ userId: '1', memberCount: 0 }).includes('-#'), false);
  });
});

describe('boostMessage', () => {
  it('reads like the system message it replaces', () => {
    const message = boostMessage({ displayName: 'lellol', boostCount: 15, tier: 2 });

    assert.match(message, /\*\*lellol\*\* just boosted the server!/);
    assert.match(message, /^-# The server is now at 15 boosts — Level 2$/m);
  });

  it('says boost rather than boosts for a single one', () => {
    assert.match(boostMessage({ displayName: 'a', boostCount: 1, tier: 0 }), /1 boost$/m);
  });

  it('drops the subtext entirely when neither count nor tier is known', () => {
    assert.equal(boostMessage({ displayName: 'a', boostCount: 0, tier: 0 }).includes('-#'), false);
  });

  it('escapes markdown in a display name so it cannot forge the line', () => {
    const message = boostMessage({ displayName: '**not** _me_', boostCount: 0, tier: 0 });

    assert.equal(message.includes('**not**'), false);
    assert.match(message, /\\\*\\\*not\\\*\\\*/);
  });
});
