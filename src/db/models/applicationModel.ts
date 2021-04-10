import mongoose from 'mongoose';

/**
 * provides the User interface for typescript
 */
export interface Application extends mongoose.Document {
  name: string;
  owner: string;
  avatar_url?: string;
  type: "CLIENT" | "BOT" | string;
  patch: (data: Application) => void
}

/**
 * schema that represents the User database model
 */
const ApplicationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  owner: {
    type: String,
    required: true,
  },
  avatar_url: {
    type: String,
    required: false
  },
  type: {
    type: String,
    required: true,
    default: "CLIENT"
  }
});

ApplicationSchema.method("patch", (data: any) => {
    if (this == undefined) throw "NOOOO!";
    for (var field in data) {
        (this as Application)[field] = data[field];
    }
    (this as Application).save();
});

export const ApplicationModel = mongoose.model<Application>('applications', ApplicationSchema);
