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
}

export const fallbackPublicFlowPermissions: FlowPermissions = {
  view: "allow",
  read: "allow",
  post: "deny",
  pin: "deny",
  join: "request",
  delete: "deny"
};
export const fallbackJoinedFlowPermissions: Omit<FlowPermissions, "join"> = {
  view: "allow",
  read: "allow",
  post: "allow",
  pin: "allow",
  delete: "deny"
};