import { ApolloError, UserInputError } from "apollo-server-core";
import debug from "debug";
import { ExtSnowflakeGenerator } from "extended-snowflake";
import { Types } from "mongoose";
import { scopeCheck } from "src/auth/attachments";
import { checkScope } from "src/auth/permissions";
import { isValidUsername } from "src/auth/signup";
import { CustomScope, ILoggedIn, Scopes, TokenType } from "src/auth/UserModel"
import { mapContent } from "src/content/map";
import { Content, ContentModel } from "src/db/models/contentModel";
import { Flow, FlowModel, getFlow } from "src/db/models/flowModel"
import { getUserFlow, getUserFlowId, User, UserModel } from "src/db/models/userModel";
import { IContext } from "src/global";
import { OutOfScopeError, PermissionDeniedError } from "src/handling/graphql";
import { getEffectivePermissions, verifyPermissionValues } from "./permissions";
import { flowPresets } from "./presets";
import { flowToQuery } from "./query";

const log = debug("gridless:flow:resolver");

const esg = new ExtSnowflakeGenerator(0);

const flowResolver = {
    Query: {
        getFlow: async function (_, {id}: { id: string }, {auth, userflow}: IContext) {
            var flow = await getFlow(id);
            if (!(checkScope(auth, Scopes.FlowViewPrivate) || flow.public_permissions.view != "deny")) throw new OutOfScopeError("getFlow", Scopes.FlowViewPrivate);
            if (!flow) return null;
            await flow.populate("parent");
            //const userflow = (await (await UserModel.findById(auth.userId)).flow);
            const perms = (await getEffectivePermissions(await UserModel.findById(auth.userId), flow));
            if (!(flow.members.includes(userflow._id) || flow.public_permissions.view != "deny") 
            && perms.view == "allow") return null;
            //return {...flow.toObject(), is_joined: flow.members.includes(userflow._id), following: [], id: flow.id};
            return flowToQuery(flow, userflow);
        },
        getFollowedFlows: async function (_, data, {auth, userflow}: IContext) {
            //const flow = await getUserFlow(auth.userId);
            await userflow.populate("following");
            //return flow.following.map((v: Flow, i,a) => ({...v.toObject(), id: v.id}));
            return userflow.following.map((v: Flow, i,a) => flowToQuery(v, userflow));
        },
        getJoinedFlows: async function (_, data, {auth, userflow}: IContext) {
            //const flow = await getUserFlow(auth.userId);
            var flows = await FlowModel.find({"members": userflow._id});
            //return flows.map((v: Flow, i,a) => ({...v.toObject(), id: v.id}));
            return flows.map((v: Flow, i,a) => flowToQuery(v, userflow));
        }
    },
    Flow: {
        members: async function ({_id}: {_id: Types.ObjectId}, {limit}: { limit?: number }, {auth, userflow}: IContext) {
            var flow = await FlowModel.findById(_id).populate("members");
            if (Math.abs(limit) != limit) limit = 0;
            return flow.members.slice(limit > 0 ? -(limit) : 0)
            .map((v: Flow, i,a) => flowToQuery(v, userflow));
        },
        content: async function (flow: Partial<Flow>, {limit = 100}: { limit?: number }, {auth, userflow}: IContext) {
            if (!(checkScope(auth, Scopes.FlowViewPrivate) || flow.public_permissions.view == "allow")) return null;
            if (!(checkScope(auth, Scopes.FlowReadPrivate) || 
                (flow.public_permissions.read == "allow" && checkScope(auth, Scopes.FlowReadPublic)))) return null;
            if (!flow) return null;
            if ((await getEffectivePermissions(userflow, flow as any)).read != "allow") throw new PermissionDeniedError("getFlow.content", "read");
            return (await ContentModel.find({inFlow: new Types.ObjectId(flow._id)}).sort({timestamp: -1}).limit(limit))
            .map<any>((c) => mapContent(c, userflow));
        },
        effective_permissions: async function (flow: Partial<Flow>, _, {auth, userflow}: IContext) {
            //if (!flow) return null;
            return await getEffectivePermissions(userflow, flow as any);
        },
        is_following: async function (flow: Partial<Flow>, _, {auth, userflow}: IContext) {
            // TODO: check scopes and/or permissions
            return userflow.following.includes(flow._id);
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
                    parent = await getFlow(ownerId);
                    if ((await getEffectivePermissions(userflow, parent)).update == "allow") throw new PermissionDeniedError("createFlow", "update");
                } catch(e) {
                    throw new UserInputError("The Flow you specified was not found.");
                }
            } else {
                //var _user = await UserModel.findById(auth.userId);
                parent = userflow;
            }
            var owner = parent._id.toHexString();
            var doc: Partial<Flow> = {
                ...flowPresets[flow.preset],
                ...flow,
                parent: parent, owner: parent.owner,
                members: [userflow],
                id: "//"+flow.id,
                snowflake: esg.next(),
                alternative_ids: ["//"+flow.id]
            };
            //return {...await (await FlowModel.create(doc)).toJSON(), id: doc.id};
            var newFlow = await FlowModel.create(doc);
            newFlow = await newFlow.populate("owner");
            return flowToQuery(newFlow, userflow);
        },
        updateFlow: async function (_, {id, data}: { id: string, data: Partial<Flow> }, {auth, userflow}: IContext) {
            if (!checkScope(auth, Scopes.FlowUpdate)) throw new OutOfScopeError("updateFlow", Scopes.FlowUpdate);
            const flow = await getFlow(id);
            const effectivePermissions = await getEffectivePermissions(userflow, flow);
            if (effectivePermissions.update == "deny") return null;
            if (data.public_permissions) verifyPermissionValues(data.public_permissions, "public_permissions");
            if (data.joined_permissions) verifyPermissionValues(data.joined_permissions, "joined_permissions");
            await flow.updateOne({$set: data});
            /* , $unset: Array.from(data as unknown as any).filter(([key, value]) => (value == "")) */
            return flowToQuery(await (await getFlow(id)).populate("owner"), userflow);
        },
        joinFlow: async function (_, {id, inviteCode}: { id: string, inviteCode: string }, {auth}: { auth: ILoggedIn }) {
            if (!checkScope(auth, Scopes.FlowJoin)) throw new OutOfScopeError("joinFlow", Scopes.FlowJoin);
            var [flow, ufid, user] = await Promise.all([
                getFlow(id),
                getUserFlowId(auth.userId),
                UserModel.findById(auth.userId)
            ]);
            if (flow.members.includes(ufid as any)) return null;
            var effectivePermissions = await getEffectivePermissions(user, flow);
            if (effectivePermissions.join != "allow") return null;
            //TODO: add support for join requests
            // if all checks pass...
            flow.members.push(ufid as any);
            await flow.save();
            return flow;
        },
        deleteFlow: async function (_, {id}: { id: string }, {auth, userflow}: IContext) {
            if (!checkScope(auth, Scopes.FlowUpdate)) return false;
            var flow = await getFlow(id);
            if (!flow) return false;
            if ((flow.owner as any)._id != auth.userId) return false;
            await flow.deleteOne();
            return true;
        },
        leaveFlow: async function (_, {id}: { id: string }, {auth}: { auth: ILoggedIn }) {
            if (!checkScope(auth, Scopes.FlowUpdate)) return false;
            var [flow, ufid] = await Promise.all([
                getFlow(id),
                getUserFlowId(auth.userId)
            ]);
            if (!flow) return false;
            if ((flow.owner as any)._id == ufid) return false;
            if (!flow.members.includes(ufid)) return false;
            flow.members.splice(flow.members.indexOf(ufid), 1);
            await flow.save();
            return true;
        },
        followFlow: async function (_, {id}: { id: string }, {auth}: { auth: ILoggedIn }) {
            if (!checkScope(auth, Scopes.FlowFollow)) return false;
            var user = await getUserFlow(auth.userId);
            var flow = await getFlow(id);
            if (!flow) return false;
            if (user.following.includes(flow._id)) return false;
            await user.updateOne({$push: {following: flow._id}});
            return true;
        },
        unfollowFlow: async function (_, {id}: { id: string }, {auth}: { auth: ILoggedIn }) {
            if (!checkScope(auth, Scopes.FlowFollow)) return false;
            var user = await getUserFlow(auth.userId);
            var flow = await getFlow(id);
            if (!flow) return false;
            if (!user.following.includes(flow._id)) return false;
            await user.updateOne({$pull: {following: flow._id}});
            return true;
        }
    }
}

export default flowResolver;