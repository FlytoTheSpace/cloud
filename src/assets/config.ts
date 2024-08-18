import fs from 'fs/promises'
import path from 'path'
import ROOT from './root.js'
import logPrefix from './log.js'
import {directoryExists} from './utils.js'


// Config Schema
interface features {
    'console': boolean
    'redis': boolean
}

interface configFileInterface {
    [key: string]: boolean | string | number | features,
    devMode: boolean,
    databaseDir: string,
    namesizelimit: number,
    firstrun: boolean,
    browserOnRun: boolean,
    sessionTokenExpiration: number,
    features: features
}
// Defaults
const defaultconfigFile: configFileInterface = {
    devMode: false,
    databaseDir: "$ROOT/database",
    namesizelimit: 255,
    firstrun: false,
    browserOnRun: true,
    sessionTokenExpiration: 30,
    features: {
        console: false,
        redis: false
    }
}

let serverConfig: configFileInterface

// Checking If  the Configuration File is Missing
try{
    serverConfig = JSON.parse(await fs.readFile(path.join(ROOT, '/config.json'), 'utf8'))
    if(!serverConfig){ // Throw Error If The File is not found and No is Error Detected
        console.error(logPrefix('error'), "No Config File Found!")
        process.exit(1)
    }
} catch (error){

    console.log(logPrefix("Config"), "No Config File Found, Creating One...")
    await fs.writeFile(path.join(ROOT, 'config.json'), JSON.stringify(defaultconfigFile))
    serverConfig = structuredClone(defaultconfigFile)
}

// Checking if any configuration is missing
for (let i = 0; i < Object.keys(defaultconfigFile).length; i++) {

    const val = serverConfig[Object.keys(defaultconfigFile)[i]]
    const key: string = Object.keys(defaultconfigFile)[i]
    if(val === undefined || val === null){

        // Setting The Configuration to Default if any is Missing

        console.log(logPrefix("Config"), "Invalid configuration, Fixing It...")

        changeConfig(Object.keys(defaultconfigFile)[i], defaultconfigFile[Object.keys(defaultconfigFile)[i]])
    } else if (typeof val === 'object'){
        for(let j = 0; j<Object.keys(defaultconfigFile[key]).length; j++){

            const nestedVal: unknown = Object.values(serverConfig[key])[j]
            const nestedKey: keyof features = Object.keys(defaultconfigFile[key])[j] as keyof features

            if(nestedVal === undefined || nestedVal === null){

                // Setting The Configuration to Default if any is Missing
                const newNestedConfig: features = (structuredClone(defaultconfigFile[key]) as features)
                console.log(logPrefix("Config"), "Invalid configuration, Fixing It...")

                newNestedConfig[nestedKey] = Object.values(defaultconfigFile[key])[j]
                changeConfig(key, newNestedConfig)
            }
        }
    }
}

async function changeConfig (key: string, value: string | number | boolean | features){
    serverConfig[key] = value
    try{

        await fs.writeFile(path.join(ROOT, 'config.json'), JSON.stringify(serverConfig, null, 4))
    } catch(error){
        console.error(logPrefix("Error"), (error as Error).message)
    }
}

const databasePath: string = path.normalize(`${(serverConfig.databaseDir.startsWith("$ROOT"))? path.join(ROOT, serverConfig.databaseDir.replace('$ROOT', '')) : ( serverConfig.databaseDir)}/`);

// Checking if the Directory Exists

if (!(await directoryExists(databasePath))){
    console.error(logPrefix('Error'), "Database Directory doesn't exists, please create it")
    process.exit(1)
}
export default {serverConfig, databasePath, changeConfig};
