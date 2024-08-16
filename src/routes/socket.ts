import 'dotenv/config'
import server from "./server.js";
import { Server } from "socket.io";
import env from '../assets/env.js';
import { DefaultEventsMap } from 'socket.io/dist/typed-events.js';
import Authentication from '../assets/authentication.js';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import ROOT from '../assets/root.js';
import { error } from 'console';
import Worker from 'worker_threads'

type Response = {
    status: string,
    success: boolean,
    data: any
    meta: {
        [key: string]: any
    }
}
type events = {
    join: 'join',
    command: 'command',
    error: 'error',
    response: 'response'
}
const events: events = {
    join: 'join',
    command: 'command',
    error: 'error',
    response: 'response'
}

const io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> = new Server(server);
io.on('connection', (socket) => {
    socket.on(events.join, async (inputPath: unknown) => {
        try {
            if (!inputPath) { throw new Error('invalid Path Input') }
            const socketPath = (inputPath.toString() as string).sanitizePath()

            // TODO: Add Rooms for other Tasks
        } catch (error) {
            socket.emit(events.error, {
                status: ((error as Error).message),
                success: false,
                data: null,
                meta: {
                    event: events.error,
                    inputPath: inputPath
                }
            } as Response)
        }
    })
    socket.on('command', async (CMD: any) => {
        try {
            // Authentication
            const isAuthorized: boolean = (await Authentication.main(socket.handshake, null, () => { }, {
                adminOnly: true,
                returnBool: true
            }) as boolean)
            if (!isAuthorized) { throw new Error("Not Authorized") }


            // main logic
            const Commands: string[] = (CMD.toString('utf-8') as string).split(' ')
            if (!Commands.length) { throw new Error("Invalid Commands Length") }
            const [exe, ...args] = Commands

            const adminConsoleProcess: ChildProcessWithoutNullStreams = args.length ? spawn(exe, args, { cwd: ROOT }) : spawn(exe, { cwd: ROOT });
            adminConsoleProcess.on('error', async (err) => {
                const isAuthorized: boolean = (await Authentication.main(socket.handshake, null, () => { }, {
                    adminOnly: true,
                    returnBool: true
                }) as boolean)
                if (!isAuthorized) { throw new Error("Not Authorized") }


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
                } as Response)
            })
            adminConsoleProcess.stdout.on('data', async (bytes) => {
                const isAuthorized: boolean = (await Authentication.main(socket.handshake, null, () => { }, {
                    adminOnly: true,
                    returnBool: true
                }) as boolean)
                if (!isAuthorized) { throw new Error("Not Authorized") }
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
                } as Response)
            })
            socket.on('kill', async () => {
                const isAuthorized: boolean = (await Authentication.main(socket.handshake, null, () => { }, {
                    adminOnly: true,
                    returnBool: true
                }) as boolean)
                if (!isAuthorized) { throw new Error("Not Authorized") }


                adminConsoleProcess.kill()
                socket.emit(events.response, {
                    status: 'process stdout data',
                    success: true,
                    data: null,
                    meta: {
                        event: events.command,
                    }
                } as Response)
            })

        } catch (error) {
            socket.emit(events.error, {
                status: ((error as Error).message),
                success: false,
                data: null,
                meta: {
                    event: events.error,
                }
            } as Response)
        }
    })

})