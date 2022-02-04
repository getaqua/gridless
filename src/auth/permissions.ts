import { CustomScope, ILoggedIn, Scopes, TokenType } from "./types";

export function checkScope(auth: ILoggedIn, scope: Scopes | CustomScope) {
    // Conditions in which a given scope is always granted.
    if (auth.tokenType == TokenType.COOKIE) return true;
    if (auth.tokenType == TokenType.APPTOKEN 
        && auth.scopes.includes(Scopes.Client)) return true;
    // Conditions in which a given scope is always denied.
    if (auth.tokenType == TokenType.INVALID) return false;
    // Check the given scope itself.
    if (auth.scopes.includes(scope)) return true;
    // If all checks fail...
    return false;
}