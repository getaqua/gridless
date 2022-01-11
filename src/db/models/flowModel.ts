import mongoose, { Mongoose, Schema } from 'mongoose';
import { FlowBadge, FlowBadgeSchema } from 'src/flows/badges';
import { FlowPermissions } from 'src/flows/permissions';
import { User } from './userModel';

/**
 * provides the Flow interface for typescript
 */
export interface Flow extends mongoose.Document {
  name: string
  description?: string
  /** The Flow's ID. */
  id: string
  alternative_ids: string[]
  /** The default permissions for unjoined users. */
  public_permissions: Partial<FlowPermissions>
  /** The default permissions for members. 
   * All allowed public permissions are granted
   * in addition to permissions granted here. */
  joined_permissions: Omit<Partial<FlowPermissions>, "join">
  /** The key is the object ID of a user. 
   * Permission overrides for specific members. */
  member_permissions: Record<string, Partial<FlowPermissions>>
  badges: FlowBadge[]
  /** The parent of the Flow. `null` if this is a User Flow,
   * which is considered a root/origin Flow.
   * 
   * Add `.populate("parent")` to the query
   * before use. */
  parent?: MaybePopulated<Flow>
  /** The owner of the Flow. This is a user, not a Flow.
   * 
   * Add `.populate("owner")` to the query
   * before use. */
  owner: MaybePopulated<User>
  /** The members of the Flow.
   * Add `.populate("members.$*")` to the query
   * before use. */
  members: MaybePopulated<Flow>[]
  /** A unique, public ID to identify this Flow
   * in clients. */
  snowflake: String
  /** The Flows this Flow follows. */
  following: MaybePopulated<Flow>[]
}

const AllowDeny = {
  type: String,
  // All possible settings for a Flow permission.
  enum: ["allow", "deny", "request"],
  required: false
}

const FlowPermissionSchema = new mongoose.Schema({
  // Mongoose will not validate the values of 
  join: AllowDeny,
  post: AllowDeny,
  read: AllowDeny,
  view: AllowDeny,
  delete: AllowDeny,
});

/**
 * schema that represents the User database model
 */
const FlowSchema = new mongoose.Schema({
  // email: {
  //   type: String,
  //   required: true,
  //   unique: true,
  // },
  id: {
    type: String,
    required: true,
    unique: true,
  },
  alternative_ids: {
    type: [String],
    required: false,
    unique: true,
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: false,
  },
  public_permissions: {
    type: FlowPermissionSchema,
    required: true
  },
  joined_permissions: {
    type: FlowPermissionSchema,
    required: true
  },
  member_permissions: {
    type: Map,
    of: FlowPermissionSchema,
    required: false,
    default: {}
  },
  badges: [FlowBadgeSchema],
  parent: {
    type: Schema.Types.ObjectId,
    ref: "flows",
    required: false
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: "users",
    required: true
  },
  members: {
    type: Array,
    of: {
      type: Schema.Types.ObjectId,
      ref: "flows",
    },
    required: true
  },
  following: {
    type: Array,
    of: {
      type: Schema.Types.ObjectId,
      ref: "flows",
    },
    required: false
  }
});

/** 
 * This field *may* be populated, but it may not be. Provides a `.id` interface to check it.
 * 
 * To check if this value is populated, call `.populated("PATHHERE")`
 * on the document. To ensure this value is populated, call `.populate("PATHHERE")`
 * when finding the document.
 * 
 * *(MaybePopulated entries are NEVER strings, but if I don't make it a string, it explodes.
 * No idea why, don't ask, and don't touch it.)*
 */
export type MaybePopulated<T extends mongoose.Document> = (T | mongoose.Types.ObjectId | string);

export const FlowModel = mongoose.model<Flow>('flows', FlowSchema);
export const getFlow = async (id: string) => await FlowModel.findOne({$or: [{snowflake: id}, {id}, {alternative_ids: id}]});