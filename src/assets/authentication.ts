import 'dotenv'
import path from 'path';
import { Accounts, accountInterface } from './database.js';
import { NextFunction, Request, Response } from 'express';
import UI from './ui.js';
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { match } from 'assert';

export type roles = 'member' | 'admin';
export const defaultRole: roles = 'member';

const Authentication = {
    // Functions inside "tools" property are untilities that are used Inside other Functions in this Object
    tools: {
        /**
         * 
         * @param msg string
         * @param API API or Not?
         */
        resErrorPayload: (msg: string, API: boolean = false) => {
            return API ? { 'status': msg, 'success': false } : UI.errorMSG(msg)
        }
    },
    // Main Function for Authentication
    main: async (req: Request, res: Response, next: NextFunction, API?: boolean, adminOnly?: boolean) => {
        try {
            // Verifying Token is Valid
            if (!req.cookies.token) { return res.status(401).send(Authentication.tools.resErrorPayload("Account Required", API)) }
            if (!Accounts.token.isValid(req.cookies.token)) { return res.status(401).send(Authentication.tools.resErrorPayload("Invalid Token", API)) }
            const token: string = req.cookies.token;
            const decodedToken: accountInterface = (jwt.verify(token, (process.env.ACCOUNTS_TOKEN_VERIFICATION_KEY as string)) as accountInterface)

            // Finding The User in the Database
            const matchedAccount: accountInterface | undefined = (await Accounts.findAccountOne.email(decodedToken.email) as accountInterface | undefined)
            if (!matchedAccount) { return res.status(404).send(Authentication.tools.resErrorPayload("Invalid Token", API)) }
            
            // Checking Password
            const isPasswordMatch: boolean = crypto.timingSafeEqual(Buffer.from(decodedToken.password), Buffer.from(matchedAccount.password))
            if (!isPasswordMatch) { return res.status(401).send(Authentication.tools.resErrorPayload("Invalid Token", API)) }

            if (!adminOnly) { return next() } // Authentication Passed! (if not Admin Only Mode)

            // Making Sure The Account is An Admin
            if (matchedAccount.role === 'admin') { return res.status(401).send(Authentication.tools.resErrorPayload("Only Administrators are Allowed!", API)) };

            return next() // Authentication Passed! (Admin Mode)
        } catch (error) {
            console.log(error)
            return res.status(500).send(Authentication.tools.resErrorPayload("internal server error!", API)) 
        }
    },
    // Middlewares
    // for Normal Users:
    token: async (req: Request, res: Response, next: NextFunction) => await Authentication.main(req, res, next, false, false),
    tokenAPI: async (req: Request, res: Response, next: NextFunction) => await Authentication.main(req, res, next, true, false),
    // for Administrators:
    tokenAdmin: async (req: Request, res: Response, next: NextFunction) => await Authentication.main(req, res, next, false, true),
    tokenAdminAPI: async (req: Request, res: Response, next: NextFunction) => await Authentication.main(req, res, next, true, true),
}

export default Authentication