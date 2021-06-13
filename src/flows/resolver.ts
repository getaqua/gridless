import debug from "debug";
import { Types } from "mongoose";
import { checkScope } from "src/auth/permissions";
import { isValidUsername } from "src/auth/signup";
import { CustomScope, ILoggedIn, Scopes, TokenType } from "src/auth/UserModel"
import { Flow, FlowModel, getFlow } from "src/db/models/flowModel"
import { User, UserModel } from "src/db/models/userModel";
import { getEffectivePermissions } from "./permissions";
import { flowPresets } from "./presets";

const log = debug("gridless:flow:resolver");

const flowResolver = {
    Query: {
        getFlow: async function (_, {id}: { id: string }, {auth}: { auth: ILoggedIn },) {
            // TODO: check if the client is authorized to perform this action, returning null if they are not
            var flow = await getFlow(id);
            if (!(checkScope(auth, CustomScope(`flow.${flow._id.toHexString()}.view`)) || flow.public_permissions.view == "allow")) return null;
            if (!flow) return null;
            if (!flow.members.includes((await (await UserModel.findById(auth.userId)).flow)._id.toString()) 
            && flow.member_permissions.view == "allow") return null;
            flow = await flow.populate("owner").execPopulate();
            return {...flow.toObject(), id: flow.id};
        }
    },
    Flow: {
        members: async function ({_id}: {_id: Types.ObjectId}, {limit}: { limit?: number }, {auth}: { auth: ILoggedIn }) {
            var flow = await FlowModel.findById(_id).populate("members");
            if (Math.abs(limit) != limit) limit = 0;
            return flow.members.slice(limit > 0 ? -(limit) : 0);
        },
        // TODO: put the Content field here
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
            newFlow = await newFlow.populate("owner").execPopulate();
            return {...newFlow.toJSON(), id: doc.id};
        },
        updateFlow: async function (_, {flowId, data}: { flowId: string, data: Partial<Flow> }, {auth}: { auth: ILoggedIn }) {
            if (!checkScope(auth, Scopes.FlowUpdate)) return null;
            const flow = await getFlow(flowId);
            const effectivePermissions = await getEffectivePermissions(await UserModel.findById(auth.userId), flow);
            if (effectivePermissions.update == "deny") return null;
            await flow.update({$set: data});
            return await getFlow(flowId);
        }
    }
}

export default flowResolver;