import http from 'node:http';
import { listOrders } from './orders.js';

export const server = http.createServer(async (req, res) => {
  if (req.url === '/orders') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(await listOrders()));
  }
  res.writeHead(404).end();
});
