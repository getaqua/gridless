import express from "express";
import { getAuthConfig } from "src/db/config";

export function extraStepsMiddleware(req: express.Request, res: express.Response, next) {
    if (getAuthConfig().termsOfServiceUrl && !req.body?.["acceptedTerms"]) {
        return res.render("extrasteps/terms.nj", {
            sitename: globalThis.staticConfig.get("sitename"),
            termsurl: getAuthConfig().termsOfServiceUrl,
            postbody: req.body ?? {}
        });
    }
    if (getAuthConfig().privacyPolicyUrl && !req.body?.["acceptedPrivacyPolicy"]) {
        return res.render("extrasteps/privacy.nj", {
            sitename: globalThis.staticConfig.get("sitename"),
            privacyurl: getAuthConfig().privacyPolicyUrl,
            postbody: req.body ?? {}
        });
    }
    return next();
}

export function needsExtraSteps(type: "login" | "register", req: express.Request): boolean {
    if (type == "register") {
        if (getAuthConfig().termsOfServiceUrl && !req.body?.["acceptedTerms"]) return true;
        if (getAuthConfig().privacyPolicyUrl && !req.body?.["acceptedPrivacyPolicy"]) return true;
    } else if (type == "login") {
        //TODO: add TOTP 2FA
    }
    return false
}