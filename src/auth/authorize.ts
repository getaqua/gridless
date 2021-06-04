/// Authorize client applications.

import express from 'express';
import debug from 'debug';
import fs from 'fs/promises';
import { ApplicationModel } from 'src/db/models/applicationModel';
import bcrypt from 'bcryptjs';
import jsonwebtoken from 'jsonwebtoken';
import { ILoggedIn } from './UserModel';

const log = debug("gridless:auth:client");

export async function endpoint(req: express.Request & {user?: ILoggedIn}, res: express.Response, next: express.NextFunction) {
    const app = ApplicationModel.findOne({client_id: req.query.client_id?.toString() ?? req.body?.client_id});
    const appdata = await app.exec();
    const method: AuthMethods = req.query["method"]?.toString() ?? req.body?.method ?? "redirect_url";
    const redirect_url = req.query["redirect_url"]?.toString() ?? req.body?.redirect_url;
    const scopes: Array<String> = (req.query["scopes"]?.toString() ?? req.body?.scopes)?.split(",") ?? [];

    if (!appdata) {
        return res.status(404).render("autherror.j2", {messages: [
            "Client ID does not exist."
        ]});
    } else if (req.method == "GET" && req.query["denied"] == "true") {
        res.clearCookie("permitapp", {httpOnly: true});
        return res.status(401).render("autherror.j2", {messages: [
            appdata.name + " was denied access to your account."
        ]});
    } else if (req.method == "GET") {
        res.cookie("permitapp", appdata.id, {httpOnly: true});
        return res.render("authorize.nj", {
            scopedata: JSON.parse(await (await fs.readFile(__dirname+"/scopeStrings.json")).toString()),
            app: appdata,
            scopes,
            authmethod: method,
            redirect_url,
        })
    } else if (req.method == "POST" && req.cookies["permitapp"] != appdata.id) {
        res.clearCookie("permitapp", {httpOnly: true});
        return res.status(400).render("autherror.j2", {messages: [
            appdata.name + " attempted to bypass the permission flow."
        ]});
    }

    // == GENERATE TOKEN ==
    var newToken = jsonwebtoken.sign(
        { uid: req.user?.userId, aid: appdata.id, scopes: scopes},
        globalThis.staticConfig.get("auth").get("secret"),
        { expiresIn: '1y' }
    );

    /*else*/ if (method == "show") {
        if (scopes.includes("client")) {
            return res.status(400).render("autherror.j2", {messages: [
                "`show` authorization method not allowed for applications that request the `client` special scope."
            ]});
        } else return res.render("showtoken.nj", {
            app: appdata,
            token: newToken
        });
    } else {
        return res.status(400).render("autherror.j2", {messages: [
            "`method` query parameter required.",
            newToken
        ]});
    }
}

type AuthMethods = "redirect_url" | "show" | string;