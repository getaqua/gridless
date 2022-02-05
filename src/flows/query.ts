import { Flow, FlowMember, Prisma, PrismaPromise } from "src/db/prisma/client";
import { getEffectivePermissions } from "./permissions";
import { db } from "../server";
import { getFlowMember } from "src/db/types";

/** Used for easily turning Flows into query responses everywhere.
 * Check permissions and existence first. */
export async function flowToQuery(flow: Flow, userflow?: Flow | FlowMember): Promise<any> {
  return {
    ...flow
  }
}