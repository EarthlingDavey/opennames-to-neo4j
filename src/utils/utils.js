import neo4j from 'neo4j-driver';

const getNeo4jSession = (connection) => {
  if (connection.session) {
    return { session: connection.session, shouldCloseSession: false };
  }

  if (connection.driver) {
    return { session: connection.driver.session(), shouldCloseSession: true };
  }

  if (
    connection.strings?.uri &&
    connection.strings?.user &&
    connection.strings?.password
  ) {
    const { uri, user, password } = connection.strings;
    const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    return { session: driver.session(), shouldCloseSession: true };
  }

  console.error('no connection driver or credentials');
  return { session: undefined, shouldCloseSession: undefined };
};

const mergeByProperty = (target, source, prop) => {
  source.forEach((sourceElement) => {
    let targetElement = target.find((targetElement) => {
      return sourceElement[prop] === targetElement[prop];
    });
    targetElement
      ? Object.assign(targetElement, sourceElement)
      : target.push(sourceElement);
  });
};
export { getNeo4jSession, mergeByProperty };
