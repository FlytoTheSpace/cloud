import 'dotenv';
import path from 'path';
import { Accounts } from './database.js';
import UI from './ui.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { match } from 'assert';
export const defaultRole = 'member';
const Authentication = {
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
            if (!req.cookies.token) {
                return res.status(401).send(Authentication.tools.resErrorPayload("Account Required", API));
            }
            if (!Accounts.token.isValid(req.cookies.token)) {
                return res.status(401).send(Authentication.tools.resErrorPayload("Invalid Token", API));
            }
            const token = req.cookies.token;
            const decodedToken = jwt.verify(token, process.env.ACCOUNTS_TOKEN_VERIFICATION_KEY);
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
            if (!adminOnly) {
                return next();
            } // Authentication Passed! (if not Admin Only Mode)
            // Making Sure The Account is An Admin
            if (matchedAccount.role === 'admin') {
                return res.status(401).send(Authentication.tools.resErrorPayload("Only Administrators are Allowed!", API));
            }
            ;
            return next(); // Authentication Passed! (Admin Mode)
        }
        catch (error) {
            console.log(error);
            return res.status(500).send(Authentication.tools.resErrorPayload("internal server error!", API));
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
