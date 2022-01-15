import { ApolloError } from "apollo-server-express";
import { Scopes } from "src/auth/UserModel";

/** The application is missing the scope 
 * required for a feature it tried to use. */
export class OutOfScopeError extends ApolloError {
  constructor(feature?: string, missing?: Scopes) {
    super(
      `"${feature}" is out of scope for your application.`+(missing ? ` Missing scope: ${missing}` : ""),
      "OUT_OF_SCOPE"
    );
  }
}
/** The user or application attempted to view
 * or modify something that the user does not
 * have access to, due to a missing _permission_. */
export class PermissionDeniedError extends ApolloError {
  constructor(feature?: string, missing?: string) {
    super(
      `Permission denied`+(feature ? ` for "${feature}"` : "")+(missing ? `: `+missing : ""),
      "PERMISSION_DENIED"
    );
  }
}