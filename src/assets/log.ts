import { log } from "console";

const logPrefix: (logAs: string)=> string = (logAs: string)=>{
    let logAsModified: string;
    logAsModified = logAs[0].toUpperCase() + logAs.slice(1, logAs.length)
    switch((logAs.toLowerCase())){
        case 'error':
            logAsModified = `\u001B[31m${logAsModified}\u001B[0m`;
            break
        case 'warning':
            logAsModified = `\u001B[33m${logAsModified}\u001B[0m`;
            break
    };
    return `[\x1b[34m${new Date().toLocaleTimeString()}\x1b[37m] [${logAsModified}]`;
}

export default logPrefix