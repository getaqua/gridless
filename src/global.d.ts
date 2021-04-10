import { Document } from "yaml";
import { AuthConfigPage } from "./db/models/authConfigModel";

/** Prefer config from database */
declare const staticConfig: Document.Parsed;

declare const __authConfigCache: AuthConfigPage;