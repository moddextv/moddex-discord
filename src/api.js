import { config } from './config.js';

// discord discards an autocomplete answer after three seconds, so a suggestion waits less
const SUGGEST_TIMEOUT_MS = 2000;

const SUGGESTIONS = 8;

const get = async (path, timeoutMs = config.apiTimeoutMs) => {
  const response = await fetch(`${config.apiUrl}${path}`, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: config.internalToken ? { authorization: `Bearer ${config.internalToken}` } : {}
  });

  // a 404 may be an opt-out, and this bot must never say which
  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`moddex-api answered ${response.status} on ${path}`);
  }

  return response.json();
};

const name = (login) => encodeURIComponent(login.toLowerCase());

// one call answers a whole command: the account and what it holds, with ranks
export const lookupAccount = (login) => get(`/v1/users/${name(login)}`);

export const lookupChannel = (login) => get(`/v1/channels/${name(login)}`);

export const lookupRoles = (login, channel) =>
  get(`/v1/users/${name(login)}/roles/${name(channel)}`);

export const suggestAccounts = (prefix) =>
  get(`/v1/search?q=${encodeURIComponent(prefix)}&limit=${SUGGESTIONS}`, SUGGEST_TIMEOUT_MS);

export const estateStats = () => get('/v1/stats');

export const allBadges = () => get('/v1/badges');
