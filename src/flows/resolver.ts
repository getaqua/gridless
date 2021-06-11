import debug from "debug";
import { isValidUsername } from "src/auth/signup";
import { ILoggedIn, Scopes, TokenType } from "src/auth/UserModel"
import { Flow, FlowModel } from "src/db/models/flowModel"
import { flowPresets } from "./presets";

const log = debug("gridless:flow:resolver");

const flowResolver = {
    Query: {
        getFlow: async function (_, {id}: { id: string }, {auth}: { auth: ILoggedIn }) {
            // TODO: check if the client is authorized to perform this action, returning null if they are not
            var flow = await FlowModel.findOne({"$or": [{id}, {alternative_ids: id}]});
            return {...flow.toObject()};
        }
    },
    Mutation: {
        createFlow: async function (_, {flow}: { flow: Partial<Flow> & { preset: string } }, {auth}: { auth: ILoggedIn }) {
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
            return await FlowModel.create({
                ...flowPresets[flow.preset],
                ...flow,
                id: "//"+flow.id
            });
        }
    }
}

export default flowResolver;