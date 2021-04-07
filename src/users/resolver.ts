import { ILoggedIn } from "src/auth/UserModel";
import { User } from "src/db/models/userModel";

const userResolver = {
    Query: {
        getUser(_, args, { auth } : { auth: ILoggedIn }) {
            //user data is always public
            //TODO: deprecate this, since all that matters
            //for public users are their profile Flows
        }
    }
}
export default userResolver;