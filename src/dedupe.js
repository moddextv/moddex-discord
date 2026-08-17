import { config } from './config.js';

const seen = new Map();

export const claim = (key, now = Date.now()) => {
  const ttl = config.dedupeSeconds * 1000;

  for (const [known, at] of seen) {
    if (now - at > ttl) {
      seen.delete(known);
    }
  }

  if (seen.has(key)) {
    return false;
  }

  seen.set(key, now);

  return true;
};

export const forget = () => seen.clear();

export const size = () => seen.size;
