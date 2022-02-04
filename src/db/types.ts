import { Flow, FlowMember, Prisma } from 'src/db/prisma/client'
import { FlowPermissions } from 'src/flows/permissions'
import { db } from 'src/server'

const flowWithMemberCount = Prisma.validator<Prisma.FlowArgs>()({
  include: { _count: {select: {members: true}}},
})

export type FlowWithMemberCount = Prisma.FlowGetPayload<typeof flowWithMemberCount>

// declare type Flow = DBFlow & {
//   publicPermissions: Prisma.JsonObject & FlowPermissions
//   joinedPermissions: Prisma.JsonObject & FlowPermissions
// }
// declare type FlowMember = DBFlowMember & {
//   permissions: Prisma.JsonObject & FlowPermissions
// }

/** @deprecated Use `db.flow.findFirst({where: flowById(...)})` instead. */
export async function getFlow(id: string) {
  return db.flow.findFirst({
    where: {
      OR: [
        {snowflake: id},
        {id},
      ]
    }
  });
}
export const flowById = (id: string) => {
  return Prisma.validator<Prisma.FlowWhereInput>()({
    OR: [
      {snowflake: id},
      {id}
    ]
  })
}

/// Gets the basic FlowMember object, and returns a never-joined member object
export async function getFlowMember(member: Flow, flow: Flow): Promise<FlowMember> {
  return db.flowMember.findUnique({
    rejectOnNotFound: false,
    where: {flowId_memberId: {
      flowId: flow.snowflake,
      memberId: member.snowflake
    }}
  }) ?? Promise.resolve({
    flowId: flow.snowflake,
    flow: flow,
    memberId: member.snowflake,
    member: member,
    owner: false,
    permissions: {},
    state: null
  });
}