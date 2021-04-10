import express from 'express';
import bcrypt from 'bcryptjs';
import jsonwebtoken from 'jsonwebtoken';
import { UserModel } from '../db/models/userModel';
import debug from 'debug';
import { needsExtraSteps } from './extrasteps';

const log = debug("gridless:auth:login");

export async function endpoint(req: express.Request, res: express.Response, next: express.NextFunction) {
    const username = req.body?.["username"];
    const password = req.body?.["password"];
    const user = await UserModel.findOne({username});
    if (user == null) return res.status(403).render("autherror.j2", {messages: ["Username is incorrect."], backto: "/_gridless/login"})
    if (await bcrypt.compare(password, user.password)) {
        if (needsExtraSteps("login", req)) {
            return next();
        }
    } else return res.status(403).render("autherror.j2", {messages: ["Password is incorrect."], backto: "/_gridless/login"});
    
    var newToken = jsonwebtoken.sign(
        { uid: user._id.toString() },
        globalThis.staticConfig.get("auth").get("secret"),
        { expiresIn: '1y' }
    );
    res.cookie("jwt", newToken, {
        sameSite: "strict",
        httpOnly: true,
        path: "/_gridless",
        signed: true,
        expires: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
    });
    return res.redirect("/_gridless/success");
}

export async function logout(req: express.Request, res: express.Response) {
    res.cookie("jwt", "", {
        sameSite: "strict",
        httpOnly: true,
        path: "/_gridless",
        signed: true,
        expires: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
    });
    return res.redirect("/_gridless/login?logout=success");
}