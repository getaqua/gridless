import { ILoggedIn } from "./auth/UserModel";

declare global {
    namespace Express {
        export interface Request {
            /** The user, or null if there is none. */
            user?: ILoggedIn
        }
    }
}