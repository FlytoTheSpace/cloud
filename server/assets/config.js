import fs from 'fs/promises';
import path from 'path';
import ROOT from './root.js';
import logPrefix from './log.js';
import { directoryExists } from './utils.js';
// Defaults
const defaultconfigFile = {
    'devMode': false,
    'databaseDir': "$ROOT/database",
    'namesizelimit': 255,
    'firstrun': false
};
let serverConfig;
// Checking If  the Configuration File is Missing
try {
    serverConfig = JSON.parse(await fs.readFile(path.join(ROOT, '/config.json'), 'utf8'));
    if (!serverConfig) { // Throw Error If The File is not found and No is Error Detected
        throw new Error("No Config File Found!");
    }
}
catch (error) {
    console.log("[Config] No Config File Found, Creating One...");
    await fs.writeFile(path.join(ROOT, 'config.json'), JSON.stringify(defaultconfigFile));
    serverConfig = structuredClone(defaultconfigFile);
}
// Checking if any configuration is missing
for (let i = 0; i < Object.keys(defaultconfigFile).length; i++) {
    if (Object.keys(defaultconfigFile)[i] !== Object.keys(serverConfig)[i]) {
        // Setting The Configuration to Default if any is Missing
        console.log(logPrefix("Config"), "Invalid configuration, Fixing It...");
        serverConfig[Object.keys(defaultconfigFile)[i]] = Object.values(defaultconfigFile)[i];
        await fs.writeFile(path.join(ROOT, 'config.json'), JSON.stringify(serverConfig));
    }
}
// 
const databasePath = (serverConfig.databaseDir.startsWith("$ROOT")) ? path.join(ROOT, serverConfig.databaseDir.replace('$ROOT', '')) : (serverConfig.databaseDir);
// Checking if the Directory Exists
if (!(await directoryExists(databasePath))) {
    throw new Error("Database Directory doesn't exists... , please create it");
}
export default { serverConfig, databasePath };
