import { createServer } from 'node:http';

const send = (res, code, obj) => {
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  res.end(JSON.stringify(obj));
};

export const healthBody = ({ ready, pingMs }) => ({
  status: ready ? 'ok' : 'degraded',
  service: 'moddex-discord',
  uptimeSec: Math.round(process.uptime()),
  discord: { ready, pingMs }
});

export const createHealthServer = (state) =>
  createServer((req, res) => {
    const { pathname } = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return send(res, 405, { error: 'method not allowed' });
    }

    if (pathname !== '/health') {
      return send(res, 404, { error: 'not found' });
    }

    const body = healthBody(state());

    return send(res, body.status === 'ok' ? 200 : 503, body);
  });
