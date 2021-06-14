import { Schema, model, Types, Document, Mongoose } from 'mongoose';
import { Flow, MaybePopulated } from './flowModel';

export interface Content extends Document {
    // === BODY ===
    /** The text of this Content. */
    text?: string
    /** The original post of this Content, useful in Forwarding. */
    origin?: MaybePopulated<Content>

    /// === METADATA ===
    /** Whether or not the Content is pinned in its Flow (see `inFlow`). */
    pinned: boolean
    /** The author of this Content. */
    author: MaybePopulated<Flow>
    /** The Flow this Content was posted in, used for discovery. */
    inFlow: MaybePopulated<Flow>
    /** The time this was posted at. */
    timestamp: Date
    /** The time of the last edit to this Content. */
    editedTimestamp?: Date
    /** A unique identifier for this Content. */
    snowflake: string
}

const ContentSchema = new Schema({
    text: {
        type: String,
        maxLength: 480
    },
    origin: {
        type: Schema.Types.ObjectId,
        ref: "content",
    },
    pinned: {
        type: Boolean,
        default: false
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: "flows",
        required: true
    },
    inFlow: {
        type: Schema.Types.ObjectId,
        ref: "flows",
        required: true
    },
    timestamp: {
        type: Schema.Types.Date,
        required: true
    },
    editedTimestamp: {
        type: Schema.Types.Date,
        required: false
    },
    snowflake: {
        type: String,
        required: true,
        unique: true
    }
});

export const ContentModel = model<Content>("content", ContentSchema);