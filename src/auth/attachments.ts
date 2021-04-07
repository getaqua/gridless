/// Authentication middleware and annotations

import { NextFunction, Request, Response } from "express";
import jsonwebtoken from 'jsonwebtoken';
import { ILoggedIn, TokenType } from "./UserModel";

/// Determine if the user is logged in with the given method.
/// The user ID is available at `req.user`.
export function ensureLoggedIn(using: TokenType | null = null) {
    return function(req: Request, res: Response, next: NextFunction) {
        const _token = req.params['access_token'] || req.signedCookies['jwt'] || req.get("Authorization")?.replace("Bearer ", "")?.replace("Bot ", "");
        if (!_token) return next(401);
        const token = jsonwebtoken.verify(_token, globalThis.staticConfig.get("auth").get("secret"));
        if (typeof token == "string") {
            return next(401)
        } else {
            const user = {
                userId: token['uid'],
                appId: token['aid'],
                tokenType: token['aid'] ? 
                    token['bot'] === true ? TokenType.BOTTOKEN
                    : TokenType.APPTOKEN
                : req.signedCookies.jwt == _token ? TokenType.COOKIE
                : TokenType.INVALID
            } as ILoggedIn;
            if (user.tokenType == TokenType.INVALID) return next("gridless:invalidtoken");
            if (using != null) {
                if (using != user.tokenType) return next("gridless:wrongtokentype");
            }
            req['user'] = user;
            return next();
        }
    }
}