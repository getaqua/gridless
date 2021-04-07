export interface ILoggedIn {
    /** The type of token used. */
    tokenType: TokenType,
    /** The ID corresponding to the user. */
    userId: string,
    /** appId is NOT used when the `tokenType` is `TokenType.COOKIE`. */
    appId: string | undefined,
    // /** The scopes the user is allowed to use. */
    //scopes: Array<Scopes>
}

export enum TokenType {
    /** The user is accessing the service
     * in the browser. */
    COOKIE,
    /** The user is accessing the service
     * through a client application. */
    APPTOKEN,
    /** The user is a bot and is using
     * a bot token to access the service. */
    BOTTOKEN,
    /** The token does not match the requirements
     * for any other token type. */
    INVALID,
}

export enum Scopes {
    /** The user is allowed to read user data. */
    EMAIL = "email",
}