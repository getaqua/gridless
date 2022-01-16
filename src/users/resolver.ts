import { ILoggedIn } from "src/auth/UserModel";
import { getUserFlow, UserModel } from "src/db/models/userModel";
import { getEffectivePermissions } from "src/flows/permissions";

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
        async flow(parent, args, {auth}: {auth: ILoggedIn}) {
            var flow = await getUserFlow(auth.userId);
            if (!flow) return null;
            //await flow.populate("parent");
            //if (!(flow.members.includes() || flow.public_permissions.view == "allow") 
            //&& (await getEffectivePermissions(await UserModel.findById(auth.userId), flow)).view == "allow") return null;
            return {...flow.toObject(), id: flow.id};
        }
    }
}
export default userResolver;