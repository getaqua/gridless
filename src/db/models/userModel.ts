import mongoose from 'mongoose';

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
  }
});

export const UserModel = mongoose.model<User>('users', UserSchema);
