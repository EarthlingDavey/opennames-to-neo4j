import neo4j from 'neo4j-driver';
import util from 'util';
import chalk from 'chalk';

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

  throw 'You must define session, driver or, connection strings';
};

const toNeo4jInteger = (field) => {
  const { toNumber, toString, inSafeRange } = neo4j.integer;

  if (neo4j.isInt(field)) {
    return inSafeRange(field) ? toNumber(field) : toString(field);
  }

  return field;
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
        prev[key] = [...new Set([...oVal, ...pVal])];
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

const styledMessage = (message) => {
  if (!global?.on2n4j) {
    global.on2n4j = {
      debug: { inset: 0 },
    };
  }

  let inset = global?.on2n4j?.debug?.inset || 0;

  if (typeof message !== 'string') {
    const a = util.inspect(message, {
      showHidden: false,
      depth: 10,
    });
    let newMessage = '';
    a.split('\n').forEach(function (line, index, arr) {
      if (index === arr.length - 1 && line === '') {
        return;
      }
      newMessage += index ? '\n' : '';
      newMessage += ' '.repeat(inset) + line;
    });
    return chalk.gray(newMessage);
  }

  let color = 'gray';
  if (message.startsWith('>>>>>>')) {
    global.on2n4j.debug.inset += 2;
    color = 'cyanBright';
  } else if (message.startsWith('<<<<<<')) {
    global.on2n4j.debug.inset -= 2;
    inset = global?.on2n4j.debug.inset;
    color = 'cyanBright';
  }

  message = ' '.repeat(inset) + message;

  let parts = message.split(': ');

  if (2 !== parts.length) return chalk[color](message);

  const extra = Math.max(0, 36 - parts[0].length);
  parts[1] = ' '.repeat(extra) + parts[1];

  return chalk.gray(parts.join(': '));
};

const styledDebug = (...args) => {
  args.forEach(function (arg) {
    const styled = styledMessage(arg);
    console.debug(styled);
  });
};

export {
  getNeo4jSession,
  toNeo4jInteger,
  mergeByProperty,
  mergeDeep,
  waitSeconds,
  styledMessage,
  styledDebug,
};
