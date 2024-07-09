import logPrefix from './log.js';
import fs from 'fs/promises';
import config from './config.js';
export async function directoryExists(directoryPath) {
    try {
        await fs.access(directoryPath, fs.constants.F_OK);
        return true;
    }
    catch (error) {
        // Check if error is of type NodeJS.ErrnoException
        if (isErrnoException(error)) {
            // If an error is thrown, it means the directory doesn't exist
            if (error.code === 'ENOENT') {
                return false;
            }
            else {
                // If it's another type of error, rethrow it
                throw error;
            }
        }
        else {
            throw new Error('Unexpected error occurred.');
        }
    }
}
// Type guard to check if the error is of type NodeJS.ErrnoException
export function isErrnoException(error) {
    return (error instanceof Error) && ('code' in error);
}
export const logMSG = (prefix, ...msg) => {
    console.log(logPrefix(prefix), ...msg);
};
export const throwError = (normalError, devError) => {
    return (config.serverConfig.devMode) ? new Error(devError || normalError) : new Error(normalError);
};
