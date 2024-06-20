import path from "path";
import fs from "fs/promises"
import config from "./config.js";
import { Stats } from 'fs'
import { Accounts } from "./database.js";

export type Actions = 'open' | 'copy' | 'cut' | 'delete'
export type FileSystemTypes = 'file' | 'directory' | 'unknown'
export type validFileSystemTypes = 'file' | 'directory'

export interface FileObject {
    [input: string]: string
    name: string,
    path: string,
    type: 'file' | 'directory' | 'unknown'
}

export async function pathExists(path: string): Promise<boolean> {
    try {
        await fs.access(path);
        return true;
    } catch (err) {
        if ((err as Error).message.includes('no such file or directory')) {
            return false;
        } else {
            throw err
        }
    }
}
export async function getFiles(userID: number, directory: string): Promise<FileObject[]> {
    const files: string[] = (await fs.readdir(path.join(config.databasePath, `${userID}/`, directory.sanitizePath())))

    const filesObject: FileObject[] = []

    for (let i = 0; i < files.length; i++) {

        const filePath: string = path.join(directory, files[i]).replace(/\\/g, '/')
        const type: FileSystemTypes = await checkPathType(path.join(config.databasePath, `${userID}/`, filePath));

        const fileObject: FileObject = {
            'name': files[i],
            'path': filePath,
            'type': type
        }
        filesObject[i] = fileObject;
    }
    return filesObject
}
export async function checkPathType(path: string): Promise<FileSystemTypes> {
    try {
        const stats: Stats = await fs.lstat(path);
        if (stats.isFile()) { return 'file' }
        if (stats.isDirectory()) { return 'directory' }

        return 'unknown';
    } catch (err) {
        return 'unknown'
    }
}