import express, { Application, NextFunction, RequestHandler, Response } from 'express';
import { checkUsernameAvailability, endpoint as registrationEndpoint } from './auth/signup';
import { endpoint as loginEndpoint, logout, logout as logoutEndpoint } from './auth/login';
import * as authorizeEndpoints from './auth/authorize';
import debug from 'debug';
import { urlencoded as bodyParser, json as jsonParser } from 'body-parser';
import jwt from 'jsonwebtoken';
import { ensureLoggedIn } from './auth/attachments';
import { UserModel } from './db/models/userModel';
import { errorHandler } from './handling/errors';
import { defaultPasswordRequirements } from './auth/requirements';
import { getAuthConfig } from './db/models/authConfigModel';
import { extraStepsMiddleware } from './auth/extrasteps';
import { server as devgql } from './developers/graphql';
import { server as gql } from './graphql/middleware';
import { TokenType } from './auth/UserModel';
import { uploadFileEndpoint } from './uploads/upload';
import { viewFileEndpoint } from './uploads/download';

const log = debug("gridless:routes");

const registrationDisabledCheck = (req, res, next) => {
    if (getAuthConfig().registrationEnabled) next();
    else res.status(501).render("autherror.j2", {messages: ["Registration is disabled."]});
}

export default function routes() {
    const globalProps = {
        //sitename: globalThis.staticConfig.get("sitename"),
        banner: "/_gridless/static/gridlesslogo.png" // TODO: get this from the config, maybe?
    };
    const router = express.Router();

    // /_gridless/login, /_gridless/register, and other auth endpoints
    router.get("/register/password_requirements", 
        registrationDisabledCheck,
        (req, res) => res.render("passreq.j2", {...globalProps,
            passwordRequirements: defaultPasswordRequirements, //TODO: get the configurable version
            redirect_url: req.params["redirect_url"]
        })
    );
    router.get("/register",
        registrationDisabledCheck,
        checkUsernameAvailability, function(req, res) {
        return res.render("register.j2", {...globalProps,
            passwordRequirements: defaultPasswordRequirements //TODO: get the configurable version
        });
    });
    router.post("/register", 
        registrationDisabledCheck,
        bodyParser({extended: true}) as RequestHandler,
        registrationEndpoint,
        extraStepsMiddleware
    );
    router.get("/login", function(req, res) {
        return res.render("login.j2", {...globalProps, logout: req.query["logout"], redirect_url: req.query["redirect_url"]});
    });
    router.use("/logout", logoutEndpoint);
    router.post("/login", bodyParser({extended: true}) as RequestHandler, loginEndpoint);
    router.get("/success", ensureLoggedIn(), async function(req: express.Request, res: express.Response) {
        //const token = jwt.verify(req.cookies["jwt"], globalThis.staticConfig.get("auth").get("secret"));
        return res.send({"success": true, ...req['user'], ...(await (await UserModel.findById(req['user'].userId).exec()).toJSON())});
    });

    router.get("/developers", ensureLoggedIn(TokenType.COOKIE), (req, res) => res.render("devpanel/main.nj", {...globalProps}));
    router.post("/developers", ensureLoggedIn(TokenType.COOKIE), jsonParser() as RequestHandler);

    // /_graphql/authorize and /_graphql/claimtoken
    router.get("/authorize", 
        bodyParser({extended: true}) as RequestHandler,
        authorizeEndpoints.variableConfigMiddleware,
        authorizeEndpoints.preflightMiddleware,
        ensureLoggedIn(TokenType.COOKIE), 
        authorizeEndpoints.getEndpoint
    );
    router.post("/authorize", 
        bodyParser({extended: true}) as RequestHandler,
        authorizeEndpoints.variableConfigMiddleware,
        authorizeEndpoints.preflightMiddleware,
        authorizeEndpoints.nonBrowserMiddleware, 
        ensureLoggedIn(TokenType.COOKIE), 
        authorizeEndpoints.postEndpoint
    );
    router.post("/claimtoken", 
        bodyParser({extended: true}) as RequestHandler,
        authorizeEndpoints.variableConfigMiddleware,
        authorizeEndpoints.claimTokenEndpoint
    );

    // /_gridless/media endpoints
    router.post("/media",
        ensureLoggedIn(),
        uploadFileEndpoint
        //uploadMultipartFileEndpoint
    );
    router.get("/media/view/:index/:filename", viewFileEndpoint);
    router.get("/media/download/:index/:filename", viewFileEndpoint);

    // GraphQL middlewares
    devgql.applyMiddleware({app: router as Application, path: "/developers", disableHealthCheck: true});
    gql.applyMiddleware({app: router as Application, path: "/graphql"});

    // Healthcheck
    router.get("/healthcheck", (req, res, next) => res.type("txt").send("OK"));
    
    //router.get("/authconfig", ensureLoggedIn(TokenType.COOKIE), (req, res) => res.type("json").send(getAuthConfig().toJSON()));
    log("Registered routes for /_gridless");

    router.use("/static", express.static("src/views/static"));
    log("Registered /_gridless/static")


    router.all('*', (req, res, next) => next(404));
    router.use(errorHandler);

    log("Registered error handling. Router registration complete 😎");
    return router;
}