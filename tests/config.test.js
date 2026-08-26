import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { config, missingKeys } from '../src/config.js';

describe('missingKeys', () => {
  it('names every unset key rather than only the first', () => {
    assert.deepEqual(missingKeys({ token: '', guildId: '', announceChannelId: '' }), [
      'token',
      'guildId',
      'announceChannelId'
    ]);
  });

  it('is empty once the three are set', () => {
    assert.deepEqual(missingKeys({ token: 't', guildId: 'g', announceChannelId: 'c' }), []);
  });
});

describe('config', () => {
  it('defaults announcing to off so a first deploy is silent', () => {
    assert.equal(config.announce, false);
  });

  it('defaults to the port the compose file publishes', () => {
    assert.equal(config.port, 4003);
  });
});
