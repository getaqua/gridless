import mongoose from 'mongoose';

/**
 * provides the Auth config page interface for typescript
 */
export interface AuthConfigPage extends mongoose.Document {
  /** Whether registration is enabled. */
  registrationEnabled: boolean,
  /** Terms of Service URL. When set, it enables the Terms
   * of Service extra step before completing registration.*/
  termsOfServiceUrl?: string,
  /** Privacy Policy URL. When set, it enables the Privacy
   * Policy extra step before completing registration.*/
  privacyPolicyUrl?: string,
}

/**
 * schema that represents the User database model
 */
const _schema = new mongoose.Schema({
  registrationEnabled: {
    type: Boolean,
    required: true,
    default: true
  },
  termsOfServiceUrl: {
    type: String,
    required: false,
  },
  privacyPolicyUrl: {
    type: String,
    required: false,
  },
});

const AuthConfigModel = mongoose.model<AuthConfigPage>('config', _schema);

/** Get the authentication/authorization configuration. */
export function getAuthConfig(): AuthConfigPage {
  AuthConfigModel.findById("CONFIGAUTH00").then(async (document) => {
    if (document == null) {
      let _am = new AuthConfigModel({
        _id: "CONFIGAUTH00",
        registrationEnabled: true
      })
      globalThis.__authConfigCache = await _am.save();
    } else globalThis.__authConfigCache = document;
  });
  return globalThis.__authConfigCache;
}
