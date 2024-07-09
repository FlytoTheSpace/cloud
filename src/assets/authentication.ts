import 'dotenv'
import { Accounts, accountInterface } from './database.js';
import { NextFunction, Request, Response } from 'express';
import UI from './ui.js';
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { access } from 'fs';
import logPrefix from './log.js';

export type roles = 'member' | 'admin';
export const defaultRole: roles = 'member';
export interface SessionTokenPayload {
    token: string,
    ip: string,
    creation: number
}

const sessionTokenExpiration: number = 30; // Time before the Session Token Expires (in Minutes)

export interface getGeneralInfoInterface {
    loggedIn: boolean,
    admin: boolean
}
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
            if (!req.cookies.token && !req.headers.authorization) { return res.status(401).send(Authentication.tools.resErrorPayload("Account Required", API)) }
            
            const token: string = req.cookies.token.toString() || req.headers.authorization?.toString();
            const decodedToken: accountInterface | null = Accounts.token.validate(token)
            
            if (!decodedToken) { return res.status(401).send(Authentication.tools.resErrorPayload("Invalid Token", API)) }

            if (!API && Authentication.isSessionTokenValid(req)) {
                if (adminOnly && decodedToken.role !== 'admin') { return res.status(401).send(Authentication.tools.resErrorPayload("Only Administrators are Allowed!", API)) };
                return next();
            }

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
            console.log(logPrefix("Error"), error)
            return res.status(500).send(Authentication.tools.resErrorPayload("internal server error!", API))
        }
    },
    isSessionTokenValid: (req: Request): boolean => {
        try {
            // Checking if Session Token or Token is Missing
            if (!req.cookies.sessionToken || !req.cookies.token) { return false }

            // Token Verification
            const token: string = req.cookies.token.toString();
            const decodedToken: accountInterface | null = Accounts.token.validate(token)
            if (!decodedToken) { return false }

            // Session Token Verification
            const sessionToken: string = req.cookies.sessionToken.toString()
            const decodedSessionToken: SessionTokenPayload | null = Accounts.sessionToken.validate(sessionToken)

            if (!decodedSessionToken) { return false }

            if ((Date.now() - decodedSessionToken.creation) / 1000 > sessionTokenExpiration * 60) { return false }
            const ipAddress: string | undefined = req.ip
            
            if (!ipAddress) { return false }
            if (ipAddress !== decodedSessionToken.ip) { return false }

            // Session Payload Token Verification
            const decodedSessionPayloadToken: accountInterface | null = Accounts.token.validate(token)
            if (!decodedSessionPayloadToken) { return false }

            const isPasswordMatch: boolean = crypto.timingSafeEqual(Buffer.from(decodedToken.password), Buffer.from(decodedSessionPayloadToken.password))
            if (!isPasswordMatch) { return false }

            return true
        } catch (error) {
            console.log(logPrefix("Error"), error)
            return false
        }
    },
    isSessionTokenValidandAdmin: (req: Request): {valid: boolean, admin: boolean} => {
        const response: {valid: boolean, admin: boolean} = {valid: false, admin: false}
        try {
            // Checking if Session Token or Token is Missing
            if (!req.cookies.sessionToken || !req.cookies.token) { return response }

            // Token Verification
            const token: string = req.cookies.token.toString();
            const decodedToken: accountInterface | null = Accounts.token.validate(token)
            if (!decodedToken) { return response }

            // Session Token Verification
            const sessionToken: string = req.cookies.sessionToken.toString()
            const decodedSessionToken: SessionTokenPayload | null = Accounts.sessionToken.validate(sessionToken)
            if (!decodedSessionToken) { return response }

            if ((Date.now() - decodedSessionToken.creation) / 1000 > sessionTokenExpiration * 60) { return response }
            if (!req.ip) { return response }
            if (req.ip !== decodedSessionToken.ip) { return response }

            // Session Payload Token Verification
            const decodedSessionPayloadToken: accountInterface | null = Accounts.token.validate(decodedSessionToken.token)

            if(!decodedSessionPayloadToken){ return response}

            const isEmailMatch: boolean = crypto.timingSafeEqual(Buffer.from(decodedToken.email), Buffer.from(decodedSessionPayloadToken.email));
            const isPasswordMatch: boolean = crypto.timingSafeEqual(Buffer.from(decodedToken.password), Buffer.from(decodedSessionPayloadToken.password))

            if (!isEmailMatch) { return response }
            if (!isPasswordMatch) { return response }
            response.valid = true;

            if(decodedToken.role === 'admin'){ response.admin = true }

            return response
        } catch (error) {
            console.log(logPrefix("Error"), error)
            return response
        }
    },
    getGeneralInfo: async (req: Request): Promise<getGeneralInfoInterface> => {
        const info: getGeneralInfoInterface = {loggedIn: false, admin: false}
        try {
            const session: {valid: boolean, admin: boolean} = Authentication.isSessionTokenValidandAdmin(req)
            if(session.valid === true) {

                info.loggedIn = true

                if(session.admin === true) { info.admin = true}

                return info
            }
            if (!req.cookies.token) { return info}
            const token: string = req.cookies.token.toString()
            const decodedToken: accountInterface | null = Accounts.token.validate(token)

            if (!decodedToken) { return info}

            // Finding The User in the Database
            const matchedAccount: accountInterface | undefined = (await Accounts.findAccountOne.email(decodedToken.email) as accountInterface | undefined)
            if (!matchedAccount) { return info }

            // Checking Password
            const isPasswordMatch: boolean = crypto.timingSafeEqual(Buffer.from(decodedToken.password), Buffer.from(matchedAccount.password))
            if (!isPasswordMatch) { return info }

            info.loggedIn = true

            if(matchedAccount.role === 'admin') { info.admin = true };
            return info
        } catch (error) {
            console.log(logPrefix("Error"), error)
            return info
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