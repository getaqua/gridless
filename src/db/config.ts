import { Prisma } from "@prisma/client";
import { db } from "src/server";

/// The authorization configuration for 
interface AuthConfig {
  /** Whether registration is enabled. */
  registrationEnabled: boolean,
  /** Terms of Service URL. When set, it enables the Terms
   * of Service extra step before completing registration.*/
  termsOfServiceUrl?: string,
  /** Privacy Policy URL. When set, it enables the Privacy
   * Policy extra step before completing registration.*/
  privacyPolicyUrl?: string,
}

/** Get the authentication/authorization configuration. */
export function getAuthConfig(): AuthConfig {
  db.systemConfig.findUnique({where: {singleton: 0}, select: {auth: true}}).then(async (document) => {
    if (document == null) {
      let _am = await generateDefaultConfig();
      globalThis.__authConfigCache = _am.auth;
    } else globalThis.__authConfigCache = document;
  });
  return globalThis.__authConfigCache;
}

function generateDefaultConfig() {
  return db.systemConfig.create({
    data: {
      auth: {
        registrationEnabled: true
      }
    }
  });
}