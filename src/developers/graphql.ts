import { ApolloServer, AuthenticationError } from 'apollo-server-express';
import jsonwebtoken from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { ILoggedIn, TokenType } from 'src/auth/types';
import { ESMap } from 'typescript';
import devschema from './schema.gql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { db } from 'src/server';
import { ExtSnowflakeGenerator } from 'extended-snowflake';

const esg = new ExtSnowflakeGenerator(0);

const resolver = {
    Query: {
        allApplications: async (parent, {}, context) => {
            const found = await db.application.findMany({where: {owner: context.auth.userId || "NOOWNER"}})
            return found.map<any>((value) => ({...value, id: value.snowflake}));
        },
        application: async (parent, {id}: {id: string}, context) => {
            const found = await db.application.findUnique({where: {snowflake: id}});
            if (found.owner != context.auth.userId) return null;
            else return {...found, id: found.snowflake};
        },
        applicationClientId: async (parent, {id}: {id: string}, context) => {
            const found = await db.application.findUnique({where: {snowflake: id}, select: {owner: true, client_id: true}});
            if (found.owner != context.auth.userId) return null;
            else if (found.client_id != "") return found.client_id;
            else {
                let x = "AQUA-"+randomBytes(36).toString("hex");
                await db.application.update({
                    where: {snowflake: id},
                    data: {client_id: x}
                });
                return x;
            }
        }
    },
    Mutation: {
        updateApplication: async (parent, {id, data}: {id: string, data: ESMap<any, any>}, context) => {
            const found = await db.application.findUnique({where: {snowflake: id}, select: {owner: true}});
            if (found.owner != context.auth.userId) return null;
            var newappdata = {};
            if (data['name']) newappdata['name'] = data['name'];
            if (data['avatar_url']) newappdata['avatar_url'] = data['avatar_url'];
            if (data['redirect_uris']) newappdata['redirect_uris'] = data['redirect_uris'];
            var newapp = await db.application.update({
                where: {snowflake: id},
                data: newappdata
            });
            return {...newapp, id: newapp.snowflake};
        },
        newApplication: async (parent, data, context) => {
            // const app = new ApplicationModel({
            //     owner: context.auth.userId,
            //     ...data
            // } as Application);
            // app.save();
            const newapp = await db.application.create({
                data: {
                    snowflake: esg.next(),
                    owner: context.auth.userId,
                    client_id: "AQUA-"+randomBytes(36).toString("hex"),
                    ...data
                }
            });
            return {...newapp, id: newapp.snowflake};
        },
        deleteApplication: async (parent, {id}: {id: string}, context) => {
            const found = await db.application.findUnique({where: {snowflake: id}, select: {owner: true}});
            if (found.owner != context.auth.userId) return false;
            await db.application.delete({where: {snowflake: id}});
            return true;
        },
        resetApplicationClientId: async (parent, {id}: {id: string}, context) => {
            const found = await db.application.findUnique({where: {snowflake: id}, select: {owner: true}});
            if (found.owner != context.auth.userId) return null;
            else {
                let x = "AQUA-"+randomBytes(36).toString("hex");
                await db.application.update({
                    where: {snowflake: id},
                    data: {client_id: x}
                });
                return x;
            }
        }
    }
}
const schema = makeExecutableSchema({
    typeDefs: devschema,
    resolvers: resolver,
    // resolverValidationOptions: {
    //     requireResolversForResolveType: false,
    // },
    // allowUndefinedInResolve: true,
});

export const server = new ApolloServer({
    schema: schema,
    // playground: false,
    introspection: true,
    // tracing: false,
    // engine: {
    //   debugPrintReports: true,
    // },
    apollo: {
        graphVariant: "devpanel"
    },
    
    context: ({req}) => {
        const token = req.params['access_token'] || req.signedCookies['jwt'] || req.get("Authorization")?.replace("Bearer ", "")?.replace("Bot ", "");
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
            throw new AuthenticationError('You must be logged in.');
        }
        }
    }
});