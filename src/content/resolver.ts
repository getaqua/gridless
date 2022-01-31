import debug from "debug";
import { checkScope } from "src/auth/permissions";
import { ILoggedIn, Scopes } from "src/auth/UserModel";
import { Content, ContentModel } from "src/db/models/contentModel";
import { Flow, FlowModel, getFlow } from "src/db/models/flowModel";
import { getUserFlow, getUserFlowId, UserModel } from "src/db/models/userModel";
import { getEffectivePermissions } from "src/flows/permissions";
import { ExtSnowflakeGenerator } from "extended-snowflake";
import { Types } from "mongoose";
import { OutOfScopeError, PermissionDeniedError } from "src/handling/graphql";
import { Attachment, AttachmentModel } from "src/db/models/attachmentModel";
import { mapContent } from "./map";
import { flowToQuery } from "src/flows/query";
import { IContext } from "src/global";

const log = debug("gridless:content:resolver");

const esg = new ExtSnowflakeGenerator(0);

const contentResolver = {
    Query: {
        getFollowedContent: async function (_, {limit = 100}: { limit?: number }, {auth, userflow}: IContext) {
            const flow = await getUserFlow(auth.userId);
            if (!(checkScope(auth, Scopes.FlowViewPrivate))) throw new OutOfScopeError("getFollowedContent", Scopes.FlowViewPrivate);
            if (!(checkScope(auth, Scopes.FlowReadPrivate))) throw new OutOfScopeError("getFollowedContent", Scopes.FlowReadPrivate);
            //if (!flow) return null;
            if (flow.following.length == 0) return [];
            return (await ContentModel.find({inFlow: {$in: flow.following as Types.ObjectId[]}}).sort({timestamp: -1}).limit(limit))
            .map<any>((c) => mapContent(c, userflow));
        }
    },
    Mutation: {
        postContent: async function (_, {to, data}: { to: string, data: Partial<Content> & {attachments: string[]}}, {auth, userflow}: IContext) {
            if (!checkScope(auth, Scopes.FlowContentPost)) throw new OutOfScopeError("postContent", Scopes.FlowContentPost);
            const flow = await getFlow(to);
            //const user = await UserModel.findById(auth.userId);
            //const userflow = await user.flow;
            const effectivePermissions = await getEffectivePermissions(userflow, flow);
            if (effectivePermissions.post == "deny") throw new PermissionDeniedError("postContent", "post");
            if (data.anonymous == true && effectivePermissions.anonymous != "force") {
                if (effectivePermissions.anonymous == "deny") throw new PermissionDeniedError("postContent anonymously", "anonymous");
                if (!checkScope(auth, Scopes.FlowImpersonate)) throw new OutOfScopeError("postContent anonymously", Scopes.FlowImpersonate);
            }
            // If all checks pass...
            const attachments = data.attachments?.filter((v,i,a) => typeof v == "string" && v.startsWith("/_gridless/media/view/")) ?? [];
            const newContent = new ContentModel({
                ...data,
                attachments,
                timestamp: new Date(Date.now()),
                author: userflow._id,
                inFlow: flow._id,
                anonymous: effectivePermissions.anonymous == "force" || data.anonymous || false,
                pinned: false,
                snowflake: esg.next()
            });
            await newContent.save();
            // return {
            //     ...newContent.toJSON(),
            //     inFlowId: flow.id,
            //     author: flowToQuery(userflow, userflow),
            //     timestamp: newContent.timestamp.toISOString(),
            //     editedTimestamp: newContent.editedTimestamp?.toISOString()
            // };
            return mapContent(newContent, userflow);
        },
        updateContent: async function (_, {id, data}: { id: string, data: Partial<Content>}, {auth}: {auth: ILoggedIn}) {
            if (!checkScope(auth, Scopes.FlowContentPost)) throw new OutOfScopeError("updateContent", Scopes.FlowContentPost);
            const content = await ContentModel.findOne({snowflake: id}).populate("inFlow");
            const user = await UserModel.findById(auth.userId);
            const userflow = await user.flow;
            // cannot edit posts if you cannot make new ones.
            // maybe this will change to be its own permission
            const effectivePermissions = await getEffectivePermissions(user, content.inFlow as Flow);
            if (effectivePermissions.post == "deny") throw new PermissionDeniedError("updateContent", "post");
            // If all checks pass, update the following fields
            if (data.text) content.text = data.text;
            content.editedTimestamp = new Date(Date.now());
            await content.save();
            return mapContent(content, userflow);
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
        // TODO: a `removeAttachment` mutation that edits the given Content to remove
        // TODO: and possibly delete the given Attachment, by its snowflake or path
    }
}

export default contentResolver;