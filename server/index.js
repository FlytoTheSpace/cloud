import 'dotenv/config';
import env from './assets/env.js';
import { exec } from 'child_process';
// Local Modules
import ipv4 from './assets/ipv4.js';
import logPrefix from './assets/log.js';
import { Accounts } from './assets/database.js';
import config from './assets/config.js';
// Routers
import server from './server.js';
import './routes/socket.js';
const PORT = env.PORT ? parseInt(env.PORT) : 8080;
// Middlewares
server.listen(PORT, () => {
    const link = `http://${ipv4}:${PORT}`;
    console.log(logPrefix('Server'), `Server Started on ${link}`);
    if (config.serverConfig.browserOnRun === true && config.serverConfig.devMode === false) {
        if (config.serverConfig.firstrun === true) {
            exec(`start ${link}/register`, () => { });
        }
        else {
            exec(`start ${link}`, () => { });
        }
    }
});
