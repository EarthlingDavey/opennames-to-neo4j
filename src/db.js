import neo4j from 'neo4j-driver';

const getSession = (connection) => {
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

const dbImport = async (session, productId, extractTarget) => {
  console.log('>>>>>> Start dbImport');
  console.log({ productId, extractTarget });
  return;
  try {
    const result = await session.run(
      `
      MATCH (product:OsProduct {
        id: $productId
      }) 
      RETURN product.version AS productVersion
      `,
      {
        productId,
      }
    );
    return result.records[0]?.get('productVersion');
  } catch (error) {
    console.log(error);
    return false;
  }
};

export { getSession, dbImport };
