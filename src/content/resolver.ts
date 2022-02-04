import debug from "debug";
import { checkScope } from "src/auth/permissions";
import { ILoggedIn, Scopes } from "src/auth/types";
import { getEffectivePermissions } from "src/flows/permissions";
import { ExtSnowflakeGenerator } from "extended-snowflake";
import { OutOfScopeError, PermissionDeniedError } from "src/handling/graphql";
import { mapContent } from "./map";
import { flowToQuery } from "src/flows/query";
import { IContext } from "src/global";
import { db } from "src/server";
import { flowById, getFlowMember } from "src/db/types";
import { Content, Prisma } from "@prisma/client";

const log = debug("gridless:content:resolver");

const esg = new ExtSnowflakeGenerator(0);

const contentResolver = {
    Query: {
        getFollowedContent: async function (_, {limit = 100}: { limit?: number }, {auth, userflow}: IContext) {
            //const flow = await getUserFlow(auth.userId);
            if (!(checkScope(auth, Scopes.FlowViewPrivate))) throw new OutOfScopeError("getFollowedContent", Scopes.FlowViewPrivate);
            if (!(checkScope(auth, Scopes.FlowReadPrivate))) throw new OutOfScopeError("getFollowedContent", Scopes.FlowReadPrivate);
            //if (!flow) return null;
            //if (following.following.length == 0) return [];
            const following = await db.flow.findFirst({
                where: flowById(userflow.snowflake), 
                select: {following: {
                    select: {
                        snowflake: true
                    }
                }}
            });
            if (following.following.length == 0) return []
            //return (await ContentModel.find({inFlow: {$in: flow.following as Types.ObjectId[]}}).sort({timestamp: -1}).limit(limit))
            return (await db.content.findMany({
                where: {inFlowId: {in: following.following.map((v) => v.snowflake)}},
                include: {attachments: true, inFlow: true}
            }))
            .map<any>((c) => mapContent(c, userflow));
        }
    },
    Mutation: {
        postContent: async function (_, {to, data}: { to: string, data: Partial<Prisma.ContentCreateInput> & {attachments: string[]}}, {auth, userflow}: IContext) {
            if (!checkScope(auth, Scopes.FlowContentPost)) throw new OutOfScopeError("postContent", Scopes.FlowContentPost);
            const flow = await db.flow.findFirst({where: flowById(to), /*include: {parent: true},*/ rejectOnNotFound: false});
            //const user = await UserModel.findById(auth.userId);
            //const userflow = await user.flow;
            const effectivePermissions = await getEffectivePermissions(flow, await getFlowMember(userflow, flow));
            if (effectivePermissions.post == "deny") throw new PermissionDeniedError("postContent", "post");
            if (data.anonymous == true && effectivePermissions.anonymous != "force") {
                if (effectivePermissions.anonymous == "deny") throw new PermissionDeniedError("postContent anonymously", "anonymous");
                if (!checkScope(auth, Scopes.FlowImpersonate)) throw new OutOfScopeError("postContent anonymously", Scopes.FlowImpersonate);
            }
            // If all checks pass...
            const attachments = data.attachments?.filter((v) => typeof v == "string" && v.startsWith("/_gridless/media/view/") && v.includes("?id=")) ?? [];
            const newContent = await db.content.create({
                data: {
                    ...data,
                    attachments: {
                        connect: attachments.map((v) => ({
                            snowflake: v.substr(v.indexOf("?id=")+4)
                        }))
                    },
                    timestamp: new Date(Date.now()),
                    authorId: userflow.snowflake,
                    inFlow: {
                        connect: {
                            snowflake: flow.snowflake   
                        },
                    },
                    //inFlowId: flow.snowflake,
                    anonymous: effectivePermissions.anonymous == "force" || data.anonymous || false,
                    pinned: false,
                    snowflake: esg.next()
                },
                include: {attachments: true, inFlow: true}
            });
            return mapContent(newContent, userflow);
        },
        updateContent: async function (_, {id, data}: { id: string, data: Partial<Content>}, {auth, userflow}: IContext) {
            if (!checkScope(auth, Scopes.FlowContentPost)) throw new OutOfScopeError("updateContent", Scopes.FlowContentPost);
            //const content = await ContentModel.findOne({snowflake: id}).populate("inFlow");
            const content = await db.content.findUnique({where: {snowflake: id}, include: {inFlow: true}});
            const member = await getFlowMember(userflow, content.inFlow);
            //const userflow = await user.flow;
            // cannot edit posts if you cannot make new ones.
            // maybe this will change to be its own permission
            const effectivePermissions = await getEffectivePermissions(content.inFlow, member);
            if (effectivePermissions.post == "deny") throw new PermissionDeniedError("updateContent", "post");
            // If all checks pass, update the following fields
            var updatedContent: Prisma.ContentUpdateInput = {};
            if (data.text) updatedContent.text = data.text;
            updatedContent.editedTimestamp = new Date(Date.now());
            var newContent = await db.content.update({
                where: {snowflake: content.snowflake},
                data: updatedContent,
                include: {attachments: true, inFlow: true}
            });
            //await content.save();
            return mapContent(newContent, userflow);
        },
        deleteContent: async function (_, {snowflake}: {snowflake: string}, {auth, userflow}: IContext) {
            if (!checkScope(auth, Scopes.FlowContentPost)) throw new OutOfScopeError("updateContent", Scopes.FlowContentPost);
            //const content = await ContentModel.findOne({snowflake: id}).populate("inFlow");
            const content = await db.content.findUnique({where: {snowflake}, select: {inFlow: true, authorId: true}});
            const member = await getFlowMember(userflow, content.inFlow);
            //const userflow = await user.flow;
            // cannot edit posts if you cannot make new ones.
            // maybe this will change to be its own permission
            const effectivePermissions = await getEffectivePermissions(content.inFlow, member);
            if (effectivePermissions.post == "deny") throw new PermissionDeniedError("updateContent", "post");
            if (content.authorId != userflow.snowflake) {
                if (effectivePermissions.delete == "deny") return false;
            }
            await db.content.delete({where: {snowflake}});
            return true;
        }
        // TODO: a `removeAttachment` mutation that edits the given Content to remove
        // TODO: and possibly delete the given Attachment, by its snowflake or path
    }
}

export default contentResolver;