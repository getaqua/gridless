// import { Attachment, AttachmentModel } from "src/db/models/attachmentModel";
// import { Content } from "src/db/models/contentModel";
// import { Flow } from "src/db/models/flowModel";
import { Attachment, Content, Flow } from "src/db/prisma/client";
import { getFlowMember } from "src/db/types";
import { mapMember } from "src/flows/member";
import { flowToQuery } from "src/flows/query";
import { db } from "src/server";

export async function mapContent(content: Partial<Content> & {
    inFlow: Flow, attachments: Attachment[]}, userflow: Flow) {
    //await content.populate("author");
    //await content.populate("inFlow");

    const attachments = content.attachments
    // (await Promise.all(content.attachments
    // .map<any>(async (att) => await AttachmentModel.findOne(
    //     {$or: [{snowflake: (att as string).replace(/^.*\?id\=/,"")}, {original_file: att}, {optimized_file: att}]}
    // ))))
    .map<any>((att: Partial<Attachment>) => ({
        url: `/_gridless/media/view/${att.index}/` + (att.optimized_file ?? att.original_file),
        downloadUrl: `/_gridless/media/download/${att.index}/` + (att.original_file ?? att.optimized_file),
        mimeType: att.optimized_mime_type ?? att.original_mime_type,
        downloadMimeType: att.original_mime_type ?? att.optimized_mime_type,
        filename: att.filename,
        yours: att.user as any == userflow.owner,
        snowflake: att.snowflake
    }));
    
    return {
        ...content,
        // author: content.anonymous 
        // ? flowToQuery(content.inFlow as Flow, userflow)
        // : flowToQuery(await db.flow.findUnique({where: {snowflake: content.authorId}}) as Flow, userflow),
        author: content.anonymous
        ? mapMember(await getFlowMember(content.inFlow, content.inFlow))
        : mapMember(await getFlowMember(await db.flow.findUnique({where: {snowflake: content.authorId}}) as Flow, content.inFlow)),
        yours: content.authorId == userflow.snowflake,
        attachments,
        inFlowId: (content.inFlow as Flow).id,
        timestamp: content.timestamp.toISOString(),
        editedTimestamp: content.editedTimestamp?.toISOString()
    }
}