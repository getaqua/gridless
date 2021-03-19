import { ApolloServer } from 'apollo-server-express';
import { makeExecutableSchema } from 'apollo-server';
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';
import jsonwebtoken from 'jsonwebtoken';
import user from './schemas/user.graphql';
import userResolver from './resolvers/userResolver';

const types = mergeTypeDefs([user]);
const resolvers = mergeResolvers([userResolver]);

const schema = makeExecutableSchema({
  typeDefs: types,
  resolvers: resolvers,
});

export const server = new ApolloServer({
  schema: schema,
  playground: true,
  introspection: true,
  tracing: true,
  engine: {
    debugPrintReports: true,
  },
  
  context: ({ req }) => {
    const token = req.headers.authorization;
    if (token) {
      const jwt = jsonwebtoken.verify(token, process.env.JWT_SECRET);
      return {
        user: {
          id: jwt.uid,
        },
      };
    }
  },
});