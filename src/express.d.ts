import { ILoggedIn } from "./auth/types";

declare global {
    namespace Express {
        export interface Request {
            /** The user, or null if there is none. */
            user?: ILoggedIn
        }
    }
}