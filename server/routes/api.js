import 'dotenv/config';
import express from 'express';
import { checkPathType, pathExists, getFiles } from '../assets/filesystem.js';
// Built-in Modules
import path from 'path';
import fs from 'fs/promises';
// Local Modules
import { Accounts } from '../assets/database.js';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../assets/config.js';
import logPrefix from '../assets/log.js';
import Authentication, { defaultRole } from '../assets/authentication.js';
import { Stats } from 'fs';
import multer from 'multer';
import { exec, execSync } from 'child_process';
const router = express.Router();
import env from '../assets/env.js';
import { stringify } from 'querystring';
import ROOT from '../assets/root.js';
router.use(bodyParser.urlencoded({ extended: true }));
router.use(cookieParser());
router.use(express.json());
const dirRegex = /[\:\*\?\"\<\>\|]+/g;
const RootdirRegex = /[\*\?\"\<\>\|]+/g;
/**
 * A Function for Generating a Status Response to the Client
 * @param status
 * @param success
 * @returns {'status': string, 'success': boolean}
 * @example res.json(resStatusPayload("Account doesn't exist", false))
 */
export function resStatusPayload(status, success = false) {
    return { 'status': status, 'success': success };
}
String.prototype.sanitizePath = function (fromROOT) {
    const sanitizedString = (fromROOT ? this.replace(RootdirRegex, '') : this.replace(dirRegex, '')).replace(/\.\.+/g, '').replace(/(\/\/+)|(\\+)/g, '/');
    return sanitizedString;
};
String.prototype.sanitizeFileNameForPath = function () {
    const sanitizedString = this.replace(/[\\\/\:\*\?\"\<\>\|]+/g, '');
    return sanitizedString;
};
String.prototype.sanitizeFolderNameForPath = function () {
    const sanitizedString = this.replace(/[\\\/\:\*\?\"\<\>\|\.]+/g, '');
    return sanitizedString;
};
const cloudStorage = multer.diskStorage({
    destination: (req, file, next) => {
        const userId = parseUserID((req.cookies.token || req.headers.authorization), 'u');
        const homeDirectory = path.join(config.databasePath, `/${userId}/`);
        const directory = req.headers.path.toString().sanitizePath();
        // file.size
        const destinationPath = path.join(homeDirectory, directory).sanitizePath(true);
        next(null, destinationPath);
    },
    filename: (req, file, next) => {
        next(null, file.originalname.sanitizeFileNameForPath());
    }
});
const cloudUpload = multer({ storage: cloudStorage });
// Login Submit API
router.post('/submit/login', async (req, res) => {
    // Checking if all the fields are provided
    try {
        if (!req.body.usernameOrEmail && !req.body.password)
            return res.status(406).json(resStatusPayload('please provide all the fields!', false));
        if (!req.body.usernameOrEmail)
            return res.status(406).json(resStatusPayload('please provide a username or email!', false));
        if (!req.body.password)
            return res.status(406).json(resStatusPayload('please provide a password!', false));
    }
    catch (error) {
        if (config.serverConfig.devMode) {
            console.error(logPrefix("error"), error);
        }
        ;
        return res.status(406).json(resStatusPayload('please provide all the fields!', false));
    }
    if (typeof (req.body.usernameOrEmail) === 'object' || typeof (req.body.password) === 'object') {
        console.log(`[Security] a NoSQL Injection Attempt detected at IP: ${req.ip}`);
        return res.status(401).json(resStatusPayload('access denied!', false));
    }
    ;
    const usernameOrEmail = req.body.usernameOrEmail.toString().toLowerCase().replace(/[^a-z | 0-9 | \. | \@ | \+ | \_ | \-]/g, ''); // Sanitizing it
    let matchedAccount;
    // Finding Account based on it's Username or Email
    if (req.body.usernameOrEmail.includes('@')) {
        // if it's an Email:
        const email = usernameOrEmail;
        matchedAccount = await Accounts.findOne.email(email); // The Matched Account
    }
    else {
        // If it's a Username:
        const username = usernameOrEmail.replace(/ \@ | \+ /g, '');
        if (username.length < 4)
            return res.status(406).json(resStatusPayload('username must be atleast 4 characters long!'));
        matchedAccount = await Accounts.findOne.username(username); // The Matched Account
    }
    if (!matchedAccount)
        return res.status(406).json(resStatusPayload("account doesn't exist!"));
    // Checking if the Password is Incorrect
    try {
        const password = req.body.password.toString();
        const isPasswordMatch = await bcrypt.compare(password, matchedAccount.password);
        if (!isPasswordMatch) {
            return res.status(406).json(resStatusPayload('incorrect password!'));
        }
        ;
    }
    catch {
        return res.status(500).json(resStatusPayload('internal Server Error, please try again later...'));
    }
    // on Success:
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    const token = jwt.sign(matchedAccount, env.ACCOUNTS_TOKEN_VERIFICATION_KEY);
    // Giving The User a Token and Returning a Success Reponse
    res.cookie('token', token, {
        expires: expirationDate,
        httpOnly: true,
        path: '/',
        sameSite: 'strict'
    }).status(200).json(resStatusPayload('successful login', true));
    if (matchedAccount.role === 'admin') {
        console.log(logPrefix("Authentication"), `\u001B[31m${matchedAccount.username} (ADMIN)\u001B[0m has logged in.`);
    }
});
// Register Submit API
router.post('/submit/register', async (req, res) => {
    // Checking if any Field is Missing
    if (!req.body.username && !req.body.email && !req.body.password)
        return res.status(406).json(resStatusPayload('please provide all the fields!'));
    if (!req.body.username)
        return res.status(406).json(resStatusPayload('username is required!'));
    if (!req.body.email)
        return res.status(406).json(resStatusPayload('email is required!'));
    if (!req.body.password)
        return res.status(406).json(resStatusPayload('username is required!'));
    // Sanitization
    // Making Sure Username is Available and follows all the rules
    const username = req.body.username.toString().toLowerCase().replace(/[^a-z | 0-9 | \. | \_ | \-]/g, '');
    // add your own username conditions here
    if (!(/[a-z]/.test(username))) {
        return res.status(406).json(resStatusPayload('username must contain atleast one character (a-z)'));
    }
    if (!(await Accounts.isAvailable.username(username))) {
        return res.status(406).json(resStatusPayload('username is occupied!'));
    }
    // Making sure that the Account Doesn't exist
    const email = req.body.email.toString().toLowerCase().replace(/[^a-z | 0-9 | \. | \@ ]/g, '');
    if (!(await Accounts.isAvailable.email(email))) {
        return res.status(406).json(resStatusPayload('account already exists!'));
    }
    const password = req.body.password.toString();
    // Hashing the password
    let hash;
    try {
        const salt = await bcrypt.genSalt(14);
        hash = await bcrypt.hash(password, salt);
    }
    catch (error) {
        return res.status(500).json(resStatusPayload('internal server error!'));
    }
    const hashedPassword = structuredClone(hash);
    const userID = generateUserID();
    const user = {
        username: username,
        email: email,
        password: hashedPassword,
        userID: userID,
        role: (config.serverConfig.firstrun) ? 'admin' : defaultRole,
        emailVerified: false
    };
    // Registering User
    try {
        await Accounts.register(user);
    }
    catch (error) {
        return res.status(500).json(resStatusPayload('internal server error!'));
    }
    // On Success:
    const token = jwt.sign(user, env.ACCOUNTS_TOKEN_VERIFICATION_KEY);
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    res.cookie('token', token, {
        expires: expirationDate,
        httpOnly: true,
        path: '/',
        sameSite: 'strict'
    }).status(201).json(resStatusPayload('Successfully Registered your Account', true));
    console.log(logPrefix("Account"), `Registered new User ${user.username} (${user.role === 'admin' ? "\u001B[31mADMIN\u001B[0m" : user.role})`);
    if (config.serverConfig.firstrun) {
        config.changeConfig('firstrun', false);
    }
});
router.get('/get/account/info', async (req, res) => {
    try {
        res.status(200).json(await Authentication.getGeneralInfo(req, res));
    }
    catch (error) {
        console.log(logPrefix("API"), error);
        res.status(500).json({ loggedIn: false, admin: false });
    }
});
// Cloud Specific
router.get('/cloud/files/:userid', Authentication.tokenAPI, async (req, res) => {
    // Sanitization
    if (!req.params.userid) {
        return res.status(400).send({ 'status': 'please provide userid', 'success': false });
    }
    let userID = parseUserID(req.cookies.token || req.headers.authorization, req.params.userID);
    if (!userID) {
        return res.status(400).send({ 'status': 'invalid user ID', 'success': false });
    }
    const directory = ((req.headers.path ? req.headers.path : '/').toString()).sanitizePath();
    try {
        const homeDirectory = path.join(config.databasePath, `/${userID}/`);
        // Checking if the User Data Directory Exists or Not
        if (!await pathExists(homeDirectory)) {
            await fs.mkdir(homeDirectory);
        }
        if (!await pathExists(path.join(homeDirectory, directory))) {
            return res.status(400).json(resStatusPayload("path doesn't exist!"));
        }
        // The String Returned by the `getFiles` Function is an Error which is meant to be passed to the Client Side
        const files = await getFiles(userID, directory);
        if (typeof files === 'string') {
            return res.status(400).json(resStatusPayload(files));
        }
        res.status(200).json(files);
    }
    catch (error) {
        return res.status(500).json(resStatusPayload("something went wrong!"));
    }
});
router.post('/cloud/files/upload/:userid', Authentication.tokenAPI, missingPathandUserID, cloudUpload.any(), (req, res) => {
    res.status(201).json(resStatusPayload('successfully uploaded your files!', true));
});
// Cloud Actions
// Delete
router.get('/cloud/files/actions/:userid', Authentication.tokenAPI, async (req, res) => {
    // Sanitization
    if (!req.params.userid) {
        return res.status(400).send({ 'status': 'please provide userid', 'success': false });
    }
    let userID;
    try {
        userID = (req.params.userid === 'u') ? jwt.verify((req.cookies.token || req.headers.authorization), env.ACCOUNTS_TOKEN_VERIFICATION_KEY).userID : parseInt(req.params.userid);
    }
    catch (error) {
        return res.status(400).send({ 'status': 'invalid user ID', 'success': false });
    }
    const homeDirectory = path.join(config.databasePath, `/${userID}/`);
    try {
        if (!req.headers.path) {
            return res.status(406).json(resStatusPayload("Path must be Provided"));
        }
        const directory = req.headers.path.toString().sanitizePath();
        const completePath = path.join(homeDirectory, directory);
        if (!completePath.includes(homeDirectory)) {
            return res.status(405).json(resStatusPayload("Not Allowed!"));
        }
        if (await checkPathType(completePath) !== 'file') {
            return res.status(406).json(resStatusPayload("Path must lead to a File!"));
        }
        if (await isSymlinkAndBreaks(completePath, userID)) {
            return res.status(405).json(resStatusPayload("Not Allowed!"));
        }
        res.status(200).sendFile(completePath);
    }
    catch (error) {
        console.log(logPrefix("Cloud"), error);
        return res.status(400).json(resStatusPayload("something went wrong!"));
    }
});
// Delete
router.delete('/cloud/files/actions/:userid', Authentication.tokenAPI, async (req, res) => {
    // Sanitization
    if (!req.params.userid) {
        return res.status(400).send({ 'status': 'please provide userid', 'success': false });
    }
    let userID = parseUserID(req.cookies.token || req.headers.authorization, req.params.userID);
    if (!userID) {
        return res.status(400).send({ 'status': 'invalid user ID', 'success': false });
    }
    const homeDirectory = path.join(config.databasePath, `/${userID}/`);
    if (!req.body.path) {
        return res.status(406).json(resStatusPayload("Path must be Provided"));
    }
    const directory = req.body.path.toString().sanitizePath();
    const completePath = path.join(homeDirectory, directory);
    if (!completePath.includes(homeDirectory)) {
        return res.status(405).json(resStatusPayload("Not Allowed!"));
    }
    const PathType = await checkPathType(completePath);
    if (PathType === 'unknown') {
        return res.status(406).json(resStatusPayload("Path is must be lead to a File/Folder!"));
    }
    try {
        if (PathType === 'file') {
            await fs.unlink(completePath);
        }
        else {
            await fs.rm(completePath, { force: true, recursive: true });
        }
        return res.status(200).json({ 'status': `successfully deleted The ${PathType}!`, 'success': true });
    }
    catch {
        return res.status(400).json({ 'status': "something went wrong", 'success': false });
    }
});
// Copy/Move
router.patch('/cloud/files/actions/:userid', Authentication.tokenAPI, async (req, res) => {
    // Sanitization
    if (!req.params.userid) {
        return res.status(400).send({ 'status': 'please provide userid', 'success': false });
    }
    let userID;
    try {
        userID = (req.params.userid === 'u') ? jwt.verify((req.cookies.token || req.headers.authorization), env.ACCOUNTS_TOKEN_VERIFICATION_KEY).userID : parseInt(req.params.userid);
    }
    catch (error) {
        return res.status(400).send({ 'status': 'invalid user ID', 'success': false });
    }
    if (!req.headers.action) {
        return res.status(406).json(resStatusPayload('An Action must be Provided'));
    }
    const action = req.headers.action.toString();
    if (action !== 'copy' && action !== 'move' && action !== 'create-file' && action !== 'create-folder') {
        return res.status(405).json(resStatusPayload('Invalid Operation!'));
    }
    const homeDirectory = path.join(config.databasePath, `/${userID}/`);
    try {
        if (action === 'copy') {
            // Sanitization
            if (!req.body.from) {
                return res.status(406).json(resStatusPayload("Path must be Provided"));
            }
            if (!req.body.destination) {
                return res.status(406).json(resStatusPayload("Path must be Provided"));
            }
            const fromPath = req.body.from.toString().sanitizePath();
            const fromCompletePath = path.join(homeDirectory, fromPath).sanitizePath(true);
            const destinationPath = req.body.destination.toString().sanitizePath();
            const destinationCompletePath = path.join(homeDirectory, destinationPath).sanitizePath(true);
            if (!fromCompletePath.includes(homeDirectory.sanitizePath(true)) || !destinationCompletePath.includes(homeDirectory.sanitizePath(true))) {
                return res.status(405).json(resStatusPayload("Not Allowed!"));
            }
            const fromPathType = await checkPathType(fromCompletePath);
            const destinationPathType = await checkPathType(destinationCompletePath);
            if (fromPathType !== 'file' && fromPathType !== 'directory') {
                return res.status(406).json(resStatusPayload("Paths is must be lead to a File/Folder!"));
            }
            // Copying It
            try {
                execSync(`cp -r "${fromCompletePath}" "${destinationCompletePath}"`);
                res.status(200).json({ 'status': `successfully copied File/Folder!`, 'success': true });
            }
            catch {
                res.status(400).json(resStatusPayload("Unable to Copy Files!"));
            }
        }
        else if (action === 'move') {
            // Sanitization
            if (!req.body.from) {
                return res.status(406).json(resStatusPayload("Path must be Provided"));
            }
            if (!req.body.destination) {
                return res.status(406).json(resStatusPayload("Path must be Provided"));
            }
            const fromPath = req.body.from.toString().sanitizePath();
            const fromCompletePath = path.join(homeDirectory, fromPath).sanitizePath(true);
            const destinationPath = req.body.destination.toString().sanitizePath();
            const destinationCompletePath = path.join(homeDirectory, destinationPath).sanitizePath(true);
            if (!fromCompletePath.includes(homeDirectory.sanitizePath(true)) || !destinationCompletePath.includes(homeDirectory.sanitizePath(true))) {
                return res.status(405).json(resStatusPayload("Not Allowed!"));
            }
            const fromPathType = await checkPathType(fromCompletePath);
            const destinationPathType = await checkPathType(destinationCompletePath);
            if (fromPathType !== 'file' && fromPathType !== 'directory') {
                return res.status(406).json(resStatusPayload("Paths is must be lead to a File/Folder!"));
            }
            // Moving It
            try {
                await fs.rename(fromCompletePath, destinationCompletePath);
                res.status(200).json({ 'status': 'successfully Moved Your File(s)!', 'success': true });
            }
            catch {
                return res.status(406).json(resStatusPayload("Unable to Move Your Files!"));
            }
        }
    }
    catch (error) {
        return res.status(400).json(resStatusPayload("something went wrong!"));
    }
});
// Create File/Folder
router.post('/cloud/files/actions/:userid', Authentication.tokenAPI, async (req, res) => {
    // Sanitization
    if (!req.params.userid) {
        return res.status(400).send({ 'status': 'please provide userid', 'success': false });
    }
    let userID;
    try {
        userID = (req.params.userid === 'u') ? jwt.verify((req.cookies.token || req.headers.authorization), env.ACCOUNTS_TOKEN_VERIFICATION_KEY).userID : parseInt(req.params.userid);
    }
    catch (error) {
        return res.status(400).send({ 'status': 'invalid user ID', 'success': false });
    }
    if (!req.headers.action) {
        return res.status(406).json(resStatusPayload('An Action must be Provided'));
    }
    const action = req.headers.action.toString();
    if (action !== 'copy' && action !== 'move' && action !== 'create-file' && action !== 'create-folder') {
        return res.status(405).json(resStatusPayload('Invalid Operation!'));
    }
    const homeDirectory = path.join(config.databasePath, `/${userID}/`);
    try {
        if (action === 'create-file') {
            // Sanitization
            if (!req.body.path) {
                return res.status(406).json(resStatusPayload("Path must be Provided"));
            }
            if (!req.body.name) {
                return res.status(406).json(resStatusPayload("a Name must be Provided"));
            }
            const data = Buffer.from(req.body.data ? req.body.data : '');
            const name = req.body.name.toString().sanitizeFileNameForPath();
            if (name.length > config.serverConfig.namesizelimit) {
                return res.status(406).json(resStatusPayload("Name Too Big!"));
            }
            const directory = req.body.path.toString().sanitizePath();
            const completePath = path.join(homeDirectory, directory);
            if (!completePath.includes(homeDirectory)) {
                return res.status(405).json(resStatusPayload("Not Allowed!"));
            }
            const PathType = await checkPathType(completePath);
            if (PathType !== 'directory') {
                return res.status(406).json(resStatusPayload("Path is must be lead to a Folder!"));
            }
            if (await pathExists(path.join(completePath, name))) {
                return res.status(409).json(resStatusPayload("File Already Exists!"));
            }
            fs.writeFile(path.join(completePath, name), data);
            res.status(200).json({ 'status': `successfully created The File!`, 'success': true });
        }
        else if (action === 'create-folder') {
            // Sanitization
            if (!req.body.path) {
                return res.status(406).json(resStatusPayload("Path must be Provided"));
            }
            if (!req.body.name) {
                return res.status(406).json(resStatusPayload("a Name must be Provided"));
            }
            const name = req.body.name.toString().sanitizeFolderNameForPath();
            if (name.length > config.serverConfig.namesizelimit) {
                return res.status(406).json(resStatusPayload("Name Too Big!"));
            }
            const directory = req.body.path.toString().sanitizePath();
            const completePath = path.join(homeDirectory, directory);
            if (!completePath.includes(homeDirectory)) {
                return res.status(405).json(resStatusPayload("Not Allowed!"));
            }
            const PathType = await checkPathType(completePath);
            if (PathType === 'unknown') {
                return res.status(406).json(resStatusPayload("Path is must be lead to a Folder!"));
            }
            if (await pathExists(path.join(completePath, name))) {
                return res.status(409).json(resStatusPayload("Folder Already Exists!"));
            }
            fs.mkdir(path.join(completePath, name));
            res.status(200).json({ 'status': `successfully created The Folder!`, 'success': true });
        }
    }
    catch (error) {
        console.log(logPrefix("Cloud"), error);
        return res.status(400).json(resStatusPayload("something went wrong!"));
    }
});
// General
router.get('/u/info/userid', Authentication.tokenAPI, (req, res) => {
    try {
        const userID = parseUserID(req.cookies.token || req.headers.authorization, 'u');
        res.status(200).json({ 'userID': userID });
    }
    catch (error) {
        console.log(logPrefix("API"), error);
        res.status(500).send(resStatusPayload('internal server error!'));
    }
});
router.get('/get/admin-dashboard-url', Authentication.tokenAdminAPI, (req, res) => {
    res.status(200).send({ data: `/${env.ADMIN_PAGE_URL}` });
});
router.post(`/${env.ADMIN_PAGE_URL}`, Authentication.tokenAdminAPI, (req, res) => {
    const page = req.query.page;
    if (!page) {
        return res.status(404).json(resStatusPayload("Unknown Page for Action"));
    }
    if (!req.headers.action) {
        return res.status(405).json(resStatusPayload("Unknown Action"));
    }
    ;
    const action = req.headers.action.toString();
    switch (page) {
        case 'console':
            return res.status(200).json();
            break;
        default:
            return res.status(404).json(resStatusPayload("Unknown Page for Action"));
            break;
    }
});
function parseUserID(token, userID) {
    try {
        if (!(/[^1-9]/g).test(userID) && (/[1-9]{11}/g).test(userID)) {
            return parseInt(userID);
        }
        return jwt.verify(token, env.ACCOUNTS_TOKEN_VERIFICATION_KEY).userID;
    }
    catch (error) {
        return null;
    }
}
// Custom Middlwares
async function missingPathandUserID(req, res, next) {
    const token = (req.cookies.token || req.headers.authorization).toString();
    if (!req.params.userid) {
        return res.status(400).send({ 'status': 'please provide userid', 'success': false });
    }
    let userId;
    try {
        userId = (req.params.userid === 'u') ? Accounts.token.validate(token).userID : parseInt(req.params.userid);
    }
    catch (error) {
        return res.status(400).send({ 'status': 'invalid user ID', 'success': false });
    }
    if (!req.headers.path) {
        return res.status(406).json(resStatusPayload("Path must be Provided"));
    }
    const inputPath = req.headers.path.toString();
    const homeDirectory = path.join(config.databasePath, `/${userId}/`);
    const completeInputPath = path.join(homeDirectory, inputPath);
    if (!await pathExists(completeInputPath)) {
        return res.status(406).json(resStatusPayload("Invalid Path"));
    }
    if (!completeInputPath.includes(homeDirectory)) {
        return res.status(406).json(resStatusPayload("Path Escapes"));
    }
    next();
}
async function isSymlinkAndBreaks(symlinkPath, userID) {
    try {
        const homeDirectory = path.join(config.databasePath, `/${userID}/`);
        const stats = await fs.lstat(symlinkPath);
        if (!stats.isSymbolicLink()) {
            return false;
        }
        const link = path.resolve(await fs.readlink(symlinkPath));
        if (link.includes(homeDirectory)) {
            return false;
        }
        return true;
    }
    catch (error) {
        console.error(logPrefix('error'), error);
        return false;
    }
}
// Functions
function generateUserID() {
    const minID = 1000000000;
    const maxID = 9999999999;
    let userID = Math.floor(Math.random() * (maxID - minID + 1)) + minID;
    // Check if the generated userID already exists in the database
    if (!Accounts.findOne.userID(userID)) {
        return generateUserID(); // Recursively generate new userID
    }
    return userID; // Return the unique userID
}
export default router;
