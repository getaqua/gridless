import { Flow } from "src/db/models/flowModel";
import { getEffectivePermissions } from "./permissions";

/** Used for easily turning Flows into query responses everywhere.
 * Check permissions and existence first. */
export async function flowToQuery(flow: Flow, userflow?: Flow) {
  return {
    ...flow.toObject(),
    is_joined: userflow == null ? false : flow.members.includes(userflow._id),
    following: userflow != null && (await getEffectivePermissions(userflow, flow)).update == "allow" 
    ? flow.following : [],
    id: flow.id
  }
}