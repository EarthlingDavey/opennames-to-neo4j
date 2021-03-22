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

/**
 * Performs a deep merge of objects and returns new object. Does not modify
 * objects (immutable) and merges arrays via concatenation.
 *
 * @param {...object} objects - Objects to merge
 * @returns {object} New object with merged key/values
 */
function mergeDeep(...objects) {
  const isObject = (obj) => obj && typeof obj === 'object';

  return objects.reduce((prev, obj) => {
    Object.keys(obj).forEach((key) => {
      const pVal = prev[key];
      const oVal = obj[key];

      if (Array.isArray(pVal) && Array.isArray(oVal)) {
        prev[key] = pVal.concat(...oVal);
      } else if (isObject(pVal) && isObject(oVal)) {
        prev[key] = mergeDeep(pVal, oVal);
      } else {
        prev[key] = oVal;
      }
    });

    return prev;
  }, {});
}

// Credit boss man https://github.com/wesbos/waait
const waitSeconds = (amount = 0) =>
  new Promise((resolve) => setTimeout(resolve, amount * 1000));

export { getNeo4jSession, mergeByProperty, mergeDeep, waitSeconds };