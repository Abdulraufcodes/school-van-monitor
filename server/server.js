import 'dotenv/config';
import http from 'node:http';
import { app } from './src/app.js';
import { connectDatabase } from './src/config/db.js';
import { attachSocketServer } from './src/sockets/socketServer.js';

const port = Number(process.env.PORT || 5000);

async function start() {
  await connectDatabase();
  const httpServer = http.createServer(app);
  attachSocketServer(httpServer);
  httpServer.listen(port, () => {
    console.log(`School Van Monitor API listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
