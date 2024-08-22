import 'dotenv/config';
import env from './assets/env.js';
import { exec } from 'child_process';
// Local Modules
import ipv4 from './assets/ipv4.js';
import logPrefix from './assets/log.js';
import { Accounts } from './assets/database.js';
import config from './assets/config.js';
// Routers
import server, { PORT, origin } from './routes/server.js';
import './routes/socket.js';
// Middlewares
server.listen(PORT, () => {
    console.log(logPrefix('Server'), `Server Started on ${origin}`);
    if (config.serverConfig.browserOnRun === true && config.serverConfig.devMode === false) {
        if (config.serverConfig.firstrun === true) {
            exec(`start ${origin}/register`, () => { });
        }
        else {
            exec(`start ${origin}`, () => { });
        }
    }
});
