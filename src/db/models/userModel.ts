import mongoose, { ObjectId } from 'mongoose';
import { Flow, FlowModel } from './flowModel';

/**
 * provides the User interface for typescript
 */
export interface User extends mongoose.Document {
  id: string;
  // alternative_ids: string[];
  username: string;
  //email: string;
  password: string;
  currentlyAuthorizingToken?: string;
  currentlyAuthorizingScopes?: string[];
  /** Client IDs that the user has authorized. */
  authorizedAppCIDs: string[];
  flow: Promise<Flow>;
}

/**
 * schema that represents the User database model
 */
const UserSchema = new mongoose.Schema({
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
  // alternative_ids: {
  //   type: [String],
  //   required: false,
  //   unique: true,
  // },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  currentlyAuthorizingToken: {
    type: String,
    required: false,
    index: {
      expires: "2m"
    }
  },
  currentlyAuthorizingScopes: {
    type: [String],
    required: false,
    index: {
      expires: "2m"
    }
  },
  authorizedAppCIDs: {
    type: [String],
    required: false,
    default: []
  }
});
UserSchema.virtual("flow").get(function() {return FlowModel.findOne({id: this.id});});

export const UserModel = mongoose.model<User>('users', UserSchema);
export const getUserFlow = async (userId: string) => await (await UserModel.findById(userId)).flow;
export const getUserFlowId = async function (userId: string) : Promise<ObjectId> {
  const user = await UserModel.findById(userId);
  return (await FlowModel.findOne({id: user.id}, {_id: 1}))._id;
};