export interface ILoggedIn {
    /** The type of token used. */
    tokenType: TokenType,
    /** The ID corresponding to the user. */
    userId: string,
    /** appId is NOT used when the `tokenType` is `TokenType.COOKIE`. */
    appId: string | undefined,
    /** The scopes the user is allowed to use. */
    scopes: Array<Scopes | CustomScope>
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
    UserRead = "user.read",
    FlowNew = "flow.new",
    FlowList = "flow.list",
    UserPost = "user.post",
    UserAddBot = "user.addbot",
    UserImpersonate = "user.impersonate",
    FlowUpdate = "flow.update",
    FlowContentPost = "flow.content.post",
    FlowContentManage = "flow.content.manage",
    /** The user is allowed all permissions inherently. */
    Client = "client"
}

export type CustomScope = string;
export const CustomScope = (scope: string) => scope as CustomScope;

/*
{
    "user.read": {
        "name": "Use your email address and phone number",
        "icon": "mdi:account-lock"
    },
    "flow.new": {
        "name": "Create Flows on your behalf",
        "icon": "mdi:water-plus"
    },
    "flow.list": {
        "name": "Discover private Flows you have access to",
        "icon": "mdi:lock"
    },
    "user.post": {
        "name": "Post to your profile",
        "icon": "mdi:text-box",
        "danger": true
    },
    "user.addbot": {
        "name": "Link bots to your account",
        "icon": "mdi:robot"
    },
    "flow.%s.post": {
        "name": "Post to %s",
        "icon": "mdi:text-box"
    },
    "flow.%s.manage": {
        "name": "Change settings and delete %s",
        "icon": "mdi:delete",
        "danger": true
    },
    "flow.%s.addbot": {
        "name": "Link bots to %s",
        "icon": "mdi:robot"
    },
    "user.impersonate": {
        "name": "Post as you to your Profile and Flows",
        "icon": "mdi:comment-alert",
        "danger": true
    }
}
*/