import { ApolloServer, AuthenticationError } from 'apollo-server-express';
//import { makeExecutableSchema } from 'apollo-server';
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';
import jsonwebtoken, { JsonWebTokenError } from 'jsonwebtoken';
import userSchema from './schemas/user.graphql';
import rootSchema from './schemas/root.graphql';
import contentSchema from './schemas/content.graphql';
import errorSchema from './schemas/errors.graphql';
import flowSchema from './schemas/flow.graphql';
import userResolver from '../users/resolver';
import debug from 'debug';
import { ILoggedIn, TokenType } from '../auth/UserModel';
import flowResolver from 'src/flows/resolver';
import systemResolver from './system';
import contentResolver from 'src/content/resolver';
import { GraphQLSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { ApolloServerPluginLandingPageLocalDefault } from 'apollo-server-core';

const log = debug("gridless:graphql");

const types = mergeTypeDefs([userSchema, flowSchema, rootSchema, contentSchema, errorSchema]);
const resolvers = mergeResolvers([userResolver, flowResolver, systemResolver, contentResolver]);

const schema = makeExecutableSchema({
  typeDefs: types,
  resolvers: resolvers,
  resolverValidationOptions: {
    //requireResolversForResolveType: false,
  },
});

export const server = new ApolloServer({
  schema: schema,
  //playground: true,
  introspection: true,
  //tracing: true,
  // engine: {
  //   debugPrintReports: true,
  // },
  //mockEntireSchema: true,
  //validationRules: [],
  apollo: {
    graphVariant: "app"
  },
  plugins: [
    ApolloServerPluginLandingPageLocalDefault({ footer: false })
  ],
  
  context: ({ req }) => {
    const token = req.query['access_token'] || req.signedCookies['jwt'] || req.get("Authorization")?.replace("Bearer ", "")?.replace("Bot ", "");
    if (token) {
      try {
        const jwt: {
          uid: string
          aid: string | null
          bot: boolean,
          scopes: string[]
        } = jsonwebtoken.verify(token, globalThis.staticConfig.get("auth").get("secret")) as any;
        return {
          auth: {
            userId: jwt.uid,
            appId: jwt.aid,
            tokenType: jwt.aid ? 
              jwt.bot === true ? TokenType.BOTTOKEN
              : TokenType.APPTOKEN
            : req.signedCookies['jwt'] == token ? TokenType.COOKIE
            : TokenType.INVALID,
            scopes: jwt.scopes
          } as ILoggedIn,
        };
      } catch(e) {
        log(e);
        throw new AuthenticationError('The token is invalid.');
      }
    } else throw new AuthenticationError('You must be logged in.');
  },
});