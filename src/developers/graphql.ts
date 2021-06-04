import { ApolloServer, makeExecutableSchema } from 'apollo-server-express';
import jsonwebtoken from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { ILoggedIn, TokenType } from 'src/auth/UserModel';
import { Application, ApplicationModel } from 'src/db/models/applicationModel';
import { ESMap } from 'typescript';
import devschema from './schema.gql';

const resolver = {
    Query: {
        allApplications: async (parent, {}, context) => {
            const found = await ApplicationModel.find({owner: context.auth.userId || "NOOWNER"})
            return found.map<any>((value) => ({...value.toJSON(), id: value.id}));
        },
        application: async (parent, {id}: {id: string}, context) => {
            const found = await ApplicationModel.findById(id);
            if (found.owner != context.auth.userId) return null;
            else return {...found.toJSON(), id: found.id};
        },
        applicationClientId: async (parent, {id}: {id: string}, context) => {
            const found = await ApplicationModel.findById(id);
            if (found.owner != context.auth.userId) return null;
            else if (found.client_id != "") return found.client_id;
            else {
                let x = "AQUA-"+randomBytes(36).toString("hex");
                found.client_id = x;
                await found.save();
                return x;
            }
        }
    },
    Mutation: {
        updateApplication: async (parent, {id, data}: {id: string, data: ESMap<any, any>}, context) => {
            var found = await ApplicationModel.findById(id);
            if (found.owner != context.auth.userId) return null;
            if (data['name']) found.set("name", data["name"]);
            if (data['avatar_url']) found.set("avatar_url", data["avatar_url"]);
            await found.save();
            return {...found.toJSON(), id: found.id};
        },
        newApplication: async (parent, data, context) => {
            const app = new ApplicationModel({
                owner: context.auth.userId,
                ...data
            } as Application);
            app.save();
            return {...app.toJSON(), id: app.id};
        },
        deleteApplication: async (parent, {id}, context) => {
            var found = await ApplicationModel.findById(id);
            if (found.owner != context.auth.userId) return false;
            await found.delete();
            return true;
        }
    }
}
const schema = makeExecutableSchema({
    typeDefs: devschema,
    resolvers: resolver,
    resolverValidationOptions: {
        requireResolversForResolveType: false,
    },
    allowUndefinedInResolve: true,
});

export const server = new ApolloServer({
    schema: schema,
    playground: false,
    introspection: true,
    tracing: false,
    engine: {
      debugPrintReports: true,
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
            return {
                auth: {
                    tokenType: TokenType.INVALID,
                    userId: "",
                    appId: ""
                } as ILoggedIn
            }
        }
        }
    }
});