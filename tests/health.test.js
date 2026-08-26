import { strict as assert } from 'node:assert';
import { after, before, describe, it } from 'node:test';

import { createHealthServer } from '../src/health.js';

const state = { ready: true, pingMs: 42 };

let origin = '';
let server;

before(async () => {
  server = createHealthServer(() => state);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  origin = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

describe('/health', () => {
  it('answers the shape moddex-status asserts', async () => {
    state.ready = true;

    const response = await fetch(`${origin}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'moddex-discord');
    assert.equal(typeof body.uptimeSec, 'number');
    assert.deepEqual(body.discord, { ready: true, pingMs: 42 });
  });

  it('goes 503 while the gateway is not connected', async () => {
    state.ready = false;

    const response = await fetch(`${origin}/health`);
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(body.status, 'degraded');
    assert.equal(body.service, 'moddex-discord');
  });

  it('answers 404 and 405 in the api json shape', async () => {
    const missing = await fetch(`${origin}/nope`);
    const posted = await fetch(`${origin}/health`, { method: 'POST' });

    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { error: 'not found' });

    assert.equal(posted.status, 405);
    assert.deepEqual(await posted.json(), { error: 'method not allowed' });
  });
});
