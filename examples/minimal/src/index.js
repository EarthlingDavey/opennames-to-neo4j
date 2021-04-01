import ngrok from 'ngrok';
import { getCredentials } from './credentials.js';
import { initFileServer, closeFileServer } from './fileServer.js';
// Import with relative path for local development.
import on2n4j from '../../../src/index.js';
import { styledDebug as debug } from '../../../src/utils/utils.js';

let server;

/**
 * Disconnect ngrok and close server on restart or shutdown
 * Reference: https://stackoverflow.com/a/14032965/6671505
 */
process.stdin.resume();
async function exitHandler(options, exitCode) {
  debug('In exitHandler');
  await ngrok.disconnect();
  await server.close();
  if (options.cleanup) console.log('clean');
  if (exitCode || exitCode === 0) debug(exitCode);
  if (options.exit) process.exit();
}
process.on('exit', exitHandler.bind(null, { cleanup: true }));
process.on('SIGINT', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));

const connectionStrings = getCredentials();

const options = {
  /**
   * How many of the OpenName files do you want to process & import?
   * Optional. Leave empty for all files.
   */
  batchSize: 1,
  /**
   * Array of OpenName file names you want to process & import.
   * Optional. Leave empty for all files.
   */
  includeFiles: ['TR06.csv'],
  /**
   * In case this app is running locally, and your database is remote.
   * e.g. https://sandbox.neo4j.com/
   * Then set neo4jImportDir to '/app/public' & useNgrok to true.
   * ngrok will create a tunnel so neo4j can reach this local app's server.
   */
  neo4jImportDir: './public',
};

(async function () {
  /**
   * Start an express server in case we need to serve csv files.
   */
  try {
    server = await initFileServer();
  } catch (error) {
    console.error(error);
  }

  /**
   * Get an ngrok url to allow a remote database to access
   * a locally running app.
   */
  try {
    debug('>>>>>> Start ngrok');
    const url = await ngrok.connect(3000);
    debug(`Ngrok url: ${url}`);
    debug(`Test (disconnects after import): ${url}/public/test.txt`);
    options.neo4jImportUrl = `${url}/public`;
  } catch (error) {
    console.error(error);
  }

  /**
   * This function includes the steps to get
   * data from OS OpenNames API to neo4j database.
   */
  try {
    const result = await on2n4j({ strings: connectionStrings }, options);
    if (result) debug(result);
  } catch (error) {
    console.error(error);
  } finally {
    debug('<<<<<< Disconnect ngrok');
    await ngrok.disconnect();
    await closeFileServer(server);
  }
})();
