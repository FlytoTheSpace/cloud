import path from "path";
import fs from "fs/promises"
import config from "./config.js";
import { Stats } from 'fs'
import { Accounts } from "./database.js";

export type Actions = 'open' | 'copy' | 'cut' | 'delete'
export type FileSystemTypes = 'file' | 'directory' | 'unknown'
export type validFileSystemTypes = 'file' | 'directory'

export interface MetaData {
    size: number
    'createdOn': Date
}

export interface FileObject {
    [input: string]: string | MetaData
    name: string,
    path: string,
    type: 'file' | 'directory' | 'unknown',
    metadata: MetaData
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
export async function getFiles(userID: number, directory: string): Promise<FileObject[] | string> {
    const homeDirectory = path.join(config.databasePath, `/${userID}/`)
    const inputPath = path.join(homeDirectory, directory.sanitizePath())
    if(!(await pathExists(inputPath))){ return "Path Doesn't Exist"}
    if(!inputPath.includes(homeDirectory)){ return "Path Escapes!"}

    const files: string[] = (await fs.readdir(inputPath))

    const filesObject: FileObject[] = []

    for (let i = 0; i < files.length; i++) {

        const filePath: string = path.join(directory, files[i]).replace(/\\/g, '/')
        const type: FileSystemTypes = await checkPathType(path.join(homeDirectory, filePath));
        const metadata: Stats = await fs.lstat(path.join(homeDirectory, filePath))
        const fileObject: FileObject = {
            'name': files[i],
            'path': filePath,
            'type': type,
            'metadata': {
                'size': metadata.size,
                'createdOn': metadata.birthtime
            }
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