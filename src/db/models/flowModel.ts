import mongoose, { ObjectId } from 'mongoose';
import { FlowBadge, FlowBadgeSchema } from 'src/flows/badges';
import { FlowPermissions } from 'src/flows/permissions';

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
  badges: [FlowBadgeSchema]
});

export const FlowModel = mongoose.model<Flow>('flows', FlowSchema);
