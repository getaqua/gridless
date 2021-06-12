import debug from "debug";
import mongoose, { isValidObjectId, Mongoose, Types } from 'mongoose';
import { isValidUsername } from "src/auth/signup";
import { ILoggedIn, Scopes, TokenType } from "src/auth/UserModel"
import { Flow, FlowModel } from "src/db/models/flowModel"
import { User, UserModel } from "src/db/models/userModel";
import { flowPresets } from "./presets";

const log = debug("gridless:flow:resolver");

const flowResolver = {
    Query: {
        getFlow: async function (_, {id}: { id: string }, {auth}: { auth: ILoggedIn }) {
            // TODO: check if the client is authorized to perform this action, returning null if they are not
            var flow = await FlowModel.findOne({"$or": [{id}, {alternative_ids: id}]});
            flow = await flow.populate("owner").execPopulate();
            return {...flow.toObject(), id: flow.id};
        }
    },
    Flow: {
        members: async function ({id}: Partial<Flow>, {limit}: { limit?: number }, {auth}: { auth: ILoggedIn }) {
            var flow = await FlowModel.findOne({"$or": [{id}, {alternative_ids: id}]}).populate("members");
            return flow.members;
        }
    },
    Mutation: {
        createFlow: async function (_, {flow, parentId}: { flow: Partial<Flow> & { preset: string }, parentId?: string }, {auth}: { auth: ILoggedIn }) {
            // TODO: use the permission/scope checker function
            if (!(
                auth.tokenType == TokenType.APPTOKEN
                && (
                    auth.scopes.includes(Scopes.FlowNew)
                    || auth.scopes.includes(Scopes.Client)
                )
            )) return null;
            if (!await isValidUsername(flow.id)) return null;
            // if all checks pass...
            log("Creating new Flow.");
            var parent: Flow;
            if (parentId) {
                parent = await FlowModel.findOne({$or: [{id: parentId}, {alternative_ids: parentId}]});
            } else {
                var _user = await UserModel.findById(auth.userId);
                parent = await _user.flow;
            }
            var owner = parent?._id.toHexString();
            var doc: Partial<Flow> = {
                ...flowPresets[flow.preset],
                ...flow,
                owner,
                members: [owner],
                id: "//"+flow.id,
                alternative_ids: ["//"+flow.id]
            };
            //return {...await (await FlowModel.create(doc)).toJSON(), id: doc.id};
            var newFlow = await FlowModel.create(doc);
            newFlow = await newFlow.populate("owner").execPopulate();
            return {...newFlow.toJSON(), id: doc.id};
        }
    }
}

export default flowResolver;