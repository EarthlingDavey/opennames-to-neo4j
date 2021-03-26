import neo4j from 'neo4j-driver';
import ngrok from 'ngrok';
import { initApi } from './api.js';
import { initFileServer } from './fileServer.js';
import { customFunctions } from './customFunctions.js';

/**
 * Why import it from the relative path like this?
 * Because local development changes to these files are saved here.
 * Importing without `../` will get the files from the node_modules folder.
 */

// import on2n4j from '../opennames-to-neo4j/src/index.js';
import { on2n4j } from '../opennames-to-neo4j/dist/index.js';

/*
 * Create a Neo4j driver instance to connect to the database
 * using credentials specified as environment variables
 * with fallback to defaults
 */

const connectionStrings = {
  uri: process.env.NEO4J_URI || 'bolt+ssc://neo4j:7687',
  user: process.env.NEO4J_USER || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'pass',
};

const driver = neo4j.driver(
  connectionStrings.uri,
  neo4j.auth.basic(connectionStrings.user, connectionStrings.password)
);

/**
 * Starts a server so that the imported data can be
 * queried via a GraphQL API.
 * Visit http://localhost:3003/ for the playground
 * and try the query:
 * ```
 * query {
 *   Place {
 *     id
 *     name
 *   }
 * }
 * ```
 */
// initApi(driver);

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
  // includeFiles: ['TR04.csv'],
  /**
   * These custom functions allow for extension of the packages default behaviour.
   * i.e. They can be used to add custom properties to the neo4j imported nodes.
   */
  functions: customFunctions,
  /**
   * The folder where this app will write processed csv files.
   * If neo4j db is on the same storage volume then use a folder that it can read.
   */
  neo4jImportDir: '/tmp/shared',
  /**
   * If the neo4j connection is remote, and not sharing a storage volume
   * Then you can set the folder to one that is network accessible.
   * Also include the url endpoint that neo4j will use to reach this folder.
   */
  // neo4jImportDir: '/app/public',
  // neo4jImportUrl: 'http://app:3000/public',
  /**
   * In case this app is running locally, and your database is remote.
   * e.g. https://sandbox.neo4j.com/
   * Then set neo4jImportDir to '/app/public' & useNgrok to true.
   * ngrok will create a tunnel so neo4j can reach this local app's server.
   */
  // neo4jImportDir: '/app/public',
  // useNgrok: true,
  /**
   * A pause in seconds between each loop.
   * Useful to prevent from relentlessly hogging resources.
   */
  waits: {
    process: 1,
    import: 10,
    clean: 1,
  },
};

(async function () {
  /**
   * Start an express server in case we need to serve csv files.
   */
  if (options.neo4jImportUrl || options.useNgrok) {
    try {
      await initFileServer();
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Get an ngrok url to allow a remote database to access
   * a locally running app.
   */
  if (options.useNgrok) {
    try {
      const url = await ngrok.connect(3000);
      options.neo4jImportUrl = `${url}/public`;
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * This function includes the steps to get
   * data from OS OpenNames API to neo4j database.
   */
  try {
    const result = await on2n4j({ driver }, options);
    if (result) console.log(result);
  } catch (error) {
    console.error(error);
  }

  if (options.useNgrok) {
    await ngrok.disconnect();
  }
})();
