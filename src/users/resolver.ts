import { ILoggedIn } from "src/auth/UserModel";
import { getEffectivePermissions } from "src/flows/permissions";
import { flowToQuery } from "src/flows/query";
import flowResolver from "src/flows/resolver";
import { IContext } from "src/global";
import { db } from "src/server";

const userResolver = {
    Query: {
        async getMe(parent, args, context: IContext) {
            //const user = await UserModel.findById(context.auth.userId);
            const user = await db.user.findUnique({where: {snowflake: context.auth.userId}});
            return {
                user,
                verifiedEmail: false, //TODO: verify emails
                username: user.username,
                tokenPermissions: context.auth.scopes
            }
        }
    },
    ThisUser: {
        async flow(parent, args, context: IContext) {
            //var flow = await getUserFlow(auth.userId);
            //if (!flow) return null;
            //await flow.populate("parent");
            //if (!(flow.members.includes() || flow.public_permissions.view == "allow") 
            //&& (await getEffectivePermissions(await UserModel.findById(auth.userId), flow)).view == "allow") return null;
            //return {...userflow.toObject(), id: userflow.id};
            //return flowResolver.Query.getFlow(parent, {id: context.userflow.snowflake.toString()}, context);
            return flowToQuery(await db.flow.findFirst({
                where: {ownerUser: {snowflake: context.userflow.snowflake}}
            }));
        }
    }
}
export default userResolver;