import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { parseBadgeRoles } from '../src/badgeRoles.js';

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
