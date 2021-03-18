import neo4j from 'neo4j-driver';

/*
 * Create a Neo4j driver instance to connect to the database
 * using credentials specified as environment variables
 * with fallback to defaults
 */
const neo4jConnection = {
  // uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  // Why ssc (self signed certificate?). Because the LetsEncrypt certificate is valid for public domain name only.
  uri: process.env.NEO4J_URI || 'bolt+ssc://neo4j:7687',
  user: process.env.NEO4J_USER || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'pass',
};

// console.log(neo4jConnection);
const driver = neo4j.driver(
  neo4jConnection.uri,
  neo4j.auth.basic(neo4jConnection.user, neo4jConnection.password)
);

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

export { driver, dbImport };
