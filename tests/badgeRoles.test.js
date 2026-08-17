import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { badgeRoleChanges, parseBadgeRoles } from '../src/badgeRoles.js';

describe('parseBadgeRoles', () => {
  it('reads one pair', () => {
    assert.deepEqual(parseBadgeRoles('donator:123'), [{ badge: 'donator', roleId: '123' }]);
  });

  it('keeps the spaces inside a badge name', () => {
    assert.deepEqual(parseBadgeRoles('top donator:456'), [{ badge: 'top donator', roleId: '456' }]);
  });

  it('reads several pairs and tolerates spacing around the commas', () => {
    assert.deepEqual(parseBadgeRoles('donator:123, top donator:456 , booster:789'), [
      { badge: 'donator', roleId: '123' },
      { badge: 'top donator', roleId: '456' },
      { badge: 'booster', roleId: '789' }
    ]);
  });

  it('is empty for an empty setting rather than throwing', () => {
    assert.deepEqual(parseBadgeRoles(''), []);
    assert.deepEqual(parseBadgeRoles('   '), []);
  });

  it('drops a pair missing its colon or either half', () => {
    assert.deepEqual(parseBadgeRoles('donator,top donator:456'), [
      { badge: 'top donator', roleId: '456' }
    ]);
    assert.deepEqual(parseBadgeRoles(':123'), []);
    assert.deepEqual(parseBadgeRoles('donator:'), []);
  });
});

describe('badgeRoleChanges', () => {
  const linked = new Set(['1', '2']);

  it('adds the role to a badge holder who lacks it', () => {
    assert.deepEqual(badgeRoleChanges(['1'], [], linked), { add: ['1'], remove: [] });
  });

  it('removes it from a linked member who no longer holds the badge', () => {
    assert.deepEqual(badgeRoleChanges([], ['2'], linked), { add: [], remove: ['2'] });
  });

  it('leaves an UNLINKED member alone, because no link is no answer', () => {
    assert.deepEqual(badgeRoleChanges([], ['99'], linked), { add: [], remove: [] });
  });

  it('does not touch a role somebody was given by hand before linking anything', () => {
    const { remove } = badgeRoleChanges([], ['1008859622033064007'], new Set());

    assert.deepEqual(remove, []);
  });

  it('still adds and removes in the same pass', () => {
    assert.deepEqual(badgeRoleChanges(['1'], ['2', '77'], linked), { add: ['1'], remove: ['2'] });
  });
});
