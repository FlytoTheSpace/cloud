import 'dotenv/config'
import express, { NextFunction, Request, Response } from 'express'
import {Actions, FileObject, FileSystemTypes, checkPathType, pathExists, getFiles} from '../assets/filesystem.js'
// Built-in Modules
import path from 'path'
import fs from 'fs/promises'
// Local Modules
import { logMSG } from '../assets/utils.js';
import { Accounts, accountInterface } from '../assets/database.js';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import config from '../assets/config.js'
import logPrefix from '../assets/log.js';
import Authentication, { defaultRole } from '../assets/authentication.js';
import { Stats } from 'fs'
import multer from 'multer'
import { exec, execSync } from 'child_process';
import { buffer } from 'stream/consumers';
const router = express.Router()

router.use(bodyParser.urlencoded({ extended: true }));
router.use(cookieParser());
router.use(express.json());

const dirRegex: RegExp = /[\:\*\?\"\<\>\|]+/g;
const RootdirRegex: RegExp = /[\*\?\"\<\>\|]+/g;

declare global {
    interface String {
        sanitizePath(fromROOT?: boolean): string;
        sanitizeFileNameForPath(): string
        sanitizeFolderNameForPath(): string
    }
}
/**
 * A Function for Generating a Status Response to the Client
 * @param status 
 * @param success 
 * @returns {'status': string, 'success': boolean}
 * @example res.json(resStatusPayload("Account doesn't exist", false))
 */
function resStatusPayload (status: string, success: boolean = false): { status: string; success: boolean; }{
    return {'status': status, 'success': success}
}

String.prototype.sanitizePath = function (fromROOT?: boolean) {
    const sanitizedString: string = (fromROOT ? this.replace(RootdirRegex, '') : this.replace(dirRegex, '')).replace(/\.\.+/g, '').replace(/(\/\/+)|(\\+)/g, '/')
    return sanitizedString;
}
String.prototype.sanitizeFileNameForPath = function () {
    const sanitizedString: string = this.replace(/[\\\/\:\*\?\"\<\>\|]+/g, '')
    return sanitizedString;
}
String.prototype.sanitizeFolderNameForPath = function () {
    const sanitizedString: string = this.replace(/[\\\/\:\*\?\"\<\>\|\.]+/g, '')
    return sanitizedString;
}

const cloudStorage = multer.diskStorage({
    destination: (req: Request, file, next) => {
        const userId: number = (req.params.userid === 'u') ? (jwt.verify(req.cookies.token, (process.env.ACCOUNTS_TOKEN_VERIFICATION_KEY as string)) as accountInterface).userID : parseInt(req.params.userid);

        const directory = ((req.headers.path as any).toString() as string).sanitizePath()
        const destinationPath = path.join(config.databasePath, `/${userId}/`, directory)
        next(null, destinationPath);
    },
    filename: (req, file, next) => {
        next(null, file.originalname)
    }
})

const cloudUpload = multer({ storage: cloudStorage })

// Login Submit API
router.post('/submit/login', async (req, res) => {

    // Checking if all the fields are provided
    try {
        if (!req.body.usernameOrEmail && !req.body.password) return res.status(406).json(resStatusPayload('please provide all the fields!', false));
        if (!req.body.usernameOrEmail) return res.status(406).json(resStatusPayload('please provide a username or email!', false));
        if (!req.body.password) return res.status(406).json(resStatusPayload('please provide a password!', false));
    } catch (error) {
        if (config.serverConfig.devMode) { console.log(logPrefix("API"), error); };
        return res.status(406).json(resStatusPayload('please provide all the fields!', false));
    }

    if (typeof (req.body.usernameOrEmail) === 'object' || typeof (req.body.password) === 'object') {
        console.log(`[Security] a NoSQL Injection Attempt detected at IP: ${req.ip}`)
        return res.status(401).json(resStatusPayload('access denied!', false));
    };

    const usernameOrEmail: string = req.body.usernameOrEmail.toString().toLowerCase().replace(/[^a-z | 0-9 | \. | \@ | \+ ]/g, ''); // Sanitizing it

    let matchedAccount: accountInterface | undefined;

    // Finding Account based on it's Username or Email
    if (req.body.usernameOrEmail.includes('@')) {
        // if it's an Email:
        const email: string = usernameOrEmail
        matchedAccount = await Accounts.findAccountOne.email(email); // The Matched Account

    } else {
        // If it's a Username:
        const username: string = usernameOrEmail.replace(/ \@ | \+ /g, '');

        if (username.length < 4) return res.status(406).json(resStatusPayload('invalid username!'));

        matchedAccount = await Accounts.findAccountOne.username(username); // The Matched Account
    }
    if (!matchedAccount) return res.status(406).json(resStatusPayload("account doesn't exist!"));


    // Checking if the Password is Incorrect
    try {
        const password: string = req.body.password.toString()
        const isPasswordMatch: boolean = await bcrypt.compare(password, matchedAccount.password)

        if (!isPasswordMatch) { return res.status(406).json(resStatusPayload('incorrect password!')) };
    } catch {
        return res.status(500).json(resStatusPayload('internal Server Error, please try again later...'))
    }

    // on Success:
    console.log(`[Authentication] ${matchedAccount.username} has logged in.`)
    const expirationDate: Date = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);

    const token: string = jwt.sign(matchedAccount, (process.env.ACCOUNTS_TOKEN_VERIFICATION_KEY as string))

    // Giving The User a Token and Returning a Success Reponse
    res.cookie('token', token, {
        expires: expirationDate,
        httpOnly: true,
        path: '/',
        sameSite: 'strict'
    }).status(200).json(resStatusPayload('successful login', true))

})
// Register Submit API
router.post('/submit/register', async (req, res) => {

    // Checking if any Field is Missing
    if (!req.body.username && !req.body.email && !req.body.password) return res.status(406).json(resStatusPayload('please provide all the fields!'));
    if (!req.body.username) return res.status(406).json(resStatusPayload('username is required!'));
    if (!req.body.email) return res.status(406).json(resStatusPayload('email is required!'));
    if (!req.body.password) return res.status(406).json(resStatusPayload('username is required!'));

    // Sanitization

    // Making Sure Username is Available and follows all the rules
    const username: string = req.body.username.toString().toLowerCase().replace(/[^a-z | 0-9 | \.]/g, '');
    // add your own username conditions here
    if (!(/[a-z]/.test(username))) { return res.status(406).json(resStatusPayload('username must contain atleast one character (a-z)')); }
    if (!(await Accounts.isAvailable.username(username))) { return res.status(406).json(resStatusPayload('username is occupied!')); }

    // Making sure that the Account Doesn't exist
    const email: string = req.body.email.toString().toLowerCase().replace(/[^a-z | 0-9 | \. | \@ ]/g, '');
    if (!(await Accounts.isAvailable.email(email))) { return res.status(406).json(resStatusPayload('account already exists!')); }

    const password: string = req.body.password.toString();

    // Hashing the password
    let hash: string;
    try {
        const salt: string = await bcrypt.genSalt(14)
        hash = await bcrypt.hash(password, salt)
    } catch (error) {
        return res.status(500).json(resStatusPayload('internal server error!'));
    }

    const hashedPassword: string = structuredClone(hash)
    const userID: number = generateUserID()
    const user = {
        username: username,
        email: email,
        password: hashedPassword,
        userID: userID,
        role: defaultRole,
        emailVerified: false
    }
    // Registering User
    try {
        await Accounts.register(user)
    } catch (error) {
        return res.status(500).json(resStatusPayload('internal server error!'));
    }

    // On Success:
    const token: string = jwt.sign(user, (process.env.ACCOUNTS_TOKEN_VERIFICATION_KEY as string));

    const expirationDate: Date = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);

    res.cookie('token', token, {
        expires: expirationDate,
        httpOnly: true,
        path: '/',
        sameSite: 'strict'
    }).status(201).json(resStatusPayload('Successfully Registered your Account', true))
})
router.get('/get/account/info', async (req, res) => {
    try {
        res.status(200).json(await Authentication.getGeneralInfo(req))
    } catch (error) {
        console.log(error)
        res.status(500).json({ loggedIn: false, admin: false })
    }
})
// Cloud Specific
router.get('/cloud/files/:userid', Authentication.tokenAPI, async (req, res) => {

    // Sanitization
    if (!req.params.userid) { return res.status(400).send({ 'status': 'please provide userid', 'success': false }) }
    let userID: number;
    try {
        userID = (req.params.userid === 'u') ? (jwt.verify(req.cookies.token, (process.env.ACCOUNTS_TOKEN_VERIFICATION_KEY as string)) as accountInterface).userID : parseInt(req.params.userid);
    } catch (error) { return res.status(400).send({ 'status': 'invalid user ID', 'success': false }) }

    const directory: string = ((req.headers.path ? req.headers.path : '/').toString()).sanitizePath()

    try {
        // Checking if the Directory Exists or Not
        if (!await pathExists(path.join(config.databasePath, `/${userID}/`))) { await fs.mkdir(path.join(config.databasePath, `/${userID}/`)) }

        const filesObject: FileObject[] = await getFiles(userID, directory)
        res.status(200).json(filesObject)
    } catch (error) {
        return res.status(500).json(resStatusPayload("something went wrong!"))
    }
})
router.post('/cloud/files/upload/:userid', Authentication.tokenAPI, missingPathandUserID, cloudUpload.any(), (req, res) => {
    res.status(201).json(resStatusPayload('successfully uploaded your files!', true))
})
router.post('/cloud/files/actions/:userid', Authentication.tokenAPI, async (req, res) => {
    // Sanitization
    if (!req.params.userid) { return res.status(400).send({ 'status': 'please provide userid', 'success': false }) }
    let userID: number;
    try {
        userID = (req.params.userid === 'u') ? (jwt.verify(req.cookies.token, (process.env.ACCOUNTS_TOKEN_VERIFICATION_KEY as string)) as accountInterface).userID : parseInt(req.params.userid);
    } catch (error) { return res.status(400).send({ 'status': 'invalid user ID', 'success': false }) }

    if (!req.headers.action) { return res.status(406).json(resStatusPayload('An Action must be Provided')) }

    const action: string = req.headers.action.toString()

    if (action !== 'open' && action !== 'copy' && action !== 'move' && action !== 'delete' && action !== 'create-file' && action !== 'create-folder') { return res.status(405).json(resStatusPayload('Invalid Operation!')) }

    try {
        if (action === 'open') {
            // Sanitization
            if (!req.body.path) { return res.status(406).json(resStatusPayload("Path must be Provided")) }

            const directory: string = req.body.path.toString().sanitizePath()
            const completePath = path.join(config.databasePath, `/${userID}/`, directory)
            if (!completePath.includes(config.databasePath)) { return res.status(405).json(resStatusPayload("Not Allowed!")) }
            if (await checkPathType(completePath) !== 'file') { return res.status(406).json(resStatusPayload("Path must lead to a File!")) }

            res.status(200).sendFile(completePath)
        } else if (action === 'copy') {
            // Sanitization
            if (!req.body.from) { return res.status(406).json(resStatusPayload("Path must be Provided")) }
            if (!req.body.destination) { return res.status(406).json(resStatusPayload("Path must be Provided")) }

            const fromPath: string = req.body.from.toString().sanitizePath()
            const fromCompletePath: string = path.join(config.databasePath, `/${userID}/`, fromPath).sanitizePath(true)
            const destinationPath: string = req.body.destination.toString().sanitizePath()
            const destinationCompletePath: string = path.join(config.databasePath, `/${userID}/`, destinationPath).sanitizePath(true)

            if (!fromCompletePath.includes(config.databasePath.sanitizePath(true)) || !destinationCompletePath.includes(config.databasePath.sanitizePath(true))) { return res.status(405).json(resStatusPayload("Not Allowed!")) }

            const fromPathType: FileSystemTypes = await checkPathType(fromCompletePath)
            const destinationPathType: FileSystemTypes = await checkPathType(destinationCompletePath)

            if (fromPathType !== 'file' && fromPathType !== 'directory') {
                return res.status(406).json(resStatusPayload("Paths is must be lead to a File/Folder!"))
            }
            // Copying It
            try {
                execSync(`cp -r "${fromCompletePath}" "${destinationCompletePath}"`)
                res.status(200).json({ 'status': `successfully copied File/Folder!`, 'success': false })
            } catch {
                res.status(400).json(resStatusPayload("Unable to Copy Files!"))
            }

        } else if (action === 'move') {
            // Sanitization
            if (!req.body.from) { return res.status(406).json(resStatusPayload("Path must be Provided")) }
            if (!req.body.destination) { return res.status(406).json(resStatusPayload("Path must be Provided")) }

            const fromPath: string = req.body.from.toString().sanitizePath()
            const fromCompletePath: string = path.join(config.databasePath, `/${userID}/`, fromPath).sanitizePath(true)
            const destinationPath: string = req.body.destination.toString().sanitizePath()
            const destinationCompletePath: string = path.join(config.databasePath, `/${userID}/`, destinationPath).sanitizePath(true)

            if (!fromCompletePath.includes(config.databasePath.sanitizePath(true)) || !destinationCompletePath.includes(config.databasePath.sanitizePath(true))) { return res.status(405).json(resStatusPayload("Not Allowed!")) }

            const fromPathType: FileSystemTypes = await checkPathType(fromCompletePath)
            const destinationPathType: FileSystemTypes = await checkPathType(destinationCompletePath)

            if (fromPathType !== 'file' && fromPathType !== 'directory') {
                return res.status(406).json(resStatusPayload("Paths is must be lead to a File/Folder!"))
            }
            // Moving It
            try {
                await fs.rename(fromCompletePath, destinationCompletePath)

                res.status(200).json({ 'status': 'successfully Moved Your File(s)!', 'success': false })
            } catch {
                return res.status(406).json(resStatusPayload("Unable to Move Your Files!"))
            }

        } else if (action === 'delete') {
            // Sanitization
            if (!req.body.path) { return res.status(406).json(resStatusPayload("Path must be Provided")) }

            const directory: string = req.body.path.toString().sanitizePath()
            const completePath: string = path.join(config.databasePath, `/${userID}/`, directory)

            if (!completePath.includes(config.databasePath)) { return res.status(405).json(resStatusPayload("Not Allowed!")) }

            const PathType: FileSystemTypes = await checkPathType(completePath)

            if (PathType === 'unknown') { return res.status(406).json(resStatusPayload("Path is must be lead to a File/Folder!")) }

            if (PathType === 'file') {
                await fs.unlink(completePath)
            } else {
                await fs.rm(completePath, { force: true, recursive: true })
            }

            res.status(200).json({ 'status': `successfully deleted The ${PathType}!`, 'success': false })
        } else if (action === 'create-file') {
            // Sanitization
            if (!req.body.path) { return res.status(406).json(resStatusPayload("Path must be Provided")) }
            if (!req.body.name) { return res.status(406).json(resStatusPayload("a Name must be Provided")) }
            const data = Buffer.from(req.body.data ? req.body.data : '')

            const name: string = (req.body.name.toString() as string).sanitizeFileNameForPath()
            if (name.length > config.serverConfig.namesizelimit) { return res.status(406).json(resStatusPayload("Name Too Big!")) }

            const directory: string = req.body.path.toString().sanitizePath()
            const completePath: string = path.join(config.databasePath, `/${userID}/`, directory)
            if (!completePath.includes(config.databasePath)) { return res.status(405).json(resStatusPayload("Not Allowed!")) }
            const PathType: FileSystemTypes = await checkPathType(completePath)
            if (PathType !== 'directory') { return res.status(406).json(resStatusPayload("Path is must be lead to a Folder!")) }
            if (await pathExists(path.join(completePath, name))){ return res.status(409).json(resStatusPayload("File Already Exists!"))}

            fs.writeFile(path.join(completePath, name), data)

            res.status(200).json({ 'status': `successfully created The File!`, 'success': false })
        } else if (action === 'create-folder') {
            // Sanitization
            if (!req.body.path) { return res.status(406).json(resStatusPayload("Path must be Provided")) }
            if (!req.body.name) { return res.status(406).json(resStatusPayload("a Name must be Provided")) }

            const name: string = (req.body.name.toString() as string).sanitizeFolderNameForPath()
            if (name.length > config.serverConfig.namesizelimit) { return res.status(406).json(resStatusPayload("Name Too Big!")) }

            const directory: string = req.body.path.toString().sanitizePath()
            const completePath: string = path.join(config.databasePath, `/${userID}/`, directory)
            if (!completePath.includes(config.databasePath)) { return res.status(405).json(resStatusPayload("Not Allowed!")) }
            const PathType: FileSystemTypes = await checkPathType(completePath)
            if (PathType === 'unknown') { return res.status(406).json(resStatusPayload("Path is must be lead to a File/Folder!")) }
            if (await pathExists(path.join(completePath, name))){ return res.status(409).json(resStatusPayload("Folder Already Exists!"))}

            fs.mkdir(path.join(completePath, name))

            res.status(200).json({ 'status': `successfully created The File!`, 'success': false })
        }
    } catch (error) {
        console.log(error)
        return res.status(400).json(resStatusPayload("something went wrong!"))
    }
})
router.get('/u/info/userid', Authentication.tokenAPI, (req, res) => {
    try {
        if (!req.cookies.token) { res.status(200).json({ 'userID': null }) }
        const userID: number = (jwt.verify(req.cookies.token, (process.env.ACCOUNTS_TOKEN_VERIFICATION_KEY as string)) as accountInterface).userID

        res.status(200).json({ 'userID': userID })
    } catch (error) {
        console.log(error)
        res.status(500).send(resStatusPayload('internal server error!'))
    }
})

// Custom Middlwares
async function missingPathandUserID(req: Request, res: Response, next: NextFunction) {
    
    if (!req.params.userid) { return res.status(400).send({ 'status': 'please provide userid', 'success': false }) }
    try {
        (req.params.userid === 'u') ? (jwt.verify(req.cookies.token, (process.env.ACCOUNTS_TOKEN_VERIFICATION_KEY as string)) as accountInterface).userID : parseInt(req.params.userid);
    } catch (error) { return res.status(400).send({ 'status': 'invalid user ID', 'success': false }) }
    
    if (!req.headers.path) { return res.status(406).json(resStatusPayload("Path must be Provided")) }
    
    if(await pathExists(path.join(config.databasePath, (req.headers.path.toString()).sanitizePath()))){
        return res.status(406).json(resStatusPayload("File Already Exists"))
    }
    
    next();
}
// Functions
function generateUserID(): number {
    const minID: number = 1000000000;
    const maxID: number = 9999999999;

    let userID: number = Math.floor(Math.random() * (maxID - minID + 1)) + minID;

    // Check if the generated userID already exists in the database
    if (!Accounts.findAccountOne.userID(userID)) {
        return generateUserID(); // Recursively generate new userID
    } else {
        return userID; // Return the unique userID
    }
}

export default router