import dotenv from 'dotenv';
dotenv.config();

import neo4j from 'neo4j-driver';
import ngrok from 'ngrok';
import { initFileServer } from './fileServer.js';

/**
 * Why import it from the relative path like this?
 * Because local development changes to these files are saved here.
 * Importing without `../` will get the files from the node_modules folder.
 */

import on2n4j from '../../../src/index.js';
// import { on2n4j } from '../../../dist/index.js';

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
   * In case this ap is running locally, and your database is remote.
   * e.g. https://sandbox.neo4j.com/
   * Then set neo4jImportDir to '/app/public' & useNgrok to true.
   * ngrok will create a tunnel so neo4j can reach this local app's server.
   */
  neo4jImportDir: './public',
  useNgrok: true,
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
