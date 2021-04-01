import dotenv from 'dotenv';
import { styledDebug as debug } from '../opennames-to-neo4j/src/utils/utils.js';

const getCredentials = () => {
  /*
   * Database credentials specified as environment variables
   */
  if (
    process.env.NEO4J_URI &&
    process.env.NEO4J_USER &&
    process.env.NEO4J_PASSWORD
  ) {
    debug('neo4j credentials, using env variables');
    return {
      uri: process.env.NEO4J_URI,
      user: process.env.NEO4J_USER,
      password: process.env.NEO4J_PASSWORD,
    };
  }

  let result;
  try {
    result = dotenv.config();
  } catch (e) {
    debug(e);
  }
  if (
    result?.parsed?.NEO4J_URI &&
    result?.parsed?.NEO4J_USER &&
    result?.parsed?.NEO4J_PASSWORD
  ) {
    debug('neo4j credentials, using dotenv env variables');
    return {
      uri: result.parsed.NEO4J_URI,
      user: result.parsed.NEO4J_USER,
      password: result.parsed.NEO4J_PASSWORD,
    };
  }

  debug('neo4j credentials, using defaults values');
  return {
    uri: 'bolt://neo4j:7687',
    user: 'neo4j',
    password: 'pass',
  };
};

export { getCredentials };
