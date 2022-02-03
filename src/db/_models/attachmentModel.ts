import mongoose, { ObjectId } from 'mongoose';

/**
 * provides the Attachment interface for typescript
 */
export interface Attachment extends mongoose.Document {
  /** The filename that the Attachment had when it was uploaded. */
  filename: string,
  /** The hash and extension of the optimized file.
   * Optimization is done with a tool like imagemagick or ffmpeg.
   * If available, this is the only hash the user should ever see.
   */
  optimized_file?: string,
  /** The hash and extension of the original file.
   * This file is not optimized and may not be available
   * when an optimized version is.
   * The user should not see this hash unless the file could not
   * be optimized.
   */
  original_file?: string,
  /** The MIME type for the file. */
  original_mime_type?: string,
  /** The MIME type of the optimized file.
   * Sometimes file optimizations will convert to a more optimized
   * or more widely available format. In those cases, this is the MIME
   * type for the format.
   */
  optimized_mime_type?: string,
  /** The index of the storage configuration in config.yaml. */
  index: number,
  /** The internal ID of the user who uploaded this file. */
  user: ObjectId,
  /** If applicable, the Application that uploaded this file
   * on the user's behalf. This is used for moderation purposes only.
   */
  app?: ObjectId,
  /** The public ID of the exact attachment. */
  snowflake: string,
}

/**
 * schema that represents the Attachment database model
 */
const AttachmentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  user: {
    type: mongoose.SchemaTypes.ObjectId,
    required: true,
  },
  app: {
    type: mongoose.SchemaTypes.ObjectId,
    required: false,
  },
  optimized_file: {
    type: String,
    required: false,
  },
  original_file: {
    type: String,
    required: false,
  },
  original_mime_type: {
    type: String,
    required: false,
  },
  optimized_mime_type: {
    type: String,
    required: false,
  },
  index: {
    type: String,
    required: true,
  },
  snowflake: {
    type: String,
    required: true,
  },
});

export const AttachmentModel = mongoose.model<Attachment>('attachments', AttachmentSchema);
