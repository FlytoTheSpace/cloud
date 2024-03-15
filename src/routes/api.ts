import 'dotenv/config'
import express from 'express'

// Built-in Modules
import path from 'path'
// Local Modules
import ROOT from '../assets/root.js'
import { logMSG } from '../assets/utils.js';
import { Accounts, accountInterface } from '../assets/database.js';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import config from '../assets/config.js'
import logPrefix from '../assets/log.js';
import Authentication, { defaultRole } from '../assets/authentication.js';
const router = express.Router()

router.use(bodyParser.urlencoded({ extended: true }));
router.use(cookieParser());
router.use(express.json());

// Login Submit API
router.post('/submit/login', async (req, res) => {

    // Checking if all the fields are provided
    try {
        if (!req.body.usernameOrEmail && !req.body.password) return res.status(406).json({ 'status': 'please provide all the fields!', 'success': false });
        if (!req.body.usernameOrEmail) return res.status(406).json({ 'status': 'please provide a username or email!', 'success': false });
        if (!req.body.password) return res.status(406).json({ 'status': 'please provide a password!', 'success': false });
    } catch (error) {
        if (config.serverConfig.devMode) { console.log(logPrefix("API"), error); };
        return res.status(406).json({ 'status': 'please provide all the fields!', 'success': false });
    }

    if (typeof (req.body.usernameOrEmail) === 'object' || typeof (req.body.password) === 'object') {
        console.log(`[Security] a NoSQL Injection Attempt detected at IP: ${req.ip}`)
        return res.status(401).json({ 'status': 'access denied!', 'success': false });
    };

    const usernameOrEmail: string = req.body.usernameOrEmail.toString().toLowerCase().replace(/[^a-z | 0-9 | \. | \@ ]/g, ''); // Sanitizing it

    let matchedAccount;

    // Finding Account based on it's Username or Email
    if (req.body.usernameOrEmail.includes('@')) {
        // if it's an Email:
        const email: string = usernameOrEmail
        matchedAccount = await Accounts.findAccountOne.email(email); // The Matched Account

    } else {
        // If it's a Username:
        const username: string = usernameOrEmail.replace(/\@/g, '');

        if (username.length < 4) return res.status(406).json({ 'status': 'invalid username!', 'success': false });

        matchedAccount = await Accounts.findAccountOne.username(username); // The Matched Account
    }
    if (!matchedAccount) return res.status(406).json({ 'status': "account doesn't exist!", 'success': false });


    // Checking if the Password is Incorrect
    try {
        const password: string = req.body.password.toString()
        const isPasswordMatch: boolean = await bcrypt.compare(password, (matchedAccount.password as string))

        if (!isPasswordMatch) { return res.status(406).json({ 'status': 'incorrect password!', 'success': false }) };
    } catch {
        return res.status(500).json({ 'status': 'internal Server Error, please try again later...', 'success': false })
    }

    // on Success:
    const expirationDate: Date = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);

    const token: string = jwt.sign(matchedAccount, (process.env.ACCOUNTS_TOKEN_VERIFICATION_KEY as string))

    // Giving The User a Token and Returning a Success Reponse
    res.cookie('token', token, {
        expires: expirationDate,
        httpOnly: true,
        path: '/',
        sameSite: 'strict'
    }).status(200).json({ 'status': 'successful login', 'success': true })

})
router.post('/submit/register', async (req, res) => {

    // Checking if any Field is Missing
    if (!req.body.username && !req.body.email && !req.body.password) return res.status(406).json({ 'status': 'please provide all the fields!', 'success': false });
    if (!req.body.username) return res.status(406).json({ 'status': 'username is required!', 'success': false });
    if (!req.body.email) return res.status(406).json({ 'status': 'email is required!', 'success': false });
    if (!req.body.password) return res.status(406).json({ 'status': 'username is required!', 'success': false });

    // Sanitization

    // Making Sure Username is Available and follows all the rules
    const username: string = req.body.username.toString().toLowerCase().replace(/[^a-z | 0-9 | \.]/g, '');
    // add your own username conditions here
    if (!(/[a-z]/.test(username))) { return res.status(406).json({ 'status': 'username must contain atleast one character (a-z)', 'success': false }); }
    if (!(await Accounts.isAvailable.username(username))) { return res.status(406).json({ 'status': 'username is occupied!', 'success': false }); }

    // Making sure that the Account Doesn't exist
    const email: string = req.body.email.toString().toLowerCase().replace(/[^a-z | 0-9 | \. | \@ ]/g, '');
    if (!(await Accounts.isAvailable.email(email))) { return res.status(406).json({ 'status': 'account already exists!', 'success': false }); }

    const password: string = req.body.password.toString();

    // Hashing the password
    let hash;
    try {
        const salt: string = await bcrypt.genSalt(14)
        hash = await bcrypt.hash(password, salt)
    } catch (error) {
        return res.status(500).json({ 'status': 'internal server error!', 'success': false });
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
        return res.status(500).json({ 'status': 'internal server error!', 'success': false });
    }

    // On Success:
    const token = jwt.sign(user, (process.env.ACCOUNTS_TOKEN_VERIFICATION_KEY as string));

    const expirationDate: Date = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);

    res.cookie('token', token, {
        expires: expirationDate,
        httpOnly: true,
        path: '/',
        sameSite: 'strict'
    }).status(201).json({ 'status': 'successfully registered your Account1', 'success': true })
})
router.get('/get/account/info', async (req, res)=>{
    try {
        res.status(200).json(await Authentication.getGeneralInfo(req))
    } catch (error) {
        console.log(error)
        res.status(500).json({loggedIn: false, admin: false})
    }
})

function generateUserID() {
    const minID = 1000000000;
    const maxID = 9999999999;

    let userID: number = Math.floor(Math.random() * (maxID - minID + 1)) + minID;

    // Check if the generated userID already exists in the database
    if (!Accounts.findAccountOne.userID(userID)) {
        return generateUserID(); // Recursively generate new userID
    } else {
        return userID; // Return the unique userID
    }
}

export default router