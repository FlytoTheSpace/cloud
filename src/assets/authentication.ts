import 'dotenv'
import { Accounts, accountInterface } from './database.js';
import { Handler, NextFunction, Request, Response } from 'express';
import UI from './ui.js';
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import logPrefix from './log.js';
import env from './env.js';
import { Handshake } from 'socket.io/dist/socket.js';
export type roles = 'member' | 'admin';
export const defaultRole: roles = 'member';
export interface SessionTokenPayload {
    token: string,
    ip: string,
    creation: number
}
// type Handshake = {
//     headers: {
//         [key: string]: string
//         connection: string,
//         host: string,
//         'user-agent': string,
//         accept: string,
//         'accept-language': string,
//         'accept-encoding': string,
//         dnt: string,
//         'sec-gpc': string,
//         referer: string,
//         cookie: string
//     },
//     time: string,
//     address: string,
//     xdomain: false,
//     secure: false,
//     issued: number,
//     url: string,
//     query: {
//         EIO: string,
//         transport: string,
//         t: string
//     },
//     auth: {}
//     cookies?: {
//         [key: string]: string | string[] | undefined
//     }
// }

function getCookie<T>(cookie: T, inputKey: string): string | null{
    if(typeof cookie !== 'string'){ return null }
    const cookies = cookie.replace(/ /g, '').split(';')
    for(let i = 0; i<cookies.length; i++){
        const [key, value] = decodeURIComponent(cookies[i]).split('=')
        if(key === inputKey){return value};
    };
    return null;
};

const sessionTokenExpiration: number = 30; // Time before the Session Token Expires (in Minutes)

export interface getGeneralInfoInterface {
    loggedIn: boolean,
    admin: boolean
}
/**
* 
* @param msg string
* @param API API or Not?
*/
export function resErrorPayload (msg: string, API: boolean = false){
    return API ? { 'status': msg, 'success': false } : UI.errorMSG(msg)
}
export const Authentication = {
    // Functions inside "tools" property are untilities that are used Inside other Functions in this Object
    tools: {
        
    },
    // Main Function for Authentication
    main: async (req: Request | Handshake, res: Response | null, next: NextFunction, options: {API?: boolean, adminOnly?: boolean, returnBool?: boolean}): Promise<void | Response<any, Record<string, any>>|boolean> => {
        try {
            function send(status: number, msg: string){
                return (options.returnBool || !res)? false: res.status(status).send(resErrorPayload(msg, options.API))
            }
            // Verifying Token is Valid
            if (!req.headers.cookie && !req.headers.authorization) { return send(401, "Account Required") }

            const token: string | undefined = (getCookie(req.headers.cookie, 'token') || req.headers.authorization?.toString());
            if (!token) { return send(401, "Invalid Token",) }
            
            // Must Continue with Normal Authentication If AdminOnly because, sessionToken Auth can cause Buggy Behavior If The Account is Deleted on The Database
            if (!options.adminOnly && Authentication.isSessionTokenValid(req)) { return (options.returnBool || !res)? true: next() }

            const decodedToken: accountInterface | null = Accounts.token.validate(token)
            
            if (!decodedToken) { return send(401, "Invalid Token") }
            
            // Finding The User in the Database
            const matchedAccount: accountInterface | undefined = await Accounts.findAccountOne.email(decodedToken.email)
            if (!matchedAccount) { return send(404, "Invalid Token, Account Doesn't Exist") }
            
            // Checking Password
            const isPasswordMatch: boolean = crypto.timingSafeEqual(Buffer.from(decodedToken.password), Buffer.from(matchedAccount.password))
            if (!isPasswordMatch) { return send(401, "Invalid Token") }

            if (!options.API && !options.returnBool && res) {
                // Assigning the User a Session Token if not an API and Not returnBool since it will be used in Web Sockets for Auth
                const sessionTokenPayload: SessionTokenPayload = {
                    'token': token,
                    'ip': (req.headers['x-forwarded-for'] ? (req.headers['x-forwarded-for'] as string).split(',')[0] : ((req as Request).ip || (req as Handshake).address)) as string,
                    'creation': Date.now()
                }
                const expiration: Date = new Date();
                expiration.setMinutes(expiration.getMinutes() + sessionTokenExpiration);

                const sessionToken: string = jwt.sign(sessionTokenPayload, env.ACCOUNTS_SESSION_TOKEN_VERIFICATION_KEY)
                res.cookie('sessionToken', sessionToken, {
                    expires: expiration,
                    httpOnly: true,
                    path: '/',
                    sameSite: 'strict'
                })
            }

            if (options.adminOnly && matchedAccount.role !== 'admin') { return send(401, "Admin Only!") }

            return (options.returnBool || !res)? true: next() // Authentication Passed! (Admin Mode)
        } catch (error) {
            console.error(logPrefix("Error"), error)
            return (options.returnBool || !res)? false: res.status(500).send(resErrorPayload("internal server error!", options.API))
        }
    },
    isSessionTokenValid: (req: Request | Handshake): boolean => {
        try {
            // Checking if Session Token or Token is Missing
            if (!req.headers.cookie) { return false }

            // Token Verification
            const token: string | null = getCookie(req.headers.cookie, 'token');
            if (!token) { return false }
            const decodedToken: accountInterface | null = Accounts.token.validate(token)
            if (!decodedToken) { return false }
            
            const sessionToken: string | null = getCookie(req.headers.cookie, 'sessionToken');
            if (!sessionToken) { return false }
            const decodedSessionToken: SessionTokenPayload | null = Accounts.sessionToken.validate(sessionToken)
            if (!decodedSessionToken) { return false }

            if ((Date.now() - decodedSessionToken.creation) / 1000 > sessionTokenExpiration * 60) { return false }
            const ipAddress: string | undefined = (req as Request).ip || (req as Handshake).address

            if (!ipAddress) { return false }
            if (ipAddress !== decodedSessionToken.ip) { return false }

            // Session Payload Token Verification
            const decodedSessionPayloadToken: accountInterface | null = Accounts.token.validate(token)
            if (!decodedSessionPayloadToken) { return false }

            const isPasswordMatch: boolean = crypto.timingSafeEqual(Buffer.from(decodedToken.password), Buffer.from(decodedSessionPayloadToken.password))
            if (!isPasswordMatch) { return false }

            return true
        } catch (error) {
            console.error(logPrefix("Error"), error)
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
            console.error(logPrefix("Error"), error)
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
            console.error(logPrefix("Error"), error)
            return info
        }
    },
    // Middlewares
    // for Normal Users:
    token: async (req: Request, res: Response, next: NextFunction) => await Authentication.main(req, res, next, {API: false, adminOnly: false}),
    tokenAPI: async (req: Request, res: Response, next: NextFunction) => await Authentication.main(req, res, next, {API: true, adminOnly: false}),
    // for Administrators:
    tokenAdmin: async (req: Request, res: Response, next: NextFunction) => await Authentication.main(req, res, next, {API: false, adminOnly: true}),
    tokenAdminAPI: async (req: Request, res: Response, next: NextFunction) => await Authentication.main(req, res, next, {API: true, adminOnly: true}),
}

export default Authentication