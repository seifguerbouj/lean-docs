import http from 'node:http';
import { listOrders } from './orders.js';
import { rateLimit } from './limits/rate.js';

export const server = http.createServer(async (req, res) => {
  if (!rateLimit(req, res)) return;
  if (req.url === '/orders') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(await listOrders()));
  }
  res.writeHead(404).end();
});
