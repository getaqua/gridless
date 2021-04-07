import express from 'express';
import bcrypt from 'bcryptjs';
import jsonwebtoken from 'jsonwebtoken';
import { UserModel } from '../db/models/userModel';
import debug from 'debug';
import { defaultPasswordRequirements, IPasswordRequirements, passwordSymbols, usernameRequirements } from './requirements';
import validator from 'password-validator';

const log = debug("gridless:auth:signup");

export = async function(req: express.Request, res: express.Response) {
    if (req.body?.["check"] == "username") {
        if (isValidUsername(req.body?.["username"])) {
            return res.status(204);
        } else {
            return res.status(400);
        }
    } else if (req.body?.["check"] == "password") {
        const _valid = isValidPassword(req.body?.["password"]);
        if (_valid === true) {
            return res.status(204);
        } else {
            return res.status(400).send({error: "INVALID_PASSWORD"});
        }
        return res.status(400);
    } else if (!req.body?.["username"] || !req.body?.["password"]) {
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

async function isValidUsername(username: string): Promise<boolean> {
    if (!usernameRequirements.exec(username)) return false;
    if (username.includes("//")) return false;
    if (username.includes("/#/")) return false;
    // save the database checks for last!
    // If a previous check fails, these don't need to be run.
    if (await UserModel.exists({username})) return false;
    if (await UserModel.exists({"$or": [{id: "//"+username}, {alternative_ids: "//"+username}]})) return false;
    // all tests pass! it's a valid username.
    return true;
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