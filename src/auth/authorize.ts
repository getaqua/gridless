/// Authorize client applications.

import express from 'express';
import debug from 'debug';
import fs from 'fs/promises';
import { Application, ApplicationModel } from 'src/db/models/applicationModel';
import jsonwebtoken from 'jsonwebtoken';
import { ILoggedIn } from './UserModel';

const log = debug("gridless:auth:client");

export async function endpoint(req: express.Request & {user?: ILoggedIn}, res: express.Response, next: express.NextFunction) {
    const app = ApplicationModel.findOne({client_id: req.query.client_id?.toString() ?? req.body?.client_id});
    const appdata = await app.exec();
    const method: AuthMethods = req.query["response_type"]?.toString() ?? req.body?.response_type ?? "code";
    const grant: "code" = req.query["grant_type"]?.toString() ?? req.body?.grant_type;
    const code: string = req.query["code"]?.toString() ?? req.body?.code;
    const redirect_url = req.query["redirect_uri"]?.toString() ?? req.body?.redirect_uri;
    const scopes: Array<String> = (req.query["scopes"]?.toString() ?? req.body?.scopes)?.split(",") ?? [];

    if (!appdata) {
        return res.status(404).render("autherror.j2", {messages: [
            "Client ID does not exist."
        ]});
    } else if (appdata.type == "BOT") {
        return res.status(501).render("autherror.j2", {messages: [
            appdata.name + " is a bot. Bot authorization is not supported yet."
        ]});
    } else if (req.method == "GET" && req.query["denied"] == "true") {
        res.clearCookie("permitapp", {httpOnly: true});
        return res.status(401).render("autherror.j2", {messages: [
            appdata.name + " was denied access to your account."
        ]});
    } else if (req.method == "GET") {
        // Not an error.
        res.cookie("permitapp", appdata.id, {httpOnly: true});
        return res.render("authorize.nj", {
            scopedata: JSON.parse(await (await fs.readFile(__dirname+"/scopeStrings.json")).toString()),
            app: appdata,
            scopes,
            authmethod: method,
            redirect_url,
        })
    } else if (req.method == "POST" && method == "code") {
        // Not an error.
        var authcode = jsonwebtoken.sign(
            { uid: req.user?.userId, aid: appdata.id, type: "code"},
            globalThis.staticConfig.get("auth").get("secret"),
            { expiresIn: '10m' }
        );
        return res.send({code: authcode});
    } else if (req.method == "POST" && req.cookies["permitapp"] != appdata.id) {
        res.clearCookie("permitapp", {httpOnly: true});
        return res.status(400).render("autherror.j2", {messages: [
            appdata.name + " attempted to bypass the permission flow."
        ]});
    }

    // TODO: inflate Flow scopes for each Flow authorized

    // == GENERATE TOKEN ==
    var newToken = jsonwebtoken.sign(
        { uid: req.user?.userId, aid: appdata.id, client_id: appdata.client_id, scopes: scopes},
        globalThis.staticConfig.get("auth").get("secret"),
        { expiresIn: '1y' }
    );

    if (req.method == "POST" && grant == "code") {
        if (verifyRedirectUrl(redirect_url, appdata)) {
            // The redirect_uri is valid and associated with this app.
            // Give the authorization code to the app.
            if (code && jsonwebtoken.verify(code, globalThis.staticConfig.get("auth").get("secret"))) {
                return res.redirect(redirect_url+"?code="+newToken);
            } else {
                return res.status(400).render("autherror.j2", {messages: [
                    code ? "Authorization code invalid." : "Authorization code required.",
                ]});
            }
        } else if (!redirect_url) {
            // The redirect_uri does not exist.
            // For now, give an error until I decide how to better handle this.
            return res.status(400).render("autherror.j2", {messages: [
                "`redirect_uri` query parameter required.",
            ]});
        } else {
            return res.status(400).render("autherror.j2", {messages: [
                "`redirect_uri` invalid.",
            ]});
        }
    } else if (method == "show") {
        if (scopes.includes("client")) {
            return res.status(400).render("autherror.j2", {messages: [
                "`show` authorization response type not allowed for applications that request the `client` special scope."
            ]});
        } else return res.render("showtoken.nj", {
            app: appdata,
            token: newToken
        });
    } else {
        return res.status(400).render("autherror.j2", {messages: [
            "`response_type` query parameter required.",
            newToken
        ]});
    }
}

type AuthMethods = "code" | "show" | string;

function verifyRedirectUrl(url: string, app: Application): boolean {
    // Check URL scheme.
    if (!isValidRedirectUri(url)) return false;
    // Check if host is listed in application.
    if (!app.redirect_uris.find((v,i,o) => url.startsWith(v))) return false;
    // If all above checks succeed...
    return true;
}
export function isValidRedirectUri(url: string): boolean {
    if (!url.startsWith("http://localhost/") 
    && !url.startsWith("http://localhost:")
    && !url.startsWith("https://") 
    && !(url.startsWith("aqua-app-intent-") && url.includes("://authorize/"))
      // The previous line allows URIs of a format:
      // aqua-app-intent-SOMETHING://authorize/
      // Seaworld will use this:
      // aqua-app-intent-seaworld://authorize/
      // The below works likewise.
    && !(url.startsWith("aquaAppIntent") && url.includes("://authorize/"))
    ) return false;
    else return true;
}