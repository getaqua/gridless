import debug from "debug";
import { checkScope } from "src/auth/permissions";
import { ILoggedIn, Scopes } from "src/auth/UserModel";
import { Content, ContentModel } from "src/db/models/contentModel";
import { getFlow } from "src/db/models/flowModel";
import { UserModel } from "src/db/models/userModel";
import { getEffectivePermissions } from "src/flows/permissions";
import { ExtSnowflakeGenerator } from "extended-snowflake";

const log = debug("gridless:content:resolver");

const esg = new ExtSnowflakeGenerator(0);

const contentResolver = {
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
        }
    }
}

export default contentResolver;