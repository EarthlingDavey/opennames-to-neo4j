import express from 'express';
import { styledDebug as debug } from '../../../src/utils/utils.js';

const app = express();
const port = 3000;

const initFileServer = async () => {
  debug('>>>>>> Start fileServer');

  app.get('/', (req, res) => {
    res.send('Hello World!');
  });

  app.use('/public', express.static('public'));

  const server = app.listen(port, () => {
    debug(`Minimal example listening at: http://localhost:${port}`);
    debug(`Public folder at: http://localhost:${port}/public`);
  });

  return server;
};

const closeFileServer = async (server) => {
  debug('<<<<<< Close fileServer');
  server.close();
};

export { initFileServer, closeFileServer };
