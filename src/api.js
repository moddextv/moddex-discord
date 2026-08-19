import { config } from './config.js';

const get = async (path) => {
  const response = await fetch(`${config.apiUrl}${path}`, {
    signal: AbortSignal.timeout(config.apiTimeoutMs),
    headers: config.internalToken ? { authorization: `Bearer ${config.internalToken}` } : {}
  });

  // a 404 may be an opt-out, and this bot must never say which
  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`moddex-api answered ${response.status} on ${path}`);
  }

  return response.json();
};

export const lookupAccount = async (login) => {
  const rows = await get(`/v1/users?login=${encodeURIComponent(login.toLowerCase())}`);

  return Array.isArray(rows) && rows.length ? rows[0] : null;
};

export const heldByAccount = (userId) => get(`/v1/users/${encodeURIComponent(userId)}/stats`);

// total rides on the first page, so nightbot's 590k rows are never fetched
const grantedTotal = async (role, channelId) => {
  const page = await get(`/v1/${role}?channel_id=${encodeURIComponent(channelId)}&limit=1`);

  return page && typeof page.total === 'number' ? page.total : null;
};

export const grantedByChannel = async (channelId) => {
  const [mod, vip, founder] = await Promise.all([
    grantedTotal('mods', channelId),
    grantedTotal('vips', channelId),
    grantedTotal('founders', channelId)
  ]);

  return { mod, vip, founder };
};

export const estateStats = () => get('/v1/stats');
