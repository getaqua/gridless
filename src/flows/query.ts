import { Flow, FlowMember, Prisma, PrismaPromise } from "src/db/prisma/client";
import { getEffectivePermissions } from "./permissions";
import { db } from "../server";
import { getFlowMember } from "src/db/types";

/** Used for easily turning Flows into query responses everywhere.
 * Check permissions and existence first. */
export async function flowToQuery(flow: Flow, userflow?: Flow | FlowMember): Promise<any> {
  const _following = db.flow.findUnique({
    where: {snowflake: flow.snowflake}, 
    select: {
      following: true,
    },
  });
  return {
    ...flow,
    //is_joined: userflow == null ? false : flow.members.includes(userflow.snowflake),
    is_joined: false, // TODO: re-add the above with the new members system
    following: userflow != null && (await getEffectivePermissions(flow, ("memberId" in userflow ? userflow : await getFlowMember(userflow, flow)))).update == "allow"
    ? (await _following.following()).map((v,i,a) => v.snowflake) : []
  }
}