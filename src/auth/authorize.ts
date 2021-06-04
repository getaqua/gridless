/// Authorize client applications.

import express from 'express';
import debug from 'debug';
import fs from 'fs/promises';
import { ApplicationModel } from 'src/db/models/applicationModel';

const log = debug("gridless:auth:client");

export async function endpoint(req: express.Request, res: express.Response, next: express.NextFunction) {
    const app = ApplicationModel.findOne({client_id: req.query.client_id.toString()});
    const appdata = await app.exec();

    if (!appdata) {
        return res.status(404).render("autherror.j2", {messages: [
            "Client ID does not exist."
        ]});
    } else if (req.method == "GET" && req.params["denied"] == "true") {
        res.clearCookie("permitapp", {httpOnly: true});
        return res.status(401).render("autherror.j2", {messages: [
            appdata.name + " was denied access to your account."
        ]});
    } else if (req.method == "GET") {
        res.cookie("permitapp", appdata.id, {httpOnly: true});
        return res.render("authorize.nj", {
            scopedata: JSON.parse(await (await fs.readFile(__dirname+"/scopeStrings.json")).toString()),
            app: appdata,
            scopes: req.query["scopes"].toString()?.split(",") ?? []
        })
    } else if (req.method == "POST" && req.cookies["permitapp"] != appdata.id) {
        res.clearCookie("permitapp", {httpOnly: true});
        return res.status(400).render("autherror.j2", {messages: [
            appdata.name + " attempted to bypass the permission flow."
        ]});
    }
}