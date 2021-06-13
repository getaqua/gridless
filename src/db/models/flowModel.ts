import mongoose, { Mongoose, ObjectId, Schema } from 'mongoose';
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
  /** The parent of the Flow. 
   * 
   * Add `.populate("parent")` to the query
   * before use. */
  parent: Flow | mongoose.Types.ObjectId | string
  /** The owner of the Flow. This is a user, not a Flow.
   * 
   * Add `.populate("owner")` to the query
   * before use. */
  owner: User | mongoose.Types.ObjectId | string
  /** The members of the Flow.
   * Add `.populate("members.$*")` to the query
   * before use. */
  members: (Flow | mongoose.Types.ObjectId | string)[]
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
    required: true
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
  }
});

export const FlowModel = mongoose.model<Flow>('flows', FlowSchema);
export const getFlow = async (id: string) => await FlowModel.findOne({$or: [{id}, {alternative_ids: id}]});