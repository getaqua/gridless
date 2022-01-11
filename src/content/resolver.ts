import debug from "debug";
import { checkScope } from "src/auth/permissions";
import { ILoggedIn, Scopes } from "src/auth/UserModel";
import { Content, ContentModel } from "src/db/models/contentModel";
import { Flow, FlowModel, getFlow } from "src/db/models/flowModel";
import { getUserFlow, getUserFlowId, UserModel } from "src/db/models/userModel";
import { getEffectivePermissions } from "src/flows/permissions";
import { ExtSnowflakeGenerator } from "extended-snowflake";
import { Types } from "mongoose";

const log = debug("gridless:content:resolver");

const esg = new ExtSnowflakeGenerator(0);

const contentResolver = {
    Query: {
        getFollowedContent: async function (_, {limit = 100}: { limit?: number }, {auth}: { auth: ILoggedIn }) {
            const flow = await getUserFlow(auth.userId);
            if (!(checkScope(auth, Scopes.FlowViewPrivate))) return null;
            if (!(checkScope(auth, Scopes.FlowReadPrivate))) return null;
            //if (!flow) return null;
            if (flow.following.length == 0) return [];
            return (await ContentModel.find({inFlow: {$in: flow.following as Types.ObjectId[]}}).sort({timestamp: -1}).limit(limit))
            .map<any>(async (content) => {
                await content.populate("author");
                await content.populate("inFlow");
                return {
                    ...content.toJSON(),
                    inFlowId: (content.inFlow as Flow).id,
                    timestamp: content.timestamp.toISOString(),
                    editedTimestamp: content.editedTimestamp?.toISOString()
                }
            });
        }
    },
    Mutation: {
        postContent: async function (_, {to, data}: { to: string, data: Partial<Content>}, {auth}: {auth: ILoggedIn}) {
            if (!checkScope(auth, Scopes.FlowContentPost)) return null;
            const flow = await getFlow(to);
            const user = await UserModel.findById(auth.userId);
            const userflow = await user.flow;
            const effectivePermissions = await getEffectivePermissions(user, flow);
            if (effectivePermissions.post == "deny") return null;
            // If all checks pass...
            const newContent = new ContentModel({
                ...data,
                timestamp: new Date(Date.now()),
                author: userflow._id,
                inFlow: flow._id,
                pinned: false,
                snowflake: esg.next()
            });
            await newContent.save();
            return {
                ...newContent.toJSON(),
                inFlowId: flow.id,
                author: userflow.toJSON(),
                timestamp: newContent.timestamp.toISOString(),
                editedTimestamp: newContent.editedTimestamp?.toISOString()
            };
        },
        updateContent: async function (_, {id, data}: { id: string, data: Partial<Content>}, {auth}: {auth: ILoggedIn}) {
            if (!checkScope(auth, Scopes.FlowContentPost)) return null;
            const content = await ContentModel.findOne({snowflake: id}).populate("inFlow");
            const user = await UserModel.findById(auth.userId);
            const userflow = await user.flow;
            // cannot edit posts if you cannot make new ones.
            // maybe this will change to be its own permission
            const effectivePermissions = await getEffectivePermissions(user, content.inFlow as Flow);
            if (effectivePermissions.post == "deny") return null;
            // If all checks pass, update the following fields
            if (data.text) content.text = data.text;
            content.editedTimestamp = new Date(Date.now());
            await content.save();
            return {
                ...content.toJSON(),
                inFlowId: (content.inFlow as Flow).id,
                author: userflow.toJSON(),
                timestamp: content.timestamp.toISOString(),
                editedTimestamp: content.editedTimestamp?.toISOString()
            };
        },
        deleteContent: async function (_, {snowflake}: {snowflake: string}, {auth}: {auth: ILoggedIn}) {
            if (!checkScope(auth, Scopes.FlowContentManage)) return false;
            const content = await ContentModel.findOne({snowflake}).populate("inFlow");
            if (!content) return false;
            const flow = content.inFlow as Flow;
            const user = await UserModel.findById(auth.userId);
            const ufid = await getUserFlowId(auth.userId);
            if (content.author != ufid) {
                const effectivePermissions = await getEffectivePermissions(user, flow);
                if (effectivePermissions.delete == "deny") return false;
            }
            await content.deleteOne();
            return true;
        }
    }
}

export default contentResolver;