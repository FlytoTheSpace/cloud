import path from "path";
import fs from "fs/promises";
import config from "./config.js";
import { Stats } from 'fs';
import { Accounts } from "./database.js";
export async function pathExists(path) {
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
export async function getFiles(userID, directory) {
    const files = (await fs.readdir(path.join(config.databasePath, `${userID}/`, directory.sanitizePath())));
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
export async function checkPathType(path) {
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
