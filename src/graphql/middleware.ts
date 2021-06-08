import { ApolloServer } from 'apollo-server-express';
import { makeExecutableSchema } from 'apollo-server';
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';
import jsonwebtoken from 'jsonwebtoken';
import user from './schemas/user.graphql';
import rootSchema from './schemas/root.graphql';
import contentSchema from './schemas/content.graphql';
import errorSchema from './schemas/errors.graphql';
import userResolver from '../users/resolver';
import debug from 'debug';
import { ILoggedIn, TokenType } from '../auth/UserModel';

const log = debug("gridless:graphql");

const types = mergeTypeDefs([user, rootSchema, contentSchema, errorSchema]);
const resolvers = mergeResolvers([userResolver]);

const schema = makeExecutableSchema({
  typeDefs: types,
  resolvers: resolvers,
  resolverValidationOptions: {
    requireResolversForResolveType: false,
  },
  allowUndefinedInResolve: true,
});

export const server = new ApolloServer({
  schema: schema,
  playground: true,
  introspection: true,
  tracing: true,
  engine: {
    debugPrintReports: true,
  },
  //mockEntireSchema: true,
  //validationRules: [],
  
  context: ({ req }) => {
    const token = req.query['access_token'] || req.signedCookies['jwt'] || req.get("Authorization")?.replace("Bearer ", "")?.replace("Bot ", "");
    if (token) {
      try {
        const jwt: {
          uid: string
          aid: string | null
          bot: boolean
        } = jsonwebtoken.verify(token, globalThis.staticConfig.get("auth").get("secret")) as any;
        return {
          auth: {
            userId: jwt.uid,
            appId: jwt.aid,
            tokenType: jwt.aid ? 
              jwt.bot === true ? TokenType.BOTTOKEN
              : TokenType.APPTOKEN
            : req.cookies.jwt ? TokenType.COOKIE
            : TokenType.INVALID
          } as ILoggedIn,
        };
      } catch(e) {
        log(e);
        return {
          auth: {
            tokenType: TokenType.INVALID,
            userId: "",
            appId: ""
          } as ILoggedIn
        }
      }
    } else return {
      auth: {
        tokenType: TokenType.INVALID,
        userId: "",
        appId: ""
      } as ILoggedIn
    }
  },
});