import neo4j from 'neo4j-driver';
import { initApi } from './api.js';
import { customFunctions } from './customFunctions.js';

/**
 * Why import it from the relative path like this?
 * Because local development changes to these files are saved here.
 * Importing without `../` will get the files from the node_modules folder.
 */

import opennamesToNeo4j from '../opennames-to-neo4j/src/index.js';

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
initApi(driver);

/**
 * This function includes the steps to get
 * data from OS OpenNames API to neo4j database.
 */
const result = await opennamesToNeo4j(
  { driver },
  {
    // batchSize: 1,
    // includeFiles: ['TR04.csv'],
    // includeFiles: ['TV68.csv', 'ST06.csv', 'NA80.csv', 'SN84.csv'],
    neo4jImportDir: '/tmp/import',
    functions: customFunctions,
  }
);

if (result) console.log(result);
