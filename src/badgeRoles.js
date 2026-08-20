import { config } from './config.js';
import { log } from './log.js';
import { roleHolderIds, roleProblem } from './boosters.js';

// badge names carry spaces but never a colon, so the last one separates the id
export const parseBadgeRoles = (value) =>
  value
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const at = pair.lastIndexOf(':');

      return at === -1
        ? null
        : { badge: pair.slice(0, at).trim(), roleId: pair.slice(at + 1).trim() };
    })
    .filter((entry) => entry && entry.badge && entry.roleId);

const fetchHolders = async () => {
  const response = await fetch(`${config.apiUrl}/v1/internal/badges/discord`, {
    signal: AbortSignal.timeout(config.apiTimeoutMs),
    headers: { authorization: `Bearer ${config.internalToken}` }
  });

  if (!response.ok) {
    throw new Error(`moddex-api answered ${response.status}`);
  }

  return response.json();
};

// a member with no linked account is no answer, not a no, so the sync may not revoke from them
export const badgeRoleChanges = (wanted, current, linked) => ({
  add: wanted.filter((id) => !current.includes(id)),
  remove: current.filter((id) => linked.has(id) && !wanted.includes(id))
});

export const syncBadgeRoles = async (guild, members) => {
  const mappings = parseBadgeRoles(config.badgeRoles);

  if (!mappings.length || !config.internalToken) return null;

  const { linkedIds, holders } = await fetchHolders();
  const linked = new Set(linkedIds);
  const botHighest = (await guild.members.fetchMe()).roles.highest.position;
  const summary = [];

  for (const { badge, roleId } of mappings) {
    const role = await guild.roles.fetch(roleId).catch(() => null);
    const problem = roleProblem(role, botHighest);

    if (problem) {
      log.error(`badge "${badge}": role ${roleId} ${problem}, skipped`);
      continue;
    }

    const wanted = (holders[badge] ?? []).filter((id) => members.has(id));
    const { add, remove } = badgeRoleChanges(wanted, roleHolderIds(members, roleId), linked);

    for (const id of add) {
      await members.get(id).roles.add(roleId);
    }

    for (const id of remove) {
      await members.get(id).roles.remove(roleId);
    }

    summary.push(`${badge} +${add.length} -${remove.length}`);
  }

  log.info(`badge roles: ${linked.size} linked, ${summary.join(', ') || 'nothing usable'}`);

  return { linked: linked.size, applied: summary.length };
};
