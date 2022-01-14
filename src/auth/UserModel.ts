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
    /** The client is allowed to read user data. */
    UserRead = "user.read",
    FlowNew = "flow.new",
    FlowList = "flow.list",
    FlowJoin = "flow.join",
    FlowFollow = "flow.follow",
    UserPost = "user.post",
    UserAddBot = "user.addbot",
    /** @deprecated */
    UserImpersonate = "user.impersonate",
    /** The client is allowed to upload files as attachments. */
    ContentAttachmentsUpload = "content.attachments.upload",
    FlowUpdate = "flow.update",
    FlowViewPrivate = "flow.view.private",
    FlowReadPublic = "flow.read.public",
    FlowReadPrivate = "flow.read.private",
    FlowContentPost = "flow.content.post",
    FlowContentManage = "flow.content.manage",
    /** The user is allowed all permissions inherently. */
    Client = "client"
}

export type CustomScope = string;
export const CustomScope = (scope: string) => scope as CustomScope;