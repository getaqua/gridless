import express from 'express';
import bcrypt from 'bcryptjs';
import jsonwebtoken from 'jsonwebtoken';
import { UserModel } from '../db/models/userModel';
import debug from 'debug';
import { defaultPasswordRequirements, IPasswordRequirements, passwordSymbols, usernameRequirements } from './requirements';
import validator from 'password-validator';
import { needsExtraSteps } from './extrasteps';
import { FlowModel } from 'src/db/models/flowModel';

const log = debug("gridless:auth:signup");

export async function endpoint(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (!req.body?.["username"] || !req.body?.["password"]) {
        return res.render("autherror.j2", {messages: ["You must supply both a username and password."]});
    }
    const _uvalid = await isValidUsername(req.body?.["username"]);
    const _pvalid = await isValidPassword(req.body?.["password"]);
    let _mess = [];
    if (_uvalid != "SUCCESS") {
        _mess.push(_uvalid == "USERNAME_TAKEN" ? "This username is not available."
            : _uvalid == "INVALID_USERNAME" ? "The username is invalid."
            : "Unknown error processing username."
        );
    }
    if (_pvalid != true) {
        _mess.push(..._pvalid.messages);
    }
    if (_mess.length > 0) {
        return res.render("autherror.j2", {messages: _mess});
    }
    if (needsExtraSteps("register", req)) {
        return next();
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

export async function checkUsernameAvailability(req: express.Request, res: express.Response, next: express.NextFunction) {
    //log("DEBUG: Check value is: "+req.query["check"])
    if (req.query["check"]?.toString() == "username") {
        const _valid = await isValidUsername(req.query["username"].toString());
        if (_valid === "SUCCESS") {
            return res.status(200).type("json").send("{}");
        } else {
            return res.status(400).type("json").send(`{"error":"${_valid}"}\n`);
        }
    } else if (req.query["check"]?.toString() == "password") {
        const _valid = isValidPassword(req.query["password"].toString());
        if (_valid === true) {
            return res.status(200).type("json").send("{}");
        } else {
            return res.status(400).type("json").send(`{error: "INVALID_PASSWORD"}\n`);
        }
    } else return next()
}

export async function isValidUsername(username: string): Promise<"SUCCESS" | "INVALID_USERNAME" | "USERNAME_TAKEN"> {
    if (!usernameRequirements.exec(username)) return "INVALID_USERNAME";
    if (username.includes("//")) return "INVALID_USERNAME";
    if (username.includes("/#/")) return "INVALID_USERNAME";
    // save the database checks for last!
    // If a previous check fails, these don't need to be run.
    if (await UserModel.exists({username})) return "USERNAME_TAKEN";
    if (await UserModel.exists({"$or": [
        {id: "//"+username}, {alternative_ids: "//"+username}
    ]}) || await FlowModel.exists({"$or": [
        {id: "//"+username}, {alternative_ids: "//"+username}
    ]})) return "USERNAME_TAKEN";
    // all tests pass! it's a valid username.
    return "SUCCESS";
}

const _lowercaseLetters = /[a-z]/;
const _uppercaseLetters = /[A-Z]/;
const _numerals = /[0-9]/;

function isValidPassword(password: string): true | {messages: Array<string>} {
    const passwordRequirements: IPasswordRequirements = {...defaultPasswordRequirements} //TODO: load password requirements from database config
    var _validator = new validator();
    _validator
    .is().min(passwordRequirements.minLength)
    .has().lowercase(passwordRequirements.minLowercase)
    .has().uppercase(passwordRequirements.minCapitals)
    .has().digits(passwordRequirements.minDigits)
    .has().symbols(passwordRequirements.minSymbols)
    .is().not().oneOf(["password", "Password", "pa$$w0rd", "c0p3nHag3n"]);

    if (passwordRequirements.maxLength) _validator.is().max(passwordRequirements.maxLength+1);
    if (passwordRequirements.maxLowercase) _validator.has().not().lowercase(passwordRequirements.maxLowercase+1);
    if (passwordRequirements.maxCapitals) _validator.has().not().uppercase(passwordRequirements.maxCapitals+1);
    if (passwordRequirements.maxDigits) _validator.has().not().digits(passwordRequirements.maxDigits+1);
    if (passwordRequirements.maxSymbols) _validator.has().not().symbols(passwordRequirements.maxSymbols+1);
    
    const _validated = _validator.validate(password, {list: true})
    if (_validated == []) {
        return true
    } else {
        return {"messages": _validated.map((value, _, __) => (
            value == "min" ? `Your password must be at least ${passwordRequirements.minLength} characters long.`
            : value == "max" ? `Your password must be less than ${passwordRequirements.maxLength} characters long.`
            : value == "uppercase" ? `Your password must contain at least ${passwordRequirements.minCapitals} uppercase letters.`
            : value == "lowercase" ? `Your password must contain at least ${passwordRequirements.minLowercase} lowercase letters.`
            : value == "digits" ? `Your password must contain at least ${passwordRequirements.minDigits} numerals (digits).`
            : value == "oneOf" ? `The password you supplied is forbidden.`
            : `The password is invalid.`
        ))};
    }
}