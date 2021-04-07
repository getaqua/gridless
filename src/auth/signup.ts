import express from 'express';
import bcrypt from 'bcryptjs';
import jsonwebtoken from 'jsonwebtoken';
import { UserModel } from '../db/models/userModel';
import debug from 'debug';

const log = debug("gridless:auth:signup");

export = async function(req: express.Request, res: express.Response) {
    if (!req.body?.["username"] || !req.body?.["password"]) {
        log(req.body);
        return res.sendStatus(401);
    }
    const pass = await bcrypt.hash(req.body?.["password"], 10);
    const user = new UserModel({
        username: req.body?.["username"],
        // email: email,
        id: "//"+req.body?.["username"],
        password: pass,
    });
    await user.save();

    var newToken = jsonwebtoken.sign(
        { uid: user._id.toString(), regi: "new" },
        globalThis.staticConfig.get("auth").get("secret"),
        { expiresIn: '1y' }
    );
    res.cookie("jwt", newToken, {
        sameSite: "strict",
        httpOnly: true,
        path: "/_gridless",
        signed: true,
        expires: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
    })
    return res.redirect("/_gridless/success");
}