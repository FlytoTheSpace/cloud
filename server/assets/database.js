import 'dotenv/config';
import mongoose from 'mongoose';
import logPrefix from './log.js';
import { throwError } from './utils.js';
import jwt from 'jsonwebtoken';
import env from './env.js';
const timeoutSeconds = 5;
const connect = async () => {
    mongoose.connect(env.mongoDBURI);
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
export const AccountsModel = mongoose.model('accounts', AccountsSchema, 'accounts'); // <---  User Model
export const ConfigModel = mongoose.model('config', AccountsSchema, 'config'); // <---  User Model
// Accessories for Working with Accounts
export const Accounts = {
    findOne: {
        username: async (username) => (await AccountsModel.find({ 'username': username })).map(account => account.toJSON())[0],
        email: async (email) => (await AccountsModel.find({ 'email': email })).map(account => account.toJSON())[0],
        userID: async (ID) => (await AccountsModel.find({ 'userID': ID })).map(account => account.toJSON())[0],
    },
    findMany: async (filter, limit, offset) => {
        const Accounts = (limit) ?
            (offset ?
                await AccountsModel.find(filter).limit(limit).skip(offset) :
                await AccountsModel.find(filter).limit(limit)) :
            (await AccountsModel.find(filter));
        for (let i = 0; i < Accounts.length; i++) {
            Accounts[i] = Accounts[i].toJSON();
        }
        ;
        return Accounts;
    },
    updateOne: async (filter, update) => {
        try {
            await AccountsModel.updateOne(filter, update);
            return true;
        }
        catch (error) {
            return false;
        }
    },
    updateMany: async (filter, update) => {
        try {
            const updatedAccount = await AccountsModel.updateMany(filter, update);
            return true;
        }
        catch (error) {
            return false;
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
                const decodedToken = jwt.verify(token, env.ACCOUNTS_TOKEN_VERIFICATION_KEY);
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
                const decodedSessionToken = jwt.verify(sessionToken, env.ACCOUNTS_SESSION_TOKEN_VERIFICATION_KEY);
                return decodedSessionToken;
            }
            catch (error) {
                return null;
            }
        }
    }
};
