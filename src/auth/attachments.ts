/// Authentication middleware and annotations

import { NextFunction, Request, Response } from "express";
import jsonwebtoken from 'jsonwebtoken';
import { db } from "src/server";
import { checkScope } from "./permissions";
import { ILoggedIn, Scopes, TokenType } from "./types";

/// Determine if the user is logged in with the given method.
/// The user ID is available at `req.user`.
export function ensureLoggedIn(using: TokenType | null = null) {
    return async function(req: Request, res: Response, next: NextFunction) {
        const _token = req.params['access_token'] || req.signedCookies['jwt'] || req.get("Authorization")?.replace("Bearer ", "")?.replace("Bot ", "");
        if (!_token) return next(401);
        var token: object | string | false;
        try {
            token = jsonwebtoken.verify(_token, globalThis.staticConfig.get("auth").get("secret"));
        } catch(e) {
            token = false;
        }
        if (!token) {
            return next(401)
        } else {
            const user = {
                userId: token['uid'],
                appId: token['aid'],
                scopes: token['scopes'],
                tokenType: token['aid'] ? 
                token['bot'] === true ? TokenType.BOTTOKEN
                : TokenType.APPTOKEN
                : req.signedCookies.jwt == _token ? TokenType.COOKIE
                : TokenType.INVALID
            } as ILoggedIn;
            const _authorizedCount = await db.user.count({where: {snowflake: user.userId, authorizedAppCIDs: token["client_id"]}});
            const isAppAuthorized = _authorizedCount > 0;
            if (user.tokenType == TokenType.APPTOKEN && !isAppAuthorized) return next("gridless:expiredtoken");
            if (user.tokenType == TokenType.INVALID) return next("gridless:invalidtoken");
            if (using != null && using != user.tokenType) return next("gridless:wrongtokentype");
            req['user'] = user;
            return next();
        }
    }
}

export function scopeCheck(scope: Scopes) {
    return function (target: any, propertyName: string, descriptor: TypedPropertyDescriptor<Function>) {
        let field = descriptor.value!;

        descriptor.value = function (parent, data, context) {
            if (!checkScope(context.auth, Scopes.FlowUpdate)) return null;
            else field.apply(this, [parent, data, context]);
        }
    }
}