import { Flow, FlowMember, MembershipState, Prisma, PrismaPromise } from "@prisma/client";
import { ApolloError, UserInputError } from "apollo-server-core";
import debug from "debug";
import { ExtSnowflakeGenerator } from "extended-snowflake";
//import { scopeCheck } from "src/auth/attachments";
import { checkScope } from "src/auth/permissions";
import { isValidUsername } from "src/auth/signup";
import { CustomScope, ILoggedIn, Scopes, TokenType } from "src/auth/types"
import { mapContent } from "src/content/map";
import { flowById, getFlow, getFlowMember } from "src/db/types";
//import { Content, ContentModel } from "src/db/models/contentModel";
//import { Flow, FlowModel, getFlow } from "src/db/models/flowModel";
//import { getUserFlow, getUserFlowId, User, UserModel } from "src/db/models/userModel";
import { IContext } from "src/global";
import { OutOfScopeError, PermissionDeniedError } from "src/handling/graphql";
import { db } from "src/server";
import { FlowPermissions, getEffectivePermissions, permsOf, verifyPermissionValues } from "./permissions";
import { flowPresets } from "./presets";
import { flowToQuery } from "./query";

const log = debug("gridless:flow:resolver");

const esg = new ExtSnowflakeGenerator(0);

const flowResolver = {
    Query: {
        getFlow: async function (_, {id}: { id: string }, {auth, userflow}: IContext) {
            var flow = await db.flow.findFirst({where: flowById(id), /*include: {parent: true},*/ rejectOnNotFound: false});
            var usermember = await getFlowMember(userflow, flow);
            if (!(checkScope(auth, Scopes.FlowViewPrivate) || (permsOf(flow).public.view != "deny"))) throw new OutOfScopeError("getFlow", Scopes.FlowViewPrivate);
            if (!flow) return null;
            //await flow.populate("parent");
            //const userflow = (await (await UserModel.findById(auth.userId)).flow);
            const perms = (await getEffectivePermissions(flow, usermember));
            if (!(usermember.state == MembershipState.JOINED || permsOf(flow).public.view != "deny") 
            && perms.view == "allow") return null;
            //return {...flow.toObject(), is_joined: flow.members.includes(userflow._id), following: [], id: flow.id};
            return flowToQuery(flow, userflow);
        },
        getFollowedFlows: async function (_, data, {auth, userflow}: IContext) {
            //const flow = await getUserFlow(auth.userId);
            //await userflow.populate("following");
            const _following = await db.flow.findUnique({where: {snowflake: userflow.snowflake}, select: {following: true}}).following()
            //return flow.following.map((v: Flow, i,a) => ({...v.toObject(), id: v.id}));
            return _following.map((v: Flow, i,a) => flowToQuery(v, userflow));
        },
        getJoinedFlows: async function (_, data, {auth, userflow}: IContext) {
            //const flow = await getUserFlow(auth.userId);
            var flows = await db.flow.findMany({
                where: {
                    members: {
                        some: {
                            state: MembershipState.JOINED,
                            memberId: userflow.snowflake
                        }
                    }
                }
            });
            //return flows.map((v: Flow, i,a) => ({...v.toObject(), id: v.id}));
            return flows.map((v: Flow, i,a) => flowToQuery(v, userflow));
        }
    },
    Flow: {
        members: async function ({snowflake}: Partial<Flow>, {limit}: { limit?: number }, {auth, userflow}: IContext) {
            //var flow = await FlowModel.findById(_id).populate("members");
            if (Math.abs(limit) != limit) limit = 0;
            //return flow.members.slice(limit > 0 ? -(limit) : 0)
            return (await db.flow.findUnique({where: {snowflake}, select: {members: true}})
            .members({take: limit ?? 100, select: {member: true}}))
            .map((v,i,a) => flowToQuery(v.member, userflow));
            // TODO: set up this to return the FlowMember object
        },
        content: async function (flow: Partial<Flow>, {limit = 100}: { limit?: number }, {auth, userflow}: IContext) {
            if (!(checkScope(auth, Scopes.FlowViewPrivate) || permsOf(flow as Flow).public.view == "allow")) return null;
            if (!(checkScope(auth, Scopes.FlowReadPrivate) || 
                (permsOf(flow as Flow).public.read == "allow" && checkScope(auth, Scopes.FlowReadPublic)))) return null;
            if (!flow) return null;
            if ((await getEffectivePermissions(userflow, flow as any)).read != "allow") throw new PermissionDeniedError("getFlow.content", "read");
            return (await db.content.findMany({
                where: {inFlowId: flow.snowflake}, 
                take: limit,
                orderBy: {timestamp: "desc"},
                include: {inFlow: true, attachments: true}
            }))
            .map<any>((c) => mapContent(c, userflow));
        },
        effective_permissions: async function (flow: Partial<Flow>, _, {auth, userflow}: IContext) {
            //if (!flow) return null;
            return await getEffectivePermissions(userflow, flow as any);
        },
        is_following: async function (flow: Partial<Flow>, _, {auth, userflow}: IContext) {
            // TODO: check scopes and/or permissions
            return await db.flow.count({where: {AND: [
                flowById(flow.snowflake),
                {followedBy: {some: {snowflake: userflow.snowflake}}}
            ]}}) > 0;
        },
    },
    Mutation: {
        createFlow: async function (_, {flow, ownerId}: { flow: Partial<Flow> & { preset: string }, ownerId?: string }, {auth, userflow}: IContext) {
            if (!checkScope(auth, Scopes.FlowNew)) throw new OutOfScopeError("createFlow", Scopes.FlowNew);
            const _uvalid = await isValidUsername(flow.id);
            if (_uvalid != "SUCCESS") throw new UserInputError(
                _uvalid == "USERNAME_TAKEN" ? "This ID is not available."
                : _uvalid == "INVALID_USERNAME" ? "The ID is invalid."
                : "Unknown error processing ID.", 
                {"id_code": _uvalid}
            );
            // if all checks pass...
            log("Creating new Flow.");
            var parent: Flow;
            if (ownerId) {
                try {
                    parent = await db.flow.findFirst({where: flowById(ownerId)})
                    //parent = await getFlow(ownerId);
                    if ((await getEffectivePermissions(parent, await getFlowMember(userflow, parent))).update != "allow") throw new PermissionDeniedError("createFlow", "update");
                } catch(e) {
                    throw new UserInputError("The Flow you specified was not found.");
                }
            } else {
                //var _user = await UserModel.findById(auth.userId);
                parent = userflow;
            }
            //var owner = parent.snowflake;
            var doc: Prisma.FlowCreateArgs = {
                data: {
                    ...flowPresets[flow.preset],
                    ...flow,
                    members: {
                        create: {
                            member: userflow,
                            owner: true,
                            state: MembershipState.JOINED
                        }
                    },
                    parent: parent, owner: parent.owner,
                    //members: [userflow],
                    id: "//"+flow.id,
                    snowflake: esg.next(),
                    alternative_ids: ["//"+flow.id]
                }
            };
            //return {...await (await FlowModel.create(doc)).toJSON(), id: doc.id};
            var newFlow = await db.flow.create(doc);//FlowModel.create(doc);
            //newFlow = await newFlow.populate("owner");
            return flowToQuery(newFlow, userflow);
        },
        updateFlow: async function (_, {id, data}: { id: string, data: Partial<Flow> }, {auth, userflow}: IContext) {
            if (!checkScope(auth, Scopes.FlowUpdate)) throw new OutOfScopeError("updateFlow", Scopes.FlowUpdate);
            //const flow = await getFlow(id);
            const flow = await db.flow.findFirst({where: flowById(id)});
            const effectivePermissions = await getEffectivePermissions(flow, await getFlowMember(userflow, flow));
            if (effectivePermissions.update == "deny") return null;
            if (data.publicPermissions) verifyPermissionValues(data.publicPermissions as any, "public_permissions");
            if (data.joinedPermissions) verifyPermissionValues(data.joinedPermissions as any, "joined_permissions");
            //await flow.updateOne({$set: data});
            const newFlow = db.flow.updateMany({where: flowById(id), data});
            /* , $unset: Array.from(data as unknown as any).filter(([key, value]) => (value == "")) */
            return flowToQuery(newFlow[0], userflow);
        },
        joinFlow: async function (_, {id, inviteCode}: { id: string, inviteCode: string }, {auth, userflow}: IContext) {
            if (!checkScope(auth, Scopes.FlowJoin)) throw new OutOfScopeError("joinFlow", Scopes.FlowJoin);
            var flow = await db.flow.findFirst({where: flowById(id)});
            var member = (await getFlowMember(userflow, flow));
            if (member.state == MembershipState.JOINED) return null;
            var effectivePermissions = await getEffectivePermissions(flow, member);
            if (effectivePermissions.join != "allow") return null;
            //TODO: add support for join requests
            // if all checks pass...
            //flow.members.push(ufid as any);
            var newmember = await db.flowMember.upsert({
                where: {flowId_memberId: {flowId: flow.snowflake, memberId: userflow.snowflake}},
                create: {
                    ...member,
                    state: MembershipState.JOINED
                },
                update: {
                    state: MembershipState.JOINED
                }
            });
            //await flow.save();
            return flow;
        },
        deleteFlow: async function (_, {id}: { id: string }, {auth, userflow}: IContext) {
            if (!checkScope(auth, Scopes.FlowUpdate)) return false;
            var flow = await db.flow.findFirst({where: flowById(id)});
            if (!flow) return false;
            if ((flow.owner as any)._id != auth.userId) return false;
            //await flow.deleteOne();
            await db.flow.delete({where: {snowflake: flow.snowflake}});
            return true;
        },
        leaveFlow: async function (_, {id}: { id: string }, {auth, userflow}: IContext) {
            if (!checkScope(auth, Scopes.FlowJoin)) throw new OutOfScopeError("joinFlow", Scopes.FlowJoin);
            var flow = await db.flow.findFirst({where: flowById(id)});
            var member = (await getFlowMember(userflow, flow));
            if (member.state != MembershipState.JOINED) return false;
            // var effectivePermissions = await getEffectivePermissions(flow, member);
            // if (effectivePermissions.join != "allow") return null;
            //flow.members.splice(flow.members.indexOf(ufid), 1);
            //await flow.save();
            await db.flowMember.update({
                where: {flowId_memberId: {flowId: member.flowId, memberId: member.memberId}},
                data: {
                    state: MembershipState.LEFT
                },
            });
            return true;
        },
        followFlow: async function (_, {id}: { id: string }, {auth, userflow}: IContext) {
            if (!checkScope(auth, Scopes.FlowFollow)) return false;
            var flow = await db.flow.findFirst({where: flowById(id)});
            if (!flow) return false;
            if (await db.flow.count({where: {AND: [
                flowById(id),
                {followedBy: {some: {snowflake: userflow.snowflake}}}
            ]}}) > 0) return false;
            //await user.updateOne({$push: {following: flow._id}});
            await db.flow.update({
                where: {snowflake: userflow.snowflake},
                data: {
                    following: {
                        connect: {
                            snowflake: flow.snowflake
                        }
                    }
                }
            })
            return true;
        },
        unfollowFlow: async function (_, {id}: { id: string }, {auth, userflow}: IContext) {
            if (!checkScope(auth, Scopes.FlowFollow)) return false;
            var flow = await db.flow.findFirst({where: flowById(id)});
            if (!flow) return false;
            if (await db.flow.count({where: {AND: [
                flowById(id),
                {followedBy: {some: {snowflake: userflow.snowflake}}}
            ]}}) == 0) return false;
            //if (following.following.includes(flow)) return false;
            //await user.updateOne({$push: {following: flow._id}});
            await db.flow.update({
                where: {snowflake: userflow.snowflake},
                data: {
                    following: {
                        disconnect: {
                            snowflake: flow.snowflake
                        }
                    }
                }
            })
            return true;
        }
    }
}

export default flowResolver;