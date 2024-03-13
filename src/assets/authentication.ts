import 'dotenv'
import { Accounts, accountInterface } from './database.js';
import { NextFunction, Request, Response } from 'express';
import UI from './ui.js';
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

export type roles = 'member' | 'admin';
export const defaultRole: roles = 'member';
export interface SessionTokenPayload {
    token: string,
    ip: string,
    creation: number
}

const sessionTokenExpiration: number = 30; // Time before the Session Token Expires (in Minutes)


export const Authentication = {
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
    main: async (req: Request, res: Response, next: NextFunction, API?: boolean, adminOnly?: boolean): Promise<void | Response<any, Record<string, any>>> => {
        try {
            // Verifying Token is Valid
            if (!req.cookies.token) { return res.status(401).send(Authentication.tools.resErrorPayload("Account Required", API)) }
            if (!Accounts.token.isValid(req.cookies.token.toString())) { return res.status(401).send(Authentication.tools.resErrorPayload("Invalid Token", API)) }
            const token: string = req.cookies.token.toString();
            const decodedToken: accountInterface = (jwt.verify(token, (process.env.ACCOUNTS_TOKEN_VERIFICATION_KEY as string)) as accountInterface)

            if (!API && Authentication.isSessionTokenValid(req, adminOnly)) { return next() }

            // Finding The User in the Database
            const matchedAccount: accountInterface | undefined = (await Accounts.findAccountOne.email(decodedToken.email) as accountInterface | undefined)
            if (!matchedAccount) { return res.status(404).send(Authentication.tools.resErrorPayload("Invalid Token", API)) }

            // Checking Password
            const isPasswordMatch: boolean = crypto.timingSafeEqual(Buffer.from(decodedToken.password), Buffer.from(matchedAccount.password))
            if (!isPasswordMatch) { return res.status(401).send(Authentication.tools.resErrorPayload("Invalid Token", API)) }

            if (!API) {
                // Assigning the User a Session Token if not an API
                const sessionTokenPayload: SessionTokenPayload = {
                    'token': token,
                    'ip': (req.headers['x-forwarded-for'] ? (req.headers['x-forwarded-for'] as string).split(',')[0] : req.ip) as string,
                    'creation': Date.now()
                }
                const expiration: Date = new Date();
                expiration.setMinutes(expiration.getMinutes() + sessionTokenExpiration);

                const sessionToken: string = jwt.sign(sessionTokenPayload, (process.env.ACCOUNTS_SESSION_TOKEN_VERIFICATION_KEY as string))
                res.cookie('sessionToken', sessionToken, {
                    expires: expiration,
                    httpOnly: true,
                    path: '/',
                    sameSite: 'strict'
                })
            }

            if (adminOnly && matchedAccount.role !== 'admin') { return res.status(401).send(Authentication.tools.resErrorPayload("Only Administrators are Allowed!", API)) }

            return next() // Authentication Passed! (Admin Mode)
        } catch (error) {
            console.log(error)
            return res.status(500).send(Authentication.tools.resErrorPayload("internal server error!", API))
        }
    },
    isSessionTokenValid: (req: Request, adminOnly: boolean = false): boolean => {
        try {
            // Checking if Session Token or Token is Missing
            if (!req.cookies.sessionToken || !req.cookies.token) { return false }

            // Token Verification
            const token: string = req.cookies.token.toString();
            if (!Accounts.token.isValid(token)) { return false }
            const decodedToken: accountInterface = (jwt.verify(token, (process.env.ACCOUNTS_TOKEN_VERIFICATION_KEY as string)) as accountInterface)

            // Session Token Verification
            const sessionToken: string = req.cookies.sessionToken.toString()
            if (!Accounts.sessionToken.isValid(sessionToken)) { return false }
            const decodedSessionToken: SessionTokenPayload = (jwt.verify(sessionToken, (process.env.ACCOUNTS_SESSION_TOKEN_VERIFICATION_KEY as string)) as SessionTokenPayload);

            if ((Date.now() - decodedSessionToken.creation) / 1000 > sessionTokenExpiration * 60) { return false }
            if (!req.ip) { return false }
            if (req.ip !== decodedSessionToken.ip) { return false }

            // Session Payload Token Verification
            if (!Accounts.token.isValid(decodedSessionToken.token)) { console.log("decodedSessionPayloadToken is not Valid:", decodedSessionToken.token); return false }
            const decodedSessionPayloadToken: accountInterface = (jwt.verify(token, (process.env.ACCOUNTS_TOKEN_VERIFICATION_KEY as string)) as accountInterface)

            const isPasswordMatch: boolean = crypto.timingSafeEqual(Buffer.from(decodedToken.password), Buffer.from(decodedSessionPayloadToken.password))
            if (!isPasswordMatch) { return false }

            if (adminOnly && decodedToken.role !== 'admin') { return false }

            return true
        } catch (error) {
            console.log(error)
            return false
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