import { Attachment, AttachmentModel } from "src/db/models/attachmentModel";
import { Content } from "src/db/models/contentModel";
import { Flow } from "src/db/models/flowModel";
import { flowToQuery } from "src/flows/query";

export async function mapContent(content: Partial<Content>, userflow: Flow) {
    await content.populate("author");
    await content.populate("inFlow");

    const attachments = (await Promise.all(content.attachments
    .map<any>(async (att) => await AttachmentModel.findOne(
        {$or: [{snowflake: (att as string).replace(/^.*\?id\=/,"")}, {original_file: att}, {optimized_file: att}]}
    )))).map<any>((att: Partial<Attachment>) => ({
        url: `/_gridless/media/view/${att.index}/` + (att.optimized_file ?? att.original_file),
        downloadUrl: `/_gridless/media/download/${att.index}/` + (att.original_file ?? att.optimized_file),
        mimeType: att.optimized_mime_type ?? att.original_mime_type,
        downloadMimeType: att.original_mime_type ?? att.optimized_mime_type,
        filename: att.filename,
        yours: att.user as any == userflow.owner,
        snowflake: att.snowflake
    }));
    
    return {
        ...content.toJSON(),
        author: flowToQuery(content.author as Flow, userflow),
        attachments,
        inFlowId: (content.inFlow as Flow).id,
        timestamp: content.timestamp.toISOString(),
        editedTimestamp: content.editedTimestamp?.toISOString()
    }
}