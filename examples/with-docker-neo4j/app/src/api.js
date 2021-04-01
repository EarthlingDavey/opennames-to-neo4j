import { ApolloServer } from 'apollo-server';
import { makeAugmentedSchema } from 'neo4j-graphql-js';

const typeDefs = `
type Place {
    id: String
    name: String
}
`;
const schema = makeAugmentedSchema({ typeDefs });

const initApi = (driver) => {
  const server = new ApolloServer({ schema, context: { driver } });

  server.listen(3003, '0.0.0.0').then(({ url }) => {
    console.log(`GraphQL API ready at ${url}`);
  });
};

export { initApi };
