import 'dotenv/config';
import mongoose from 'mongoose';
import logPrefix from './log.js';
import { logMSG, throwError } from './utils.js';
import jwt from 'jsonwebtoken';
const timeoutSeconds = 5;
const connect = async () => {
    if (!process.env.mongoDBURI) {
        throwError(`${logPrefix('Database')} MongoDB URI not Provided, please Provide it!`);
        process.exit(1);
    }
    mongoose.connect(process.env.mongoDBURI);
    return `Connected to MongoDB`;
};
const timeout = new Promise((_, rej) => {
    setTimeout(() => {
        rej(new Error("MongoDB Connection Timeout!"));
    }, timeoutSeconds * 1000);
});
try {
    console.log(logPrefix("Database"), await Promise.race([connect(), timeout]));
}
catch (error) {
    throwError("Unable to Connect to MongoDB", error.message);
    process.exit(1);
}
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
export const AccountsSchema = new Schema({
    username: String,
    email: String,
    password: String,
    userID: Number,
    role: String,
    emailVerified: Boolean
});
export const AccountsModel = mongoose.model("accounts", AccountsSchema, 'accounts'); // <---  User Model
// Accessories for Working with Accounts
export const Accounts = {
    findAccountOne: {
        username: async (username) => (await AccountsModel.find({ 'username': username })).map(account => account.toJSON())[0],
        email: async (email) => (await AccountsModel.find({ 'email': email })).map(account => account.toJSON())[0],
        userID: async (ID) => (await AccountsModel.find({ 'userID': ID })).map(account => account.toJSON())[0],
    },
    findAccounts: {
        username: async (username) => (await AccountsModel.find({ 'username': username })).map(account => account.toJSON()),
        email: async (email) => (await AccountsModel.find({ 'email': email })).map(account => account.toJSON()),
        userID: async (ID) => (await AccountsModel.find({ 'userID': ID })).map(account => account.toJSON()),
    },
    getAll: async () => (await AccountsModel.find({})).map(account => account.toJSON()),
    updateOne: async (filter, updatedValue) => {
        try {
            await AccountsModel.findOneAndUpdate(filter, updatedValue);
        }
        catch (error) {
            logMSG(["Unable to Find/Update The Specified User"], [error.message], "Database");
        }
    },
    register: async (userData) => {
        const newUser = new AccountsModel(userData);
        await newUser.save();
        console.log(logPrefix("Database"), `New Account Registered: ${userData.username}`);
    },
    isAvailable: {
        username: async (username) => !(await AccountsModel.findOne({ username })),
        email: async (email) => !(await AccountsModel.findOne({ email }))
    },
    token: {
        validate: (token) => {
            try {
                const decodedToken = jwt.verify(token, process.env.ACCOUNTS_TOKEN_VERIFICATION_KEY);
                return decodedToken;
            }
            catch (error) {
                return null;
            }
        }
    },
    sessionToken: {
        validate: (sessionToken) => {
            try {
                const decodedSessionToken = jwt.verify(sessionToken, process.env.ACCOUNTS_SESSION_TOKEN_VERIFICATION_KEY);
                return decodedSessionToken;
            }
            catch (error) {
                return null;
            }
        }
    }
};
