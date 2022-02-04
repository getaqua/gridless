import { Flow } from "@prisma/client";
import { Document } from "yaml";
import { ILoggedIn } from "./auth/types";
import { FlowPermissions } from "./flows/permissions";
// import { AuthConfigPage } from "./db/models/authConfigModel";
// import { Flow } from "./db/models/flowModel";

/** Prefer config from database */
declare const staticConfig: Document.Parsed;

//declare const __authConfigCache: AuthConfigPage;

export interface IContext {
  auth: ILoggedIn,
  userflow: Flow
}
