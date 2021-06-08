import { ILoggedIn } from "src/auth/UserModel";
import { UserModel } from "src/db/models/userModel";

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
    }
}
export default userResolver;