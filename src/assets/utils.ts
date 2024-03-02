import logPrefix from './log.js';
import fs from 'fs/promises'
import config from './config.js';

export async function directoryExists(directoryPath: string): Promise<boolean> {
    try {
        await fs.access(directoryPath, fs.constants.F_OK);
        return true;
    } catch (error) {
        // Check if error is of type NodeJS.ErrnoException
        if (isErrnoException(error)) {
            // If an error is thrown, it means the directory doesn't exist
            if (error.code === 'ENOENT') {
                return false;
            } else {
                // If it's another type of error, rethrow it
                throw error;
            }
        } else {
            throw new Error('Unexpected error occurred.');
        }
    }
}

// Type guard to check if the error is of type NodeJS.ErrnoException
export function isErrnoException(error: any): error is NodeJS.ErrnoException {
    return (error instanceof Error) && ('code' in error);
}

export const logMSG = (normalLog: any[], devLog?: any[], prefix?: string)=>{
    return (config.serverConfig.devMode)? console.log(logPrefix(prefix || "Log"),...normalLog) : console.log(logPrefix(prefix || "Log"), ...(devLog || normalLog))
}

export const throwError = (normalError: string, devError?: string)=>{
    return (config.serverConfig.devMode)? new Error(normalError) : new Error(devError || normalError)
};