import 'dotenv/config';
import mongoose from 'mongoose';
import logPrefix from './log.js';
import { logMSG, throwError } from './utils.js';
try {
    // Checking If the URI is Provided
    if (!process.env.mongoDBURI) {
        throw new Error(`${logPrefix('Database')} MongoDB URI not Provided, please Provide it!`);
    }
    // Connecting to The Server
    await mongoose.connect(process.env.mongoDBURI);
    console.log(logPrefix("Database"), `Connect to Loaded MongoDB`);
}
catch (error) {
    // 
    if (error.message == `${logPrefix('Database')} MongoDB URI not Provided, please Provide it!`) {
        throw error;
    }
    throwError("Unable to Connect to MongoDB", error.message);
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
        email: async (data) => (await AccountsModel.find({ 'email': data })).map(account => account.toJSON())[0],
        username: async (data) => (await AccountsModel.find({ 'username': data })).map(account => account.toJSON())[0],
        userID: async (data) => (await AccountsModel.find({ 'userID': data })).map(account => account.toJSON())[0],
    },
    findAccounts: {
        email: async (data) => (await AccountsModel.find({ 'email': data })).map(account => account.toJSON()),
        username: async (data) => (await AccountsModel.find({ 'username': data })).map(account => account.toJSON()),
        userID: async (data) => (await AccountsModel.find({ 'userID': data })).map(account => account.toJSON()),
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
        try {
            await newUser.save();
            console.log(logPrefix("Database"), `New account registered: ${userData.username}`);
            return true;
        }
        catch (error) {
            console.error('Error saving new user:', error);
            return false;
        }
    },
    isAvailable: {
        username: async (username) => !(await AccountsModel.findOne({ username })),
        email: async (email) => !(await AccountsModel.findOne({ email }))
    }
};
