import 'dotenv/config'
import mongoose from 'mongoose';
import logPrefix from './log.js';
import { throwError } from './utils.js';
import jwt from 'jsonwebtoken';
import { SessionTokenPayload } from './authentication.js';
import env from './env.js';

export interface accountInterface {
    username: string,
    email: string,
    password: string,
    userID: number,
    role: string,
    emailVerified: boolean
}
const timeoutSeconds = 5


const connect = async ():Promise<string>=>{
    mongoose.connect(env.mongoDBURI);
    return `Connected to MongoDB`;
}
const timeout = new Promise((_, rej)=>{
    setTimeout(()=>{
        rej(new Error("MongoDB Connection Timeout!"))
    }, timeoutSeconds*1000)
})

try {
    console.log(logPrefix("Database"), await Promise.race([connect(), timeout], ))
} catch (error) {
    throwError("Unable to Connect to MongoDB", (error as Error).message)
    process.exit(1)
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

export const AccountsModel = mongoose.model('accounts', AccountsSchema, 'accounts') // <---  User Model
export const ConfigModel = mongoose.model('config', AccountsSchema, 'config') // <---  User Model

// Accessories for Working with Accounts
export const Accounts = {
    findOne: {
        username: async (username: string): Promise<accountInterface | undefined> => (await AccountsModel.find({'username' : username})).map(account => account.toJSON())[0] as accountInterface | undefined,
        email: async (email: string): Promise<accountInterface | undefined> => (await AccountsModel.find({'email' : email})).map(account => account.toJSON())[0] as accountInterface | undefined,
        userID: async (ID: number): Promise<accountInterface | undefined> => (await AccountsModel.find({'userID' : ID})).map(account => account.toJSON())[0] as accountInterface | undefined,
    },
    findMany: async (filter: object, limit?: number, offset?: number): Promise<accountInterface[]|null>=>{
        const Accounts = (limit)?
            (offset?
                await AccountsModel.find(filter).limit(limit).skip(offset):
                await AccountsModel.find(filter).limit(limit)):
            (await AccountsModel.find(filter));
        
        for(let i = 0; i<Accounts.length; i++){
            Accounts[i] = Accounts[i].toJSON()
        };
        return (Accounts as accountInterface[]);
    },
    updateOne: async (filter: object, update: object): Promise<boolean>=>{
        try {
            await AccountsModel.updateOne(filter,update)
            return true
        } catch (error) {
            return false
        }
    },
    updateMany: async (filter: object, update: object): Promise<boolean>=>{
        try {
            const updatedAccount = await AccountsModel.updateMany(filter, update);
            return true;
        } catch (error) {
            return false;
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
        validate: (token: string): accountInterface | null =>{
            try{
                const decodedToken: accountInterface = (jwt.verify(token, env.ACCOUNTS_TOKEN_VERIFICATION_KEY) as accountInterface)
                return decodedToken;
            } catch (error){
                return null
            }
        }
    },
    sessionToken: {
        validate: (sessionToken: string): SessionTokenPayload  | null =>{
            try{
                const decodedSessionToken: SessionTokenPayload = (jwt.verify(sessionToken, env.ACCOUNTS_SESSION_TOKEN_VERIFICATION_KEY) as SessionTokenPayload)
                return decodedSessionToken
            } catch (error){
                return null
            }
        }
    }
}