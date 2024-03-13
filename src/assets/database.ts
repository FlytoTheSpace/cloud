import 'dotenv/config'
import mongoose from 'mongoose';
import logPrefix from './log.js';
import { logMSG, throwError } from './utils.js';
import { Response } from 'express';
import jwt from 'jsonwebtoken';

export interface accountInterface {
    username: string,
    email: string,
    password: string,
    userID: number,
    role: string,
    emailVerified: boolean
}

try {
    // Checking If the URI is Provided
    if(!process.env.mongoDBURI){
        throw new Error(`${logPrefix('Database')} MongoDB URI not Provided, please Provide it!`)
    }
    // Connecting to The Server
    await mongoose.connect(process.env.mongoDBURI);
    console.log(logPrefix("Database"), `Connect to Loaded MongoDB`);

} catch (error) {
    if((error as Error).message == `${logPrefix('Database')} MongoDB URI not Provided, please Provide it!`){
        throw (error as Error)
    }
    throwError("Unable to Connect to MongoDB", (error as Error).message)
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

export const AccountsModel = mongoose.model("accounts", AccountsSchema, 'accounts') // <---  User Model

// Accessories for Working with Accounts
export const Accounts = {
    findAccountOne: {
        username: async (username: string): Promise<accountInterface | undefined> => (await AccountsModel.find({'username' : username})).map(account => account.toJSON())[0] as accountInterface | undefined,
        email: async (email: string): Promise<accountInterface | undefined> => (await AccountsModel.find({'email' : email})).map(account => account.toJSON())[0] as accountInterface | undefined,
        userID: async (ID: number): Promise<accountInterface | undefined> => (await AccountsModel.find({'userID' : ID})).map(account => account.toJSON())[0] as accountInterface | undefined,
    },
    findAccounts: {
        username: async (username: string) => (await AccountsModel.find({'username' : username})).map(account => account.toJSON()),
        email: async (email: string) => (await AccountsModel.find({'email' : email})).map(account => account.toJSON()),
        userID: async (ID: number) => (await AccountsModel.find({'userID' : ID})).map(account => account.toJSON()),
    },
    getAll: async () => (await AccountsModel.find({})).map(account=>account.toJSON()),
    updateOne: async (filter: object, updatedValue: object)=>{
        try{
            await AccountsModel.findOneAndUpdate(filter, updatedValue);
        } catch(error){
            logMSG(["Unable to Find/Update The Specified User"], [(error as Error).message], "Database")
        }
    },
    register: async (userData: accountInterface): Promise<void> => {
        const newUser = new AccountsModel(userData);
        await newUser.save();
        console.log(logPrefix("Database"), `New Account Registered: ${userData.username}`);
    },
    isAvailable: {
        username: async (username: string): Promise<boolean> => !(await AccountsModel.findOne({ username })),
        email: async (email: string): Promise<boolean> => !(await AccountsModel.findOne({ email }))
    },
    token: {
        isValid: (token: string): boolean =>{
            try{
                jwt.verify(token, (process.env.ACCOUNTS_TOKEN_VERIFICATION_KEY as string))
                return true
            } catch (error){
                return false
            }
        }
    },
    sessionToken: {
        isValid: (token: string): boolean =>{
            try{
                jwt.verify(token, (process.env.ACCOUNTS_SESSION_TOKEN_VERIFICATION_KEY as string))
                return true
            } catch (error){
                return false
            }
        }
    }
}
