import { config, missingKeys } from './config.js';
import { log } from './log.js';
import { createHealthServer } from './health.js';
import { isReady, pingMs, start, stop } from './bot.js';

const missing = missingKeys();

if (missing.length) {
  log.error(`refusing to start, unset in .env: ${missing.join(', ')}`);
  process.exit(1);
}

const server = createHealthServer(() => ({ ready: isReady(), pingMs: pingMs() }));

server.listen(config.port, '0.0.0.0', () => {
  log.info(`moddex-discord listening on :${config.port}`);
});

start().catch((error) => {
  log.error('sign-in failed', error);
  process.exit(1);
});

const shutdown = async (signal) => {
  log.info(`${signal} — shutting down`);

  await stop().catch((error) => log.error('error closing the gateway', error));

  server.close(() => process.exit(0));

  setTimeout(() => {
    log.warn('shutdown timed out — exiting anyway');
    process.exit(1);
  }, 8_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
