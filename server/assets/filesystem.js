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
    const inputPath = path.join(config.databasePath, `${userID}/`, directory.sanitizePath());
    if (!(await pathExists(inputPath))) {
        return "Path Doesn't Exist";
    }
    if (!inputPath.includes(config.databasePath)) {
        return "Path Escapes!";
    }
    const files = (await fs.readdir(inputPath));
    const filesObject = [];
    for (let i = 0; i < files.length; i++) {
        const filePath = path.join(directory, files[i]).replace(/\\/g, '/');
        const type = await checkPathType(path.join(config.databasePath, `${userID}/`, filePath));
        const metadata = await fs.lstat(path.join(config.databasePath, `${userID}/`, filePath));
        const fileObject = {
            'name': files[i],
            'path': filePath,
            'type': type,
            'metadata': {
                'size': metadata.size,
                'createdOn': metadata.birthtime
            }
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
