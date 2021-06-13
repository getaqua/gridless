import { Flow } from "src/db/models/flowModel";
import { User } from "src/db/models/userModel";

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
}

export const fallbackPublicFlowPermissions: FlowPermissions = {
  view: "allow",
  read: "allow",
  post: "deny",
  pin: "deny",
  join: "request",
  delete: "deny",
  update: "deny"
};
export const fallbackJoinedFlowPermissions: Omit<FlowPermissions, "join"> = {
  view: "allow",
  read: "allow",
  post: "allow",
  pin: "allow",
  delete: "deny",
  update: "deny"
};
export const ownerOverriddenPermissions: Partial<FlowPermissions> = {
  delete: "allow",
  join: "allow",
  update: "allow"
}

export async function getEffectivePermissions(user: User, flow: Flow) : Promise<FlowPermissions> {
  const userflow = await user.flow;
  var is_joined = flow.members.includes(user._id);
  var is_owner = (flow.owner as any)._id.toHexString() == user._id.toHexString();
  var member_permissions = is_joined ? flow.member_permissions[userflow._id.toHexString()] : null;
  var defaults = is_joined ? flow.joined_permissions : flow.member_permissions;
  var fallback: FlowPermissions = is_joined ? (fallbackJoinedFlowPermissions && {join: "allow"} as FlowPermissions) : fallbackPublicFlowPermissions;
  return {
    ...fallback,
    ...defaults,
    ...member_permissions,
    ...(is_owner ? ownerOverriddenPermissions : {})
  }
}