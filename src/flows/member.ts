import debug from 'debug';
import { FlowMember } from 'src/db/prisma/client';
import { IContext } from 'src/global';
import { db } from 'src/server';
import { flowToQuery } from './query';
const log = debug("gridless:flowMember:resolver");

export const memberResolver = {
  FlowMember: {
    async member(member: Partial<FlowMember>, args, {auth, userflow}: IContext) {
      return flowToQuery(await db.flowMember.findUnique({
        where: {flowId_memberId: {
          flowId: member.flowId,
          memberId: member.memberId
        }},
        select: {
          member: true
        }
      }).member(), userflow);
    },
    async flow(member: Partial<FlowMember>, args, {auth, userflow}: IContext) {
      return flowToQuery(await db.flowMember.findUnique({
        where: {flowId_memberId: {
          flowId: member.flowId,
          memberId: member.memberId
        }},
        select: {
          flow: true
        }
      }).flow(), userflow);
    }
  }
}


export async function mapMember(member: FlowMember) {
  const memberFlow = await db.flow.findUnique({
    where: {snowflake: member.memberId},
    select: {
      name: true,
      avatarUrl: true,
      tagline: true,
      description: true
    }
  });
  return {
    ...member,
    name: /*member.nickname ??*/ memberFlow.name,
    avatarUrl: memberFlow.avatarUrl,
    tagline: memberFlow.tagline,
    description: memberFlow.description
  }
}