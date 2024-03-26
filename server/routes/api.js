import 'dotenv/config';
import express from 'express';
// Built-in Modules
import path from 'path';
import fs from 'fs/promises';
// Local Modules
import { logMSG } from '../assets/utils.js';
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
router.use(bodyParser.urlencoded({ extended: true }));
router.use(cookieParser());
router.use(express.json());
const dirRegex = /[\:\*\?\"\<\>\|]+/g;
const RootdirRegex = /[\*\?\"\<\>\|]+/g;
String.prototype.sanitizeForPath = function (fromROOT) {
    const sanitizedString = (fromROOT ? this.replace(RootdirRegex, '') : this.replace(dirRegex, '')).replace(/\.\.+/g, '').replace(/(\/\/+)|(\\+)/g, '/');
    return sanitizedString;
};
const cloudStorage = multer.diskStorage({
    destination: (req, file, next) => {
        const userId = (req.params.userid === 'u') ? jwt.verify(req.cookies.token, process.env.ACCOUNTS_TOKEN_VERIFICATION_KEY).userID : parseInt(req.params.userid);
        const directory = req.headers.path.toString().sanitizeForPath();
        const destinationPath = path.join(config.databasePath, `/${userId}/`, directory);
        next(null, destinationPath);
    },
    filename: (req, file, next) => {
        next(null, file.originalname);
    }
});
const cloudUpload = multer({ storage: cloudStorage });
// Login Submit API
router.post('/submit/login', async (req, res) => {
    // Checking if all the fields are provided
    try {
        if (!req.body.usernameOrEmail && !req.body.password)
            return res.status(406).json({ 'status': 'please provide all the fields!', 'success': false });
        if (!req.body.usernameOrEmail)
            return res.status(406).json({ 'status': 'please provide a username or email!', 'success': false });
        if (!req.body.password)
            return res.status(406).json({ 'status': 'please provide a password!', 'success': false });
    }
    catch (error) {
        if (config.serverConfig.devMode) {
            console.log(logPrefix("API"), error);
        }
        ;
        return res.status(406).json({ 'status': 'please provide all the fields!', 'success': false });
    }
    if (typeof (req.body.usernameOrEmail) === 'object' || typeof (req.body.password) === 'object') {
        console.log(`[Security] a NoSQL Injection Attempt detected at IP: ${req.ip}`);
        return res.status(401).json({ 'status': 'access denied!', 'success': false });
    }
    ;
    const usernameOrEmail = req.body.usernameOrEmail.toString().toLowerCase().replace(/[^a-z | 0-9 | \. | \@ | \+ ]/g, ''); // Sanitizing it
    let matchedAccount;
    // Finding Account based on it's Username or Email
    if (req.body.usernameOrEmail.includes('@')) {
        // if it's an Email:
        const email = usernameOrEmail;
        matchedAccount = await Accounts.findAccountOne.email(email); // The Matched Account
    }
    else {
        // If it's a Username:
        const username = usernameOrEmail.replace(/ \@ | \+ /g, '');
        if (username.length < 4)
            return res.status(406).json({ 'status': 'invalid username!', 'success': false });
        matchedAccount = await Accounts.findAccountOne.username(username); // The Matched Account
    }
    if (!matchedAccount)
        return res.status(406).json({ 'status': "account doesn't exist!", 'success': false });
    // Checking if the Password is Incorrect
    try {
        const password = req.body.password.toString();
        const isPasswordMatch = await bcrypt.compare(password, matchedAccount.password);
        if (!isPasswordMatch) {
            return res.status(406).json({ 'status': 'incorrect password!', 'success': false });
        }
        ;
    }
    catch {
        return res.status(500).json({ 'status': 'internal Server Error, please try again later...', 'success': false });
    }
    // on Success:
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    const token = jwt.sign(matchedAccount, process.env.ACCOUNTS_TOKEN_VERIFICATION_KEY);
    // Giving The User a Token and Returning a Success Reponse
    res.cookie('token', token, {
        expires: expirationDate,
        httpOnly: true,
        path: '/',
        sameSite: 'strict'
    }).status(200).json({ 'status': 'successful login', 'success': true });
});
router.post('/submit/register', async (req, res) => {
    // Checking if any Field is Missing
    if (!req.body.username && !req.body.email && !req.body.password)
        return res.status(406).json({ 'status': 'please provide all the fields!', 'success': false });
    if (!req.body.username)
        return res.status(406).json({ 'status': 'username is required!', 'success': false });
    if (!req.body.email)
        return res.status(406).json({ 'status': 'email is required!', 'success': false });
    if (!req.body.password)
        return res.status(406).json({ 'status': 'username is required!', 'success': false });
    // Sanitization
    // Making Sure Username is Available and follows all the rules
    const username = req.body.username.toString().toLowerCase().replace(/[^a-z | 0-9 | \.]/g, '');
    // add your own username conditions here
    if (!(/[a-z]/.test(username))) {
        return res.status(406).json({ 'status': 'username must contain atleast one character (a-z)', 'success': false });
    }
    if (!(await Accounts.isAvailable.username(username))) {
        return res.status(406).json({ 'status': 'username is occupied!', 'success': false });
    }
    // Making sure that the Account Doesn't exist
    const email = req.body.email.toString().toLowerCase().replace(/[^a-z | 0-9 | \. | \@ ]/g, '');
    if (!(await Accounts.isAvailable.email(email))) {
        return res.status(406).json({ 'status': 'account already exists!', 'success': false });
    }
    const password = req.body.password.toString();
    // Hashing the password
    let hash;
    try {
        const salt = await bcrypt.genSalt(14);
        hash = await bcrypt.hash(password, salt);
    }
    catch (error) {
        return res.status(500).json({ 'status': 'internal server error!', 'success': false });
    }
    const hashedPassword = structuredClone(hash);
    const userID = generateUserID();
    const user = {
        username: username,
        email: email,
        password: hashedPassword,
        userID: userID,
        role: defaultRole,
        emailVerified: false
    };
    // Registering User
    try {
        await Accounts.register(user);
    }
    catch (error) {
        return res.status(500).json({ 'status': 'internal server error!', 'success': false });
    }
    // On Success:
    const token = jwt.sign(user, process.env.ACCOUNTS_TOKEN_VERIFICATION_KEY);
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    res.cookie('token', token, {
        expires: expirationDate,
        httpOnly: true,
        path: '/',
        sameSite: 'strict'
    }).status(201).json({ 'status': 'successfully registered your Account1', 'success': true });
});
router.get('/get/account/info', async (req, res) => {
    try {
        res.status(200).json(await Authentication.getGeneralInfo(req));
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ loggedIn: false, admin: false });
    }
});
router.get('/cloud/files/:userid', Authentication.tokenAPI, async (req, res) => {
    // Sanitization
    if (!req.params.userid) {
        return res.status(400).send({ 'status': 'please provide userid', 'success': false });
    }
    let userID;
    try {
        userID = (req.params.userid === 'u') ? jwt.verify(req.cookies.token, process.env.ACCOUNTS_TOKEN_VERIFICATION_KEY).userID : parseInt(req.params.userid);
    }
    catch (error) {
        return res.status(400).send({ 'status': 'invalid user ID', 'success': false });
    }
    const directory = ((req.headers.path ? req.headers.path : '/').toString()).sanitizeForPath();
    try {
        // Checking if the Directory Exists or Not
        if (!await dirExists(path.join(config.databasePath, `/${userID}/`))) {
            await fs.mkdir(path.join(config.databasePath, `/${userID}/`));
        }
        const filesObject = await getFiles(userID, directory);
        res.status(200).json(filesObject);
    }
    catch (error) {
        return res.status(400).json(Authentication.tools.resErrorPayload("Bad Request", true));
    }
});
router.post('/cloud/files/upload/:userid', Authentication.tokenAPI, missingPathandUserID, cloudUpload.any(), (req, res) => {
    res.status(201).json({ 'status': 'successfully uploaded your files!', 'success': true });
});
router.get('/cloud/files/actions/:userid', Authentication.tokenAPI, async (req, res) => {
    // Sanitization
    if (!req.params.userid) {
        return res.status(400).send({ 'status': 'please provide userid', 'success': false });
    }
    let userID;
    try {
        userID = (req.params.userid === 'u') ? jwt.verify(req.cookies.token, process.env.ACCOUNTS_TOKEN_VERIFICATION_KEY).userID : parseInt(req.params.userid);
    }
    catch (error) {
        return res.status(400).send({ 'status': 'invalid user ID', 'success': false });
    }
    if (!req.headers.action) {
        return res.status(406).json(Authentication.tools.resErrorPayload("An Action must be Provided", true));
    }
    const action = req.headers.action.toString();
    if (action !== "open" && action !== "copy" && action !== "move" && action !== "delete") {
        return res.status(405).json(Authentication.tools.resErrorPayload("Invalid Operation!", true));
    }
    try {
        if (action === 'open') {
            // Sanitization
            if (!req.headers.path) {
                return res.status(406).json(Authentication.tools.resErrorPayload("Path must be Provided", true));
            }
            const directory = req.headers.path.toString().sanitizeForPath();
            const completePath = path.join(config.databasePath, `/${userID}/`, directory);
            if (!completePath.includes(config.databasePath)) {
                return res.status(405).json(Authentication.tools.resErrorPayload("Not Allowed!", true));
            }
            if (await checkPathType(completePath) !== 'file') {
                return res.status(406).json(Authentication.tools.resErrorPayload("Path is must be lead to a File!", true));
            }
            res.status(200).sendFile(completePath);
        }
        else if (action === 'copy') {
            // Sanitization
            if (!req.headers.from) {
                return res.status(406).json(Authentication.tools.resErrorPayload("Path must be Provided", true));
            }
            if (!req.headers.destination) {
                return res.status(406).json(Authentication.tools.resErrorPayload("Path must be Provided", true));
            }
            const fromPath = req.headers.from.toString().sanitizeForPath();
            const fromCompletePath = path.join(config.databasePath, `/${userID}/`, fromPath).sanitizeForPath(true);
            const destinationPath = req.headers.destination.toString().sanitizeForPath();
            const destinationCompletePath = path.join(config.databasePath, `/${userID}/`, destinationPath).sanitizeForPath(true);
            if (!fromCompletePath.includes(config.databasePath.sanitizeForPath(true)) || !destinationCompletePath.includes(config.databasePath.sanitizeForPath(true))) {
                return res.status(405).json(Authentication.tools.resErrorPayload("Not Allowed!", true));
            }
            const fromPathType = await checkPathType(fromCompletePath);
            const destinationPathType = await checkPathType(destinationCompletePath);
            if (fromPathType !== 'file' && fromPathType !== 'directory') {
                return res.status(406).json(Authentication.tools.resErrorPayload("Paths is must be lead to a File/Folder!", true));
            }
            // Copying It
            try {
                execSync(`cp -r "${fromCompletePath}" "${destinationCompletePath}"`);
                res.status(200).json({ 'status': `successfully copied File/Folder!`, 'success': false });
            }
            catch {
                res.status(400).json(Authentication.tools.resErrorPayload("Unable to Copy Files!", true));
            }
        }
        else if (action === 'move') {
            // Sanitization
            if (!req.headers.from) {
                return res.status(406).json(Authentication.tools.resErrorPayload("Path must be Provided", true));
            }
            if (!req.headers.destination) {
                return res.status(406).json(Authentication.tools.resErrorPayload("Path must be Provided", true));
            }
            const fromPath = req.headers.from.toString().sanitizeForPath();
            const fromCompletePath = path.join(config.databasePath, `/${userID}/`, fromPath).sanitizeForPath(true);
            const destinationPath = req.headers.destination.toString().sanitizeForPath();
            const destinationCompletePath = path.join(config.databasePath, `/${userID}/`, destinationPath).sanitizeForPath(true);
            if (!fromCompletePath.includes(config.databasePath.sanitizeForPath(true)) || !destinationCompletePath.includes(config.databasePath.sanitizeForPath(true))) {
                return res.status(405).json(Authentication.tools.resErrorPayload("Not Allowed!", true));
            }
            const fromPathType = await checkPathType(fromCompletePath);
            const destinationPathType = await checkPathType(destinationCompletePath);
            if (fromPathType !== 'file' && fromPathType !== 'directory') {
                return res.status(406).json(Authentication.tools.resErrorPayload("Paths is must be lead to a File/Folder!", true));
            }
            // Moving It
            try {
                await fs.rename(fromCompletePath, destinationCompletePath);
                res.status(200).json({ 'status': `successfully Moved Your File!`, 'success': false });
            }
            catch {
                return res.status(406).json(Authentication.tools.resErrorPayload("Unable to Move Your Files!", true));
            }
        }
        else if (action === 'delete') {
            // Sanitization
            if (!req.headers.path) {
                return res.status(406).json(Authentication.tools.resErrorPayload("Path must be Provided", true));
            }
            const directory = req.headers.path.toString().sanitizeForPath();
            const completeDir = path.join(config.databasePath, `/${userID}/`, directory);
            if (!completeDir.includes(config.databasePath)) {
                return res.status(405).json(Authentication.tools.resErrorPayload("Not Allowed!", true));
            }
            const PathType = await checkPathType(completeDir);
            if (PathType === 'unknown') {
                return res.status(406).json(Authentication.tools.resErrorPayload("Path is must be lead to a File/Folder!", true));
            }
            if (PathType === 'file') {
                await fs.unlink(completeDir);
            }
            else {
                await fs.rm(completeDir, { force: true, recursive: true });
            }
            res.status(200).json({ 'status': `successfully deleted The ${PathType}!`, 'success': false });
        }
    }
    catch (error) {
        console.log(error);
        return res.status(400).json(Authentication.tools.resErrorPayload("something went wrong!", true));
    }
});
router.get('/u/info/userid', Authentication.tokenAPI, (req, res) => {
    try {
        if (!req.cookies.token) {
            res.status(200).json({ 'userID': null });
        }
        const userID = jwt.verify(req.cookies.token, process.env.ACCOUNTS_TOKEN_VERIFICATION_KEY).userID;
        res.status(200).json({ 'userID': userID });
    }
    catch (error) {
        console.log(error);
        res.status(500).send(Authentication.tools.resErrorPayload("internal server error!", true));
    }
});
function missingPathandUserID(req, res, next) {
    if (!req.params.userid) {
        return res.status(400).send({ 'status': 'please provide userid', 'success': false });
    }
    try {
        (req.params.userid === 'u') ? jwt.verify(req.cookies.token, process.env.ACCOUNTS_TOKEN_VERIFICATION_KEY).userID : parseInt(req.params.userid);
    }
    catch (error) {
        return res.status(400).send({ 'status': 'invalid user ID', 'success': false });
    }
    if (!req.headers.path) {
        return res.status(406).json(Authentication.tools.resErrorPayload("Path must be Provided", true));
    }
    next();
}
async function dirExists(path) {
    try {
        await fs.access(path);
        return true;
    }
    catch (err) {
        if (err.message.includes('no such file or directory')) {
            return false;
        }
        else {
            throw err;
        }
    }
}
async function getFiles(userID, directory) {
    const files = (await fs.readdir(path.join(config.databasePath, `${userID}/`, directory)));
    const filesObject = [];
    for (let i = 0; i < files.length; i++) {
        const filePath = path.join(directory, files[i]).replace(/\\/g, '/');
        const type = await checkPathType(path.join(config.databasePath, `${userID}/`, filePath));
        const fileObject = {
            'name': files[i],
            'path': filePath,
            'type': type
        };
        filesObject[i] = fileObject;
    }
    return filesObject;
}
async function checkPathType(path) {
    try {
        const stats = await fs.lstat(path);
        if (stats.isFile()) {
            return 'file';
        }
        if (stats.isDirectory()) {
            return 'directory';
        }
        return 'unknown';
    }
    catch (err) {
        return 'unknown';
    }
}
function generateUserID() {
    const minID = 1000000000;
    const maxID = 9999999999;
    let userID = Math.floor(Math.random() * (maxID - minID + 1)) + minID;
    // Check if the generated userID already exists in the database
    if (!Accounts.findAccountOne.userID(userID)) {
        return generateUserID(); // Recursively generate new userID
    }
    else {
        return userID; // Return the unique userID
    }
}
export default router;
