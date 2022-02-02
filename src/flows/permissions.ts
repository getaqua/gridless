import { UserInputError } from "apollo-server-core";
import { Flow, FlowModel } from "src/db/models/flowModel";
import { User, UserModel } from "src/db/models/userModel";

type AllowDeny = "allow" | "deny" | null
export interface FlowPermissions {
  /** Whether a user can join the Flow. 
   * Only applicable for public_permissions. */
  join: "request" | AllowDeny
  /** Whether the user can post Content to this Flow. */
  post: AllowDeny
  /** Whether the user can read Content posted to this Flow. */
  read: AllowDeny
  /** Whether the user can see the profile information of this Flow,
   * such as:
   * * Name
   * * Profile picture
   * * Bio/about me
   * * Banner
   */
  view: AllowDeny
  /** Whether the user can delete Content posted to this Flow.
   * The owner inherently has this permission set to `allow`. */
  delete: AllowDeny
  /** Whether the user can pin Content in this Flow. */
  pin: AllowDeny
  /** Whether the user can change settings in this Flow.
   * The owner inherently has this permission set to `allow`. */
  update: AllowDeny
  /** Whether the user can post on behalf of the Flow.
   * An appropriate client scope is required to use this permission
   * when it is set to `allow`, but not if it is `force`. */
  anonymous: "force" | AllowDeny
}

export const fallbackPublicFlowPermissions: FlowPermissions = {
  view: "allow",
  read: "allow",
  post: "deny",
  pin: "deny",
  join: "request",
  delete: "deny",
  update: "deny",
  anonymous: "deny"
};
export const fallbackJoinedFlowPermissions: Omit<FlowPermissions, "join"> = {
  view: "allow",
  read: "allow",
  post: "allow",
  pin: "allow",
  delete: "deny",
  update: "deny",
  anonymous: "deny"
};
export const ownerOverriddenPermissions: Partial<FlowPermissions> = {
  delete: "allow",
  join: "allow",
  update: "allow"
}

export async function getEffectivePermissions(user: User | Flow, flow: Flow) : Promise<FlowPermissions> {
  const userflow = user instanceof FlowModel ? user : await (user as User).flow;
  const userId = user instanceof UserModel ? user._id : (userflow.owner as any)._id;
  // shouldn't have to do this vvv
  flow = await FlowModel.findOne({snowflake: flow.snowflake});
  var is_joined = flow.members.includes(userflow._id);
  var is_owner = (flow.owner as any)._id.toHexString() == userId.toHexString();
  var member_permissions = is_joined ? flow.member_permissions[userflow._id.toHexString()] : null;
  var defaults = (is_joined ? flow.joined_permissions : flow.public_permissions as any).toJSON();
  var fallback: FlowPermissions = is_joined ? ({...fallbackJoinedFlowPermissions, join: "allow"} as FlowPermissions) : fallbackPublicFlowPermissions;
  return {
    ...fallback,
    ...defaults,
    ...member_permissions,
    ...(is_owner ? ownerOverriddenPermissions : {})
  }
}

/** For responding to GraphQL queries that update permission values. */
export function verifyPermissionValues(permissions: Partial<FlowPermissions>, where?: string): void {
  const _where = where ? " in "+where : "";
  for (const key in permissions) {
    if (permissions[key] == "allow" || permissions[key] == "deny") continue;
    else if (key == "join" && permissions[key] != "request") 
      throw new UserInputError(`Permission "join"${_where} cannot have value ${permissions[key]}. Valid values are: allow, deny, request`);
    else if (key == "anonymous" && permissions[key] != "force") 
      throw new UserInputError(`Permission "anonymous"${_where} cannot have value ${permissions[key]}. Valid values are: allow, deny, force`);
    else throw new UserInputError(`Permission "${key}"${_where} cannot have value ${permissions[key]}. Valid values are: allow, deny`);
  }
}