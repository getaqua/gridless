import express, { NextFunction, Response } from 'express';
import registrationEndpoint from './auth/signup';
import debug from 'debug';
import { urlencoded as bodyParser } from 'body-parser';
import jwt from 'jsonwebtoken';
import { ensureLoggedIn } from './auth/attachments';
import { UserModel } from './db/models/userModel';

const log = debug("gridless:routes");

export default function routes() {
    const globalProps = {
        sitename: globalThis.staticConfig['sitename']
    };
    const router = express.Router()
    // /_gridless/graphql endpoint
    // /_gridless/login, /_gridless/register, and other auth endpoints
    router.get("/register", function(req, res) {
        return res.render("register.j2", {...globalProps});
    });
    router.post("/register", bodyParser({extended: true}), registrationEndpoint);
    router.get("/success", ensureLoggedIn(), async function(req: express.Request, res: express.Response) {
        //const token = jwt.verify(req.cookies["jwt"], globalThis.staticConfig.get("auth").get("secret"));
        return res.send({"success": true, ...req['user'], ...(await (await UserModel.findById(req['user'].userId).exec()).toJSON())});
    });

    return router;
}