/// Authorize client applications.

import express from 'express';
import debug from 'debug';
import fs from 'fs/promises';
import { Application, ApplicationModel } from 'src/db/models/applicationModel';
import jsonwebtoken from 'jsonwebtoken';
import { ILoggedIn } from './UserModel';
import { UserModel } from 'src/db/models/userModel';
import { Query } from 'mongoose';

const log = debug("gridless:auth:client");

interface AuthorizeEndpointVariables {
    app: Query<Application, any, any>,
    appdata: Application,
    method?: AuthMethods,
    grant?: "code",
    code?: string,
    redirect_url?: string,
    scopes: string[],
    token?: false | object,
    tokenerror?: jsonwebtoken.VerifyErrors
}

export async function variableConfigMiddleware(req: express.Request & {user?: ILoggedIn, aevs: AuthorizeEndpointVariables}, res: express.Response, next: express.NextFunction) {
    const app = ApplicationModel.findOne({client_id: req.query.client_id?.toString() ?? req.body?.client_id});
    const appdata = await app.exec();
    const method: AuthMethods = req.query["response_type"]?.toString() ?? req.body?.response_type;
    const grant: "code" = req.query["grant_type"]?.toString() ?? req.body?.grant_type;
    const code: string = req.query["code"]?.toString() ?? req.body?.code;
    const redirect_url = req.query["redirect_uri"]?.toString() ?? req.body?.redirect_uri;
    const scopes: string[] = (req.query["scopes"]?.toString() ?? req.body?.scopes)?.split(",") ?? [];
    const [token, tokenerror] = code ? await verifyToken(code) : [null, null]; //jsonwebtoken.verify(code, globalThis.staticConfig.get("auth").get("secret"));

    req.aevs = {app, appdata, method, grant, code, redirect_url, scopes, token, tokenerror};
    return next();
}

export async function getEndpoint(req: express.Request & {user?: ILoggedIn, aevs: AuthorizeEndpointVariables}, res: express.Response, next: express.NextFunction) {
    const {appdata, code, token, method, grant, scopes, redirect_url} = req.aevs
        // Not an error.
        res.cookie("permitapp", appdata.id, {httpOnly: true});
        return res.render("authorize.nj", {
            // TODO: move scopedata file read below to a read-once global
            scopedata: JSON.parse(await (await fs.readFile(__dirname+"/scopeStrings.json")).toString()),
            app: appdata,
            authcode: code,
            scopes: token ? token?.["scopes"] : scopes,
            authmethod: method, grant,
            redirect_url,
        })
    
}

export async function postEndpoint(req: express.Request & {user?: ILoggedIn, aevs: AuthorizeEndpointVariables}, res: express.Response, next: express.NextFunction) {
    const {appdata, code, token, method, grant, scopes, redirect_url} = req.aevs;

    if (req.cookies["permitapp"] != appdata.id) {
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

    if (grant == "code") {
        if (verifyRedirectUrl(redirect_url, appdata)) {
            // The redirect_uri is valid and associated with this app.
            // Give the authorization code to the app.
            //if (code && jsonwebtoken.verify(code, globalThis.staticConfig.get("auth").get("secret"))) {
            return res.redirect(redirect_url+"?token="+newToken);
        } else if (!redirect_url) {
            // The redirect_uri does not exist.
            // For now, give an error until I decide how to better handle this.
            // return res.status(400).render("autherror.j2", {messages: [
            //     "`redirect_uri` query parameter required.",
            // ]});
            //
            // Handle it better by allowing the client to call 
            // /_gridless/claimtoken?code=<whatevertheauthcodeis>
            // to get their token, AFTER a user authorizes it.
            // See claimTokenEndpoint() below.
            //req.user?.userId
            if (code && token) {
                var um = await UserModel.findById(req.user?.userId);
                um.currentlyAuthorizingToken = code;
                um.currentlyAuthorizingScopes = token?.["scopes"];
                await um.save();
                return res.render("returntoapp.nj");
            } else return res.status(400).render("autherror.j2", {messages: [
                "Authorization code required if not using redirect_uri"
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

export async function preflightMiddleware(req: express.Request & {user?: ILoggedIn, aevs: AuthorizeEndpointVariables}, res: express.Response, next: express.NextFunction) {
    const {appdata, token, grant, tokenerror} = req.aevs;

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
    } else if (grant == "code" && !token) {
        res.clearCookie("permitapp", {httpOnly: true});
        return res.status(400).render("autherror.j2", {messages: [
            tokenerror.message.replace("jwt", "Authorization code")
        ]});
    }
    next();
}

export async function nonBrowserMiddleware(req: express.Request & {user?: ILoggedIn, aevs: AuthorizeEndpointVariables}, res: express.Response, next: express.NextFunction) {
    const {appdata, method, scopes} = req.aevs;

    if (req.method == "POST" && method == "code") {
        var authcode = jsonwebtoken.sign(
            { aid: appdata.id, type: "code", scopes},
            globalThis.staticConfig.get("auth").get("secret"),
            { expiresIn: '10m' }
        );
        return res.send({code: authcode});
    } else next();
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

export async function claimTokenEndpoint(req: express.Request & {user?: ILoggedIn, aevs: AuthorizeEndpointVariables}, res: express.Response, next: express.NextFunction) {
    const {appdata, code, token, tokenerror} = req.aevs;

    if (!appdata) {
        return res.status(404).send({
            error: "Client ID does not exist."
        });
    } else if (appdata.type == "BOT") {
        return res.status(501).send({
            error: appdata.name + " is a bot. Bot authorization is not supported yet."
        });
    } else if (!code || code == "null" || code == "undefined" || code == "0") {
        return res.status(400).send({
            error: "No authorization code given."
        });
    } else if (tokenerror) {
        return res.status(tokenerror.message.includes("expired") ? 408 : 400).send({
            error: tokenerror.message
        });
    }

    

    if ((await UserModel.countDocuments({currentlyAuthorizingToken: code})) == 1) {
        var user = await UserModel.findOne({currentlyAuthorizingToken: code})
        user.currentlyAuthorizingToken = "null";
        user.currentlyAuthorizingScopes = [];
        user.depopulate("currentlyAuthorizingToken");
        user.depopulate("currentlyAuthorizingScopes");
        user.authorizedAppCIDs.push(appdata.client_id);
        await user.save();
        // == GENERATE TOKEN ==
        var newToken = jsonwebtoken.sign(
            { uid: user._id.toString(), aid: appdata.id, client_id: appdata.client_id, scopes: token?.["scopes"]},
            globalThis.staticConfig.get("auth").get("secret"),
            { expiresIn: '1y' }
        );
        return res.send({token: newToken});
    } else {
        return res.status(401).send({
            error: "A user is not currently authorizing this app"
        })
    }
}

function verifyToken(token: string) : Promise<[object | false, jsonwebtoken.VerifyErrors?]> {
    return new Promise(function (resolve, reject) {
        jsonwebtoken.verify(token, globalThis.staticConfig.get("auth").get("secret"), {}, (err, data) => {
            if (err) return resolve([false, err]);
            return resolve([data, null]);
        });
    });
}