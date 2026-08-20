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

// one call answers a whole command: the account and what it holds, with ranks
export const lookupAccount = (login) => get(`/v1/users/${encodeURIComponent(login.toLowerCase())}`);

export const lookupChannel = (login) =>
  get(`/v1/channels/${encodeURIComponent(login.toLowerCase())}`);

export const estateStats = () => get('/v1/stats');
