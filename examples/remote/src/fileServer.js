import express from 'express';

const app = express();
const port = 3000;

const initFileServer = async () => {
  console.log('>>>>>> Start initFileServer');

  app.get('/', (req, res) => {
    res.send('Hello World!');
  });

  app.use('/public', express.static('public'));

  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
};

export { initFileServer };
