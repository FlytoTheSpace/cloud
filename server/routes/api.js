import 'dotenv/config';
import express from 'express';
// Built-in Modules
import path from 'path';
// Local Modules
import ROOT from '../assets/root.js';
import { logMSG } from '../assets/utils.js';
import { Accounts } from '../assets/database.js';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../assets/config.js';
import logPrefix from '../assets/log.js';
const router = express.Router();
router.use(bodyParser.urlencoded({ extended: true }));
router.use(cookieParser());
router.use(express.json());
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
        return res.status(401).json({ 'status': 'access denied', 'success': false });
    }
    ;
    const usernameOrEmail = req.body.usernameOrEmail.toString().toLowerCase().replace(/[^a-z | 0-9 | \. | \@ ]/g, ''); // Sanitizing it
    let matchedAccount;
    // Finding Account based on it's Username or Email
    if (req.body.usernameOrEmail.includes('@')) {
        // if it's an Email:
        const email = usernameOrEmail;
        matchedAccount = await Accounts.findAccountOne.email(email); // The Matched Account
    }
    else {
        // If it's a Username:
        const username = usernameOrEmail.replace(/\@/g, '');
        if (username.length < 4)
            return res.status(406).json({ 'status': 'invalid username', 'success': false });
        matchedAccount = await Accounts.findAccountOne.username(username); // The Matched Account
    }
    if (!matchedAccount)
        return res.status(406).json({ 'status': "account doesn't exist!", 'success': false });
    // Checking Paswsword
    try {
        const password = req.body.password.toString();
        const isPasswordMatch = await bcrypt.compare(password, matchedAccount.password);
        if (isPasswordMatch) {
            const expirationDate = new Date();
            expirationDate.setFullYear(expirationDate.getFullYear() + 1);
            const token = jwt.sign(matchedAccount, process.env.ACCOUNTS_TOKEN_VERIFICATION_KEY);
            // Giving The User a Token and Returning a Success Reponse
            res.cookie('token', token, {
                expires: expirationDate,
                httpOnly: true,
                path: '/',
                sameSite: 'strict'
            }).status(201).json({ 'status': 'successful login', 'success': true });
        }
        else {
            res.status(406).json({ 'status': 'incorrect password', 'success': false });
        }
    }
    catch {
        res.status(500).json({ 'status': 'internal Server Error, please try again later...', 'success': false });
    }
});
router.post('/submit/register', async (req, res) => {
    // Checking if any Field is Missing
    try {
        if (!req.body.username && !req.body.email && !req.body.password)
            return res.status(406).json({ 'status': 'please provide all the fields!', 'success': false });
        if (!req.body.username)
            return res.status(406).json({ 'status': 'username is required!', 'success': false });
        if (!req.body.email)
            return res.status(406).json({ 'status': 'email is required!', 'success': false });
        if (!req.body.password)
            return res.status(406).json({ 'status': 'username is required!', 'success': false });
    }
    catch (error) {
        if (config.serverConfig.devMode) {
            console.log(logPrefix("API"), error);
        }
        ;
        return res.status(406).json({ 'status': 'something went wrong!', 'success': false });
    }
    if (typeof (req.body.username) === 'object' || typeof (req.body.email) === 'object' || typeof (req.body.password) === 'object') {
        console.log(`[Security] a NoSQL Injection Attempt detected at IP: ${req.ip}`);
        return res.status(401).json({ 'status': 'access denied', 'success': false });
    }
    ;
    // Sanitizing Them
    const username = req.body.username.toString().toLowerCase().replace(/[^a-z | 0-9 | \.]/g, '');
    if (!(/[a-z]/.test(username))) {
        return res.status(406).json({ 'status': 'username must contain atleast one character', 'success': false });
    }
    const email = req.body.email.toString().toLowerCase().replace(/[^a-z | 0-9 | \. | \@ ]/g, '');
    const password = req.body.password.toString();
    // Generating a Hash
    let hash;
    try {
        const salt = await bcrypt.genSalt(14);
        hash = await bcrypt.hash(password, salt);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ 'status': 'internal server error', 'success': false });
    }
    const hashedPassword = structuredClone(hash);
    const userID = generateUserID();
    const user = {
        username: username,
        email: email,
        password: hashedPassword,
        userID: userID,
        role: 'member',
        emailVerified: false
    };
    console.log(user);
});
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
