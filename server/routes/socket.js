import 'dotenv/config';
import server from "./server.js";
import { Server } from "socket.io";
import env from '../assets/env.js';
import Authentication from '../assets/authentication.js';
import { spawn } from 'child_process';
import ROOT from '../assets/root.js';
import { error } from 'console';
import Worker from 'worker_threads';
import config from '../assets/config.js';
const events = {
    join: 'join',
    command: 'command',
    error: 'error',
    response: 'response'
};
const io = new Server(server);
io.on('connection', (socket) => {
    socket.on(events.join, async (inputPath) => {
        try {
            if (!inputPath) {
                throw new Error('invalid Path Input');
            }
            const socketPath = inputPath.toString().sanitizePath();
            // TODO: Add Rooms for other Tasks
        }
        catch (error) {
            socket.emit(events.error, {
                status: (error.message),
                success: false,
                data: null,
                meta: {
                    event: events.error,
                    inputPath: inputPath
                }
            });
        }
    });
    socket.on('command', async (CMD) => {
        if (config.serverConfig.features.console) {
            try {
                // Authentication
                const isAuthorized = await Authentication.main(socket.handshake, null, () => { }, {
                    adminOnly: true,
                    returnBool: true
                });
                if (!isAuthorized) {
                    throw new Error("Not Authorized");
                }
                // main logic
                const Commands = CMD.toString('utf-8').split(' ');
                if (!Commands.length) {
                    throw new Error("Invalid Commands Length");
                }
                const [exe, ...args] = Commands;
                const adminConsoleProcess = args.length ? spawn(exe, args, { cwd: ROOT }) : spawn(exe, { cwd: ROOT });
                adminConsoleProcess.on('error', async (err) => {
                    const isAuthorized = await Authentication.main(socket.handshake, null, () => { }, {
                        adminOnly: true,
                        returnBool: true
                    });
                    if (!isAuthorized) {
                        throw new Error("Not Authorized");
                    }
                    socket.emit(events.error, {
                        status: "process stderr data",
                        success: true,
                        data: {
                            bin: err,
                            formatted: err.toString().split('\n')
                        },
                        meta: {
                            event: events.command,
                        }
                    });
                });
                adminConsoleProcess.stdout.on('data', async (bytes) => {
                    const isAuthorized = await Authentication.main(socket.handshake, null, () => { }, {
                        adminOnly: true,
                        returnBool: true
                    });
                    if (!isAuthorized) {
                        throw new Error("Not Authorized");
                    }
                    socket.emit(events.response, {
                        status: 'process stdout data',
                        success: true,
                        data: {
                            bin: Array.from(bytes),
                            formatted: bytes.toString('utf-8').split('\n')
                        },
                        meta: {
                            event: events.command,
                        }
                    });
                });
                socket.on('kill', async () => {
                    const isAuthorized = await Authentication.main(socket.handshake, null, () => { }, {
                        adminOnly: true,
                        returnBool: true
                    });
                    if (!isAuthorized) {
                        throw new Error("Not Authorized");
                    }
                    adminConsoleProcess.kill();
                    socket.emit(events.response, {
                        status: 'process stdout data',
                        success: true,
                        data: null,
                        meta: {
                            event: events.command,
                        }
                    });
                });
            }
            catch (error) {
                socket.emit(events.error, {
                    status: (error.message),
                    success: false,
                    data: null,
                    meta: {
                        event: events.error,
                    }
                });
            }
        }
        else {
            socket.emit(events.error, {
                status: "This Feature is Disabled",
                success: false,
                data: null,
                meta: {
                    event: events.error,
                }
            });
        }
    });
});
