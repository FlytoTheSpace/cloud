import 'dotenv';
import { Accounts } from './database.js';
import UI from './ui.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { access } from 'fs';
export const defaultRole = 'member';
const sessionTokenExpiration = 30; // Time before the Session Token Expires (in Minutes)
export const Authentication = {
    // Functions inside "tools" property are untilities that are used Inside other Functions in this Object
    tools: {
        /**
         *
         * @param msg string
         * @param API API or Not?
         */
        resErrorPayload: (msg, API = false) => {
            return API ? { 'status': msg, 'success': false } : UI.errorMSG(msg);
        }
    },
    // Main Function for Authentication
    main: async (req, res, next, API, adminOnly) => {
        try {
            // Verifying Token is Valid
            if (!req.cookies.token && !req.headers.authorization) {
                return res.status(401).send(Authentication.tools.resErrorPayload("Account Required", API));
            }
            const token = req.cookies.token.toString() || req.headers.authorization?.toString();
            const decodedToken = Accounts.token.validate(token);
            if (!decodedToken) {
                return res.status(401).send(Authentication.tools.resErrorPayload("Invalid Token", API));
            }
            if (!API && Authentication.isSessionTokenValid(req)) {
                if (adminOnly && decodedToken.role !== 'admin') {
                    return res.status(401).send(Authentication.tools.resErrorPayload("Only Administrators are Allowed!", API));
                }
                ;
                return next();
            }
            // Finding The User in the Database
            const matchedAccount = await Accounts.findAccountOne.email(decodedToken.email);
            if (!matchedAccount) {
                return res.status(404).send(Authentication.tools.resErrorPayload("Invalid Token", API));
            }
            // Checking Password
            const isPasswordMatch = crypto.timingSafeEqual(Buffer.from(decodedToken.password), Buffer.from(matchedAccount.password));
            if (!isPasswordMatch) {
                return res.status(401).send(Authentication.tools.resErrorPayload("Invalid Token", API));
            }
            if (!API) {
                // Assigning the User a Session Token if not an API
                const sessionTokenPayload = {
                    'token': token,
                    'ip': (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0] : req.ip),
                    'creation': Date.now()
                };
                const expiration = new Date();
                expiration.setMinutes(expiration.getMinutes() + sessionTokenExpiration);
                const sessionToken = jwt.sign(sessionTokenPayload, process.env.ACCOUNTS_SESSION_TOKEN_VERIFICATION_KEY);
                res.cookie('sessionToken', sessionToken, {
                    expires: expiration,
                    httpOnly: true,
                    path: '/',
                    sameSite: 'strict'
                });
            }
            if (adminOnly && matchedAccount.role !== 'admin') {
                return res.status(401).send(Authentication.tools.resErrorPayload("Only Administrators are Allowed!", API));
            }
            return next(); // Authentication Passed! (Admin Mode)
        }
        catch (error) {
            console.log(error);
            return res.status(500).send(Authentication.tools.resErrorPayload("internal server error!", API));
        }
    },
    isSessionTokenValid: (req) => {
        try {
            // Checking if Session Token or Token is Missing
            if (!req.cookies.sessionToken || !req.cookies.token) {
                return false;
            }
            // Token Verification
            const token = req.cookies.token.toString();
            const decodedToken = Accounts.token.validate(token);
            if (!decodedToken) {
                return false;
            }
            // Session Token Verification
            const sessionToken = req.cookies.sessionToken.toString();
            const decodedSessionToken = Accounts.sessionToken.validate(sessionToken);
            if (!decodedSessionToken) {
                return false;
            }
            if ((Date.now() - decodedSessionToken.creation) / 1000 > sessionTokenExpiration * 60) {
                return false;
            }
            if (!req.ip) {
                return false;
            }
            if (req.ip !== decodedSessionToken.ip) {
                return false;
            }
            // Session Payload Token Verification
            const decodedSessionPayloadToken = Accounts.token.validate(token);
            if (!decodedSessionPayloadToken) {
                return false;
            }
            const isPasswordMatch = crypto.timingSafeEqual(Buffer.from(decodedToken.password), Buffer.from(decodedSessionPayloadToken.password));
            if (!isPasswordMatch) {
                return false;
            }
            return true;
        }
        catch (error) {
            console.log(error);
            return false;
        }
    },
    isSessionTokenValidandAdmin: (req) => {
        const response = { valid: false, admin: false };
        try {
            // Checking if Session Token or Token is Missing
            if (!req.cookies.sessionToken || !req.cookies.token) {
                return response;
            }
            // Token Verification
            const token = req.cookies.token.toString();
            const decodedToken = Accounts.token.validate(token);
            if (!decodedToken) {
                return response;
            }
            // Session Token Verification
            const sessionToken = req.cookies.sessionToken.toString();
            const decodedSessionToken = Accounts.sessionToken.validate(sessionToken);
            if (!decodedSessionToken) {
                return response;
            }
            if ((Date.now() - decodedSessionToken.creation) / 1000 > sessionTokenExpiration * 60) {
                return response;
            }
            if (!req.ip) {
                return response;
            }
            if (req.ip !== decodedSessionToken.ip) {
                return response;
            }
            // Session Payload Token Verification
            const decodedSessionPayloadToken = Accounts.token.validate(decodedSessionToken.token);
            if (!decodedSessionPayloadToken) {
                return response;
            }
            const isEmailMatch = crypto.timingSafeEqual(Buffer.from(decodedToken.email), Buffer.from(decodedSessionPayloadToken.email));
            const isPasswordMatch = crypto.timingSafeEqual(Buffer.from(decodedToken.password), Buffer.from(decodedSessionPayloadToken.password));
            if (!isEmailMatch) {
                return response;
            }
            if (!isPasswordMatch) {
                return response;
            }
            response.valid = true;
            if (decodedToken.role === 'admin') {
                response.admin = true;
            }
            return response;
        }
        catch (error) {
            console.log(error);
            return response;
        }
    },
    getGeneralInfo: async (req) => {
        const info = { loggedIn: false, admin: false };
        try {
            const session = Authentication.isSessionTokenValidandAdmin(req);
            if (session.valid === true) {
                info.loggedIn = true;
                if (session.admin === true) {
                    info.admin = true;
                }
                return info;
            }
            if (!req.cookies.token) {
                return info;
            }
            const token = req.cookies.token.toString();
            const decodedToken = Accounts.token.validate(token);
            if (!decodedToken) {
                return info;
            }
            // Finding The User in the Database
            const matchedAccount = await Accounts.findAccountOne.email(decodedToken.email);
            if (!matchedAccount) {
                return info;
            }
            // Checking Password
            const isPasswordMatch = crypto.timingSafeEqual(Buffer.from(decodedToken.password), Buffer.from(matchedAccount.password));
            if (!isPasswordMatch) {
                return info;
            }
            info.loggedIn = true;
            if (matchedAccount.role === 'admin') {
                info.admin = true;
            }
            ;
            return info;
        }
        catch (error) {
            console.log(error);
            return info;
        }
    },
    // Middlewares
    // for Normal Users:
    token: async (req, res, next) => await Authentication.main(req, res, next, false, false),
    tokenAPI: async (req, res, next) => await Authentication.main(req, res, next, true, false),
    // for Administrators:
    tokenAdmin: async (req, res, next) => await Authentication.main(req, res, next, false, true),
    tokenAdminAPI: async (req, res, next) => await Authentication.main(req, res, next, true, true),
};
export default Authentication;
