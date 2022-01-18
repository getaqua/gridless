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
import { OutOfScopeError } from "src/handling/graphql";
import { getEffectivePermissions } from "./permissions";
import { flowPresets } from "./presets";

const log = debug("gridless:flow:resolver");

const esg = new ExtSnowflakeGenerator(0);

const flowResolver = {
    Query: {
        getFlow: async function (_, {id}: { id: string }, {auth}: { auth: ILoggedIn },) {
            var flow = await getFlow(id);
            if (!(checkScope(auth, Scopes.FlowViewPrivate) || flow.public_permissions.view == "allow")) throw new OutOfScopeError("getFlow", Scopes.FlowViewPrivate);
            if (!flow) return null;
            await flow.populate("parent");
            const perms = (await getEffectivePermissions(await UserModel.findById(auth.userId), flow));
            if (!(flow.members.includes((await (await UserModel.findById(auth.userId)).flow)._id) || flow.public_permissions.view == "allow") 
            && perms.view == "allow") return null;
            return {...flow.toObject(), id: flow.id};
        },
        getFollowedFlows: async function (_, data, {auth}: { auth: ILoggedIn }) {
            const flow = await getUserFlow(auth.userId);
            await flow.populate("following");
            return flow.following.map((v: Flow, i,a) => ({...v.toObject(), id: v.id}));
        },
        getJoinedFlows: async function (_, data, {auth}: { auth: ILoggedIn }) {
            const flow = await getUserFlow(auth.userId);
            var flows = await FlowModel.find({"members": flow._id});
            return flows.map((v: Flow, i,a) => ({...v.toObject(), id: v.id}));
        }
    },
    Flow: {
        members: async function ({_id}: {_id: Types.ObjectId}, {limit}: { limit?: number }, {auth}: { auth: ILoggedIn }) {
            var flow = await FlowModel.findById(_id).populate("members");
            if (Math.abs(limit) != limit) limit = 0;
            return flow.members.slice(limit > 0 ? -(limit) : 0);
        },
        content: async function (flow: Partial<Flow>, {limit = 100}: { limit?: number }, {auth}: { auth: ILoggedIn }) {
            if (!(checkScope(auth, Scopes.FlowViewPrivate) || flow.public_permissions.view == "allow")) return null;
            if (!(checkScope(auth, Scopes.FlowReadPrivate) || 
                (flow.public_permissions.read == "allow" && checkScope(auth, Scopes.FlowReadPublic)))) return null;
            if (!flow) return null;
            if (!(flow.members.includes((await (await UserModel.findById(auth.userId)).flow)._id) || flow.public_permissions.read == "allow") 
            && (await getEffectivePermissions(await UserModel.findById(auth.userId), flow as any)).read == "allow") return null;
            return (await ContentModel.find({inFlow: new Types.ObjectId(flow._id)}).sort({timestamp: -1}).limit(limit))
            .map<any>((c) => mapContent(c, auth.userId));
        },
        effective_permissions: async function (flow: Partial<Flow>, _, {auth}: { auth: ILoggedIn }) {
            //if (!flow) return null;
            return await getEffectivePermissions(await UserModel.findById(auth.userId), flow as any);
        },
    },
    Mutation: {
        createFlow: async function (_, {flow, ownerId}: { flow: Partial<Flow> & { preset: string }, ownerId?: string }, {auth}: { auth: ILoggedIn }) {
            if (!checkScope(auth, Scopes.FlowNew)) throw new OutOfScopeError("createFlow", Scopes.FlowNew);
            if (!await isValidUsername(flow.id)) return null;
            // if all checks pass...
            log("Creating new Flow.");
            var parent: Flow;
            if (ownerId) {
                parent = await getFlow(ownerId);
            } else {
                var _user = await UserModel.findById(auth.userId);
                parent = await _user.flow;
            }
            var owner = parent?._id.toHexString();
            var doc: Partial<Flow> = {
                ...flowPresets[flow.preset],
                ...flow,
                parent: parent, owner: parent.owner,
                members: [await (parent.owner as User).flow],
                id: "//"+flow.id,
                alternative_ids: ["//"+flow.id]
            };
            //return {...await (await FlowModel.create(doc)).toJSON(), id: doc.id};
            var newFlow = await FlowModel.create(doc);
            newFlow = await newFlow.populate("owner");
            return {...newFlow.toJSON(), id: doc.id};
        },
        updateFlow: async function (_, {id, data}: { id: string, data: Partial<Flow> }, {auth}: { auth: ILoggedIn }) {
            if (!checkScope(auth, Scopes.FlowUpdate)) throw new OutOfScopeError("updateFlow", Scopes.FlowUpdate);
            const flow = await getFlow(id);
            const effectivePermissions = await getEffectivePermissions(await UserModel.findById(auth.userId), flow);
            if (effectivePermissions.update == "deny") return null;
            await flow.updateOne({$set: data});
            /* , $unset: Array.from(data as unknown as any).filter(([key, value]) => (value == "")) */
            return await (await getFlow(id)).populate("owner");
        },
        joinFlow: async function (_, {id, inviteCode}: { id: string, inviteCode: string }, {auth}: { auth: ILoggedIn }) {
            if (!checkScope(auth, Scopes.FlowJoin)) return null;
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
        deleteFlow: async function (_, {id}: { id: string }, {auth}: { auth: ILoggedIn }) {
            if (!checkScope(auth, Scopes.FlowUpdate)) return false;
            var [flow, ufid] = await Promise.all([
                getFlow(id),
                getUserFlowId(auth.userId)
            ]);
            if (!flow) return false;
            if ((flow.owner as any)._id != ufid) return false;
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