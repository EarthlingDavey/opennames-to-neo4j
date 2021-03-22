/**
 * Why import it from the relative path like this?
 * So that any changes to these files are reflected here.
 * Importing without `../` will get the files from the node_modules folder.
 */

// import { helloFromOpennamesToNeo4j } from 'opennames-to-neo4j/src/index.js';
import opennamesToNeo4j from '../opennames-to-neo4j/src/index.js';

/*
 * Create a Neo4j driver instance to connect to the database
 * using credentials specified as environment variables
 * with fallback to defaults
 */

const connection = {
  strings: {
    uri: process.env.NEO4J_URI || 'bolt+ssc://neo4j:7687',
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'pass',
  },
};

const result = await opennamesToNeo4j(connection, {
  batchSize: 1,
  // includeFiles: ['TM46.csv'],
  // includeFiles: ['TR04.csv'],
  // includeFiles: ['TV68.csv', 'ST06.csv', 'NA80.csv', 'SN84.csv'],
  neo4jImportDir: '/tmp/import',
});

if (result) console.log({ result });
