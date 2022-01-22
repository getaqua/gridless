import { ILoggedIn } from "src/auth/UserModel";
import { getUserFlow, UserModel } from "src/db/models/userModel";
import { getEffectivePermissions } from "src/flows/permissions";
import flowResolver from "src/flows/resolver";
import { IContext } from "src/global";

const userResolver = {
    Query: {
        async getMe(parent, args, context) {
            const user = await UserModel.findById(context.auth.userId);
            return {
                user,
                verifiedEmail: false, //TODO: verify emails
                username: user.username,
                tokenPermissions: context.auth.scopes
            }
        }
    },
    ThisUser: {
        flow(parent, args, context: IContext) {
            //var flow = await getUserFlow(auth.userId);
            //if (!flow) return null;
            //await flow.populate("parent");
            //if (!(flow.members.includes() || flow.public_permissions.view == "allow") 
            //&& (await getEffectivePermissions(await UserModel.findById(auth.userId), flow)).view == "allow") return null;
            //return {...userflow.toObject(), id: userflow.id};
            return flowResolver.Query.getFlow(parent, {id: context.userflow.snowflake.toString()}, context);
        }
    }
}
export default userResolver;