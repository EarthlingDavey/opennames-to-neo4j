let on2n4jQueue, server;
/**
 * Close server on restart or shutdown
 * Reference: https://stackoverflow.com/a/14032965/6671505
 */
process.stdin.resume();
async function exitHandler(options, exitCode) {
  debug('In exitHandler');
  let promises = [];
  // if (on2n4jQueue) promises.push(on2n4jQueue.close());
  if (server) promises.push(server.close());
  await Promise.all(promises);
  if (options.cleanup) console.log('clean');
  if (exitCode || exitCode === 0) debug(exitCode);
  if (options.exit) process.exit();
}
process.on('exit', exitHandler.bind(null, { cleanup: true }));
process.on('SIGINT', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));

import neo4j from 'neo4j-driver';
import { getCredentials } from './credentials.js';
import { initFileServer } from './fileServer.js';
import { initOpenNamesQueue } from './queue.js';

import on2n4j from '../../../src/index.js';
import { styledDebug as debug, mergeDeep } from '../../../src/utils/utils.js';

const connectionStrings = getCredentials();

const options = {
  batchSize: undefined,
  neo4jImportDir: './public',
  neo4jImportUrl: `http://app:3000/public`,
  waits: {
    process: 0,
    import: 0,
    clean: 0,
  },
};

(async function () {
  debug('>>>>>> Start microservice');

  /**
   * Start an express server to serve csv files.
   */
  try {
    server = await initFileServer();
  } catch (error) {
    throw error;
  }

  const driver = neo4j.driver(
    connectionStrings.uri,
    neo4j.auth.basic(connectionStrings.user, connectionStrings.password)
  );

  /**
   * Queue initialisation
   */

  on2n4jQueue = await initOpenNamesQueue(driver);

  on2n4jQueue.resume();

  /**
   * Step 1.
   * Get information to put into a queue.
   */

  const syncOpenNames = async (job = undefined) => {
    debug('>>>>>> Start syncOpenNames');

    let fetchResult;
    try {
      fetchResult = await on2n4j(
        { strings: connectionStrings },
        { ...options, actions: ['fetch'], functions: { debug: () => null } }
      );
    } catch (error) {
      throw error;
    }

    const toQueue = fetchResult.dataSources.filter((x) => !x.cleaned);

    if (!toQueue.length) {
      console.log('run post import script');
    }

    const percent = Math.floor(
      ((fetchResult.dataSources.length - toQueue.length) /
        fetchResult.dataSources.length) *
        100
    );

    if (job) job.progress(percent);

    const jobs = toQueue.map((x) => {
      return { data: x };
    });

    /**
     * Add the jobs to the queue
     */

    on2n4jQueue.addBulk(jobs);
    debug('<<<<<< End syncOpenNames');
  };

  /**
   * Queue processing
   */

  on2n4jQueue.process(async function (job, done) {
    debug('>>>>>> Start process queue');

    if ('syncOpenNames' === job.data.jobType) {
      syncOpenNames(job);
      debug('<<<<<< End process queue');
      return done();
    }

    if (job.data.cleaned) return done();

    const jobOptions = mergeDeep(options, {
      functions: {
        updateProgress: (number) => {
          job.progress(number);
        },
        debug: (...args) => {
          args.forEach(function (arg) {
            job.log(arg);
          });
        },
      },
    });

    let processResult;
    try {
      processResult = await on2n4j(
        { strings: connectionStrings },
        {
          ...jobOptions,
          includeFiles: [job.data.fileName],
          actions: ['process', 'import', 'cleanUp'],
        }
      );
      debug(processResult);
    } catch (error) {
      throw error;
    }

    debug('<<<<<< End process queue');

    done();
  });

  /**
   * when the jobs are complete, then run post import script
   */

  /**
   * Repeat sync every 6 hours
   */
  on2n4jQueue.add(
    { jobType: 'syncOpenNames' },
    {
      repeat: {
        every: 24 * 3600 * 1000,
        //  cron: '0 */6 * * *'
      },
    }
  );

  syncOpenNames();
})();
