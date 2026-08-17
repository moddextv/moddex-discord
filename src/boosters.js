import { config } from './config.js';
import { log } from './log.js';

export const boostingIds = (members) =>
  [...members.values()].filter((member) => member.premiumSince).map((member) => member.id);

export const roleHolderIds = (members, roleId) =>
  [...members.values()]
    .filter((member) => member.roles.cache.has(roleId))
    .map((member) => member.id);

export const roleChanges = (boosting, holders) => ({
  add: boosting.filter((id) => !holders.includes(id)),
  remove: holders.filter((id) => !boosting.includes(id))
});

export const roleProblem = (role, botHighestPosition) => {
  if (!role) return 'does not exist in this guild';
  if (role.managed) return 'is managed by discord and cannot be assigned by anyone';
  if (role.position >= botHighestPosition) return 'sits at or above the bot in the role hierarchy';

  return null;
};

const usableRole = async (guild, roleId) => {
  const role = await guild.roles.fetch(roleId).catch(() => null);
  const problem = roleProblem(role, (await guild.members.fetchMe()).roles.highest.position);

  if (problem) {
    log.error(`role ${roleId} ${problem}, so no role is assigned`);
    return null;
  }

  return role;
};

const syncRole = async (guild, members, boosting) => {
  if (!config.boosterRoleId) return { added: 0, removed: 0 };

  if (!(await usableRole(guild, config.boosterRoleId))) return { added: 0, removed: 0 };

  const { add, remove } = roleChanges(boosting, roleHolderIds(members, config.boosterRoleId));

  for (const id of add) {
    await members.get(id).roles.add(config.boosterRoleId);
  }

  for (const id of remove) {
    await members.get(id).roles.remove(config.boosterRoleId);
  }

  return { added: add.length, removed: remove.length };
};

export const isComplete = (fetched, expected) => expected > 0 && fetched >= expected;

const pushToApi = async (discordIds) => {
  if (!config.apiUrl || !config.internalToken) return null;

  const response = await fetch(`${config.apiUrl}/v1/boosters`, {
    method: 'PUT',
    signal: AbortSignal.timeout(config.apiTimeoutMs),
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.internalToken}`
    },
    body: JSON.stringify({ discordIds, allowEmpty: true })
  });

  if (!response.ok) {
    throw new Error(`moddex-api answered ${response.status}`);
  }

  return response.json();
};

export const sync = async (guild) => {
  const members = await guild.members.fetch();

  if (!isComplete(members.size, guild.memberCount)) {
    log.warn(
      `booster sync skipped: fetched ${members.size} of ${guild.memberCount} members, ` +
        'and a short list would revoke whoever is missing from it'
    );
    return null;
  }

  const boosting = boostingIds(members);

  const role = await syncRole(guild, members, boosting);
  const badges = await pushToApi(boosting);

  log.info(
    `boosters: ${boosting.length} boosting, role +${role.added} -${role.removed}, ` +
      (badges
        ? `badge +${badges.granted} -${badges.revoked} of ${badges.linked} linked`
        : 'badge sync not configured')
  );

  return { boosting: boosting.length, role, badges };
};
