import fs from 'fs/promises';
import path from 'path';
import ROOT from './root.js';
import logPrefix from './log.js';
import { directoryExists } from './utils.js';
import ipv4 from './ipv4.js';
import server, { PORT } from '../routes/server.js';
// Defaults
const defaultconfigFile = {
    devMode: false,
    databaseDir: "$ROOT/database/",
    namesizelimit: 255,
    firstrun: false,
    browserOnRun: true,
    sessionTokenExpiration: 30,
    features: {
        console: false,
        redis: false
    },
    allowOrigin: [
        `http://${ipv4}:${PORT}`
    ]
};
let serverConfig;
// Checking If  the Configuration File is Missing
try {
    serverConfig = JSON.parse(await fs.readFile(path.join(ROOT, '/config.json'), 'utf8'));
    if (!serverConfig) { // Throw Error If The File is not found and No is Error Detected
        console.error(logPrefix('error'), "No Config File Found!");
        process.exit(1);
    }
}
catch (error) {
    if (error.name === 'SyntaxError') {
        console.error(logPrefix("Error"), "Config File Syntax Error fixing it...");
    }
    else if (error.message.includes('no such file or directory')) {
        console.error(logPrefix("Config"), "No Config File Found, Creating One...");
    }
    else {
        console.error(logPrefix("Error"), error.message);
    }
    await fs.writeFile(path.join(ROOT, 'config.json'), JSON.stringify(defaultconfigFile));
    serverConfig = structuredClone(defaultconfigFile);
}
// Checking if any configuration is missing
// for (let i = 0; i < Object.keys(defaultconfigFile).length; i++) {
//     const val = serverConfig[Object.keys(defaultconfigFile)[i]]
//     const key: string = Object.keys(defaultconfigFile)[i]
//     if(val === undefined || val === null){
//         // Setting The Configuration to Default if any is Missing
//         console.log(logPrefix("Config"), "Invalid configuration, Fixing It...")
//         changeConfig(Object.keys(defaultconfigFile)[i], defaultconfigFile[Object.keys(defaultconfigFile)[i]])
//     } else if (typeof val === 'object' && !Array.isArray(val)){
//         for(let j = 0; j<Object.keys(defaultconfigFile[key]).length; j++){
//             const nestedVal: unknown = Object.values(serverConfig[key])[j]
//             const nestedKey: keyof features = Object.keys(defaultconfigFile[key])[j] as keyof features
//             if(nestedVal === undefined || nestedVal === null){
//                 // Setting The Configuration to Default if any is Missing
//                 const newNestedConfig: features = (structuredClone(defaultconfigFile[key]) as features)
//                 console.log(logPrefix("Config"), "Invalid configuration, Fixing It...")
//                 newNestedConfig[nestedKey] = Object.values(defaultconfigFile[key])[j]
//                 changeConfig(key, newNestedConfig)
//             }
//         }
//     }
// }
export function fixConfigs() {
    for (const key in defaultconfigFile) {
        const value = serverConfig[key];
        const defaultValue = defaultconfigFile[key];
        if (value === null || value === undefined) {
            console.log(logPrefix("Config"), "Fixing Configurations...");
            changeConfig(key, defaultValue);
        }
        if (typeof value !== typeof defaultValue) {
            console.log(logPrefix("Config"), "Fixing Configurations...");
            changeConfig(key, defaultValue);
        }
        if (typeof defaultValue === 'object' && !Array.isArray(defaultValue)) {
            if (typeof value !== 'object') {
                changeConfig(key, defaultValue);
            }
            for (const nestedKey in defaultValue) {
                const nestedVal = value[nestedKey];
                const nestedDefaultVal = defaultValue[nestedKey];
                if (nestedVal === null || nestedVal === undefined) {
                    const newVal = structuredClone(value);
                    newVal[nestedKey] = nestedDefaultVal;
                    console.log(logPrefix("Config"), "Fixing Configurations...");
                    changeConfig(key, newVal);
                }
            }
        }
    }
}
fixConfigs();
async function changeConfig(key, value) {
    serverConfig[key] = value;
    try {
        await fs.writeFile(path.join(ROOT, 'config.json'), JSON.stringify(serverConfig, null, 4));
    }
    catch (error) {
        console.error(logPrefix("Error"), error.message);
    }
}
export const databasePath = path.normalize(`${(serverConfig.databaseDir.startsWith("$ROOT")) ? path.join(ROOT, serverConfig.databaseDir.replace('$ROOT', '')) : (serverConfig.databaseDir)}/`);
// Checking if the Directory Exists
if (!(await directoryExists(databasePath))) {
    console.error(logPrefix('Error'), "Database Directory doesn't exists, please create it");
    process.exit(1);
}
export default { serverConfig, databasePath, changeConfig, fixConfigs };
