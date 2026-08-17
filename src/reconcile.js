import { log } from './log.js';
import { syncBoosters } from './boosters.js';
import { syncBadgeRoles } from './badgeRoles.js';

export const isComplete = (fetched, expected) => expected > 0 && fetched >= expected;

export const reconcile = async (guild) => {
  const members = await guild.members.fetch();

  if (!isComplete(members.size, guild.memberCount)) {
    log.warn(
      `sync skipped: fetched ${members.size} of ${guild.memberCount} members, ` +
        'and a short list would revoke whoever is missing from it'
    );
    return null;
  }

  const boosters = await syncBoosters(guild, members);
  const badgeRoles = await syncBadgeRoles(guild, members);

  return { boosters, badgeRoles };
};
