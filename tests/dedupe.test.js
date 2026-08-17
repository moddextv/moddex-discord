import { strict as assert } from 'node:assert';
import { beforeEach, describe, it } from 'node:test';

import { config } from '../src/config.js';
import { claim, forget, size } from '../src/dedupe.js';

describe('claim', () => {
  beforeEach(forget);

  it('grants a key once', () => {
    assert.equal(claim('boost:1', 0), true);
    assert.equal(claim('boost:1', 0), false);
  });

  it('keeps the two boost sources from posting twice for one member', () => {
    assert.equal(claim('boost:1', 0), true);
    assert.equal(claim('boost:1', 900), false);
  });

  it('separates keys of different kinds for the same member', () => {
    assert.equal(claim('join:1', 0), true);
    assert.equal(claim('boost:1', 0), true);
  });

  it('grants the key again once the window has passed', () => {
    const window = config.dedupeSeconds * 1000;

    assert.equal(claim('join:1', 0), true);
    assert.equal(claim('join:1', window), false);
    assert.equal(claim('join:1', window + 1), true);
  });

  it('does not grow without bound', () => {
    const window = config.dedupeSeconds * 1000;

    for (let index = 0; index < 50; index += 1) {
      claim(`join:${index}`, 0);
    }

    assert.equal(size(), 50);

    claim('join:late', window + 1);

    assert.equal(size(), 1);
  });
});
