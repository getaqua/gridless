import debug from "debug";
import { Types } from "mongoose";
import { checkScope } from "src/auth/permissions";
import { isValidUsername } from "src/auth/signup";
import { CustomScope, ILoggedIn, Scopes, TokenType } from "src/auth/UserModel"
import { Content, ContentModel } from "src/db/models/contentModel";
import { Flow, FlowModel, getFlow } from "src/db/models/flowModel"
import { getUserFlow, getUserFlowId, User, UserModel } from "src/db/models/userModel";
import { getEffectivePermissions } from "./permissions";
import { flowPresets } from "./presets";

const log = debug("gridless:flow:resolver");

const flowResolver = {
    Query: {
        getFlow: async function (_, {id}: { id: string }, {auth}: { auth: ILoggedIn },) {
            var flow = await (await getFlow(id)).populate("owner, parent");
            if (!(checkScope(auth, Scopes.FlowViewPrivate) || flow.public_permissions.view == "allow")) return null;
            if (!flow) return null;
            if (!(flow.members.includes((await (await UserModel.findById(auth.userId)).flow)._id) || flow.public_permissions.view == "allow") 
            && (await getEffectivePermissions(await UserModel.findById(auth.userId), flow)).view == "allow") return null;
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
            .map<any>(async (content) => {
                await content.populate("author");
                return {
                    ...content.toJSON(),
                    inFlowId: flow.id,
                    timestamp: content.timestamp.toISOString(),
                    editedTimestamp: content.editedTimestamp?.toISOString()
                }
            });
        }
    },
    Mutation: {
        createFlow: async function (_, {flow, ownerId}: { flow: Partial<Flow> & { preset: string }, ownerId?: string }, {auth}: { auth: ILoggedIn }) {
            if (!checkScope(auth, Scopes.FlowNew)) return null;
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
            if (!checkScope(auth, Scopes.FlowUpdate)) return null;
            const flow = await getFlow(id);
            const effectivePermissions = await getEffectivePermissions(await UserModel.findById(auth.userId), flow);
            if (effectivePermissions.update == "deny") return null;
            await flow.updateOne({$set: data});
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