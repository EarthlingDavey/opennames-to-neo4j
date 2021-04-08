import Queue from 'bull';
import { getCredentials, getRedisUri } from './credentials.js';

import pkg from 'bull-board';
const { setQueues, BullAdapter } = pkg;

// import { syncOpenNames, processOpenNamesQueue } from './index';

async function initOpenNamesQueue(driver) {
  var openNamesQueue = new Queue('opennames to neo4j queue', getRedisUri(), {
    limiter: {
      max: 1,
      duration: 1000,
    },
  });

  openNamesQueue.on('ready', () => {
    console.log('ready!');
  });

  openNamesQueue.on('failed', (job, e) => {
    console.error('failed:', job.jobId, e);
  });

  // openNamesQueue.process(async function (job) {
  //   // try {
  //   //   await processOpenNamesQueue(job, driver, openNamesQueue);
  //   // } catch (e) {
  //   //   console.log(e);
  //   // }
  // });

  // openNamesQueue.resume();

  openNamesQueue.clean(0, 'delayed');
  openNamesQueue.clean(0, 'wait');
  openNamesQueue.clean(0, 'active');
  openNamesQueue.clean(0, 'completed');
  openNamesQueue.clean(0, 'paused');
  // openNamesQueue.clean(0, 'latest');
  openNamesQueue.clean(0, 'failed');

  let multi = openNamesQueue.multi();
  multi.del(openNamesQueue.toKey('repeat'));
  multi.exec();

  setQueues([new BullAdapter(openNamesQueue)]);

  return openNamesQueue;
}

export { initOpenNamesQueue };
