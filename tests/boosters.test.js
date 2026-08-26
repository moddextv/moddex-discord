import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { boostingIds, roleChanges, roleHolderIds, roleProblem } from '../src/boosters.js';
import { isComplete } from '../src/reconcile.js';

const members = (rows) =>
  new Map(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        premiumSince: row.boosting ? new Date(0) : null,
        roles: { cache: new Set(row.roles ?? []) }
      }
    ])
  );

describe('boostingIds', () => {
  it('keeps only the members carrying a premiumSince', () => {
    const all = members([
      { id: '1', boosting: true },
      { id: '2', boosting: false },
      { id: '3', boosting: true }
    ]);

    assert.deepEqual(boostingIds(all), ['1', '3']);
  });

  it('is empty rather than undefined when nobody boosts', () => {
    assert.deepEqual(boostingIds(members([{ id: '1', boosting: false }])), []);
  });
});

describe('roleHolderIds', () => {
  it('finds who already wears the role', () => {
    const all = members([
      { id: '1', roles: ['booster-role'] },
      { id: '2', roles: [] }
    ]);

    assert.deepEqual(roleHolderIds(all, 'booster-role'), ['1']);
  });
});

describe('roleChanges', () => {
  it('adds a new booster and removes one who stopped', () => {
    assert.deepEqual(roleChanges(['1', '2'], ['2', '3']), { add: ['1'], remove: ['3'] });
  });

  it('does nothing when the two sides already agree', () => {
    assert.deepEqual(roleChanges(['1', '2'], ['2', '1']), { add: [], remove: [] });
  });

  it('removes every holder when nobody boosts any more', () => {
    assert.deepEqual(roleChanges([], ['1', '2']), { add: [], remove: ['1', '2'] });
  });
});

describe('isComplete', () => {
  it('accepts a fetch that reached everybody', () => {
    assert.equal(isComplete(93, 93), true);
  });

  it('rejects a short fetch, which is what a missing members intent looks like', () => {
    assert.equal(isComplete(1, 93), false);
  });

  it('rejects a guild that claims no members at all rather than dividing by nothing', () => {
    assert.equal(isComplete(0, 0), false);
  });

  it('accepts a fetch that overshoots, because memberCount lags a join', () => {
    assert.equal(isComplete(94, 93), true);
  });
});

describe('roleProblem', () => {
  const ok = { id: '1', managed: false, position: 3 };

  it('passes a plain role below the bot', () => {
    assert.equal(roleProblem(ok, 9), null);
  });

  it('names a role that does not exist', () => {
    assert.match(roleProblem(null, 9), /does not exist/);
  });

  it('refuses a discord-managed role, which nobody can assign', () => {
    assert.match(roleProblem({ ...ok, managed: true }, 9), /managed by discord/);
  });

  it('refuses a role at the bot own height, not only above it', () => {
    assert.match(roleProblem({ ...ok, position: 9 }, 9), /hierarchy/);
    assert.match(roleProblem({ ...ok, position: 10 }, 9), /hierarchy/);
  });
});
