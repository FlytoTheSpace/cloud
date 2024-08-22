import 'dotenv/config'
import logPrefix from './log.js'

const envVarNames = [
    'mongoDBURI',
    'ACCOUNTS_TOKEN_VERIFICATION_KEY',
    'ACCOUNTS_SESSION_TOKEN_VERIFICATION_KEY',
    'PORT',
    'ADMIN_PAGE_URL',
]
type envDataType = {
    'mongoDBURI': string,
    'ACCOUNTS_TOKEN_VERIFICATION_KEY': string,
    'ACCOUNTS_SESSION_TOKEN_VERIFICATION_KEY': string,
    'PORT': string | undefined,
    'ADMIN_PAGE_URL': string,
}

const errors = []
for(let key of envVarNames){
    if(process.env[key] === undefined){
        if(key === 'PORT'){
            console.error(logPrefix('Warning'), `Environment Variable "${key}" is Not Configured!`);
            continue;
        }
        errors.push(`${logPrefix('Error')} Environment Variable "${key}" is Not Configured!`)
    }
}
if(errors.length){
    for(let error of errors){
        console.error(logPrefix('error'), error)
    }
    process.exit(1)
}
export default (process.env as envDataType)