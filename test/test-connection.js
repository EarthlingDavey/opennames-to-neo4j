import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';
import path from 'path';

const maybeOpenConnection = async (session, driver) => {
  const result = dotenv.config({
    path: path.resolve('./test', '.env'),
  });
  try {
    if (result.error) {
      throw result.error;
    }
    const { NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD } = result.parsed;
    driver = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD)
    );
    session = driver.session();
    // console.log('starting session');
  } catch (error) {
    session = undefined;
    console.log(error);
    console.log(
      '! Tests will be incomplete. Because database connected was not available.'
    );
  }
  return { session, driver };
};

const maybeCloseConnection = async (session, driver) => {
  if (session) {
    await session.close();
  } else {
    console.log(
      '! Tests will be incomplete. Because database connected was not available.'
    );
  }
  if (driver) {
    await driver.close();
  }
  return;
};

export { maybeOpenConnection, maybeCloseConnection };
