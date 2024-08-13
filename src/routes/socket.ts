import 'dotenv/config'
import server from "../server.js";
import { Server } from "socket.io";
import env from '../assets/env.js';
import { DefaultEventsMap } from 'socket.io/dist/typed-events.js';
import Authentication from '../assets/authentication.js';

type Response = {
    status: string,
    success: boolean,
    data: any
    meta: {
        [key: string]: any
    }
}

const io = new Server(server);
const events: {[key: string]: string} = {
    join: 'join',
    command: 'command'
}
io.on('connection', (socket)=>{
    console.log("Socket Connection Established ✅")
    socket.on(events.join, async (inputPath: unknown)=>{
        try {
            if(!inputPath){throw new Error('invalid Path Input')}
            const socketPath = (inputPath.toString() as string).sanitizePath()
            switch(socketPath){
                case env.ADMIN_PAGE_URL:
                    socket.join(env.ADMIN_PAGE_URL)
                    const isAuthorized = await Authentication.main(socket.handshake, null, ()=>{}, {
                        adminOnly: true,
                        returnBool: true
                    })
                    if(!isAuthorized){ throw new Error("Not Authorized")}
                    const res: Response = {
                        status: "Successfully Joined",
                        success: true,
                        data: null,
                        meta: {
                            event: events.join,
                            inputPath: inputPath
                        }
                    }
                    socket.emit("response", res)
                    socket.on('command', (MSG: any)=>{
                        const msg = (MSG.toString())
                        // const authenticated = Authentication.main(socket.)
                        console.log(msg)
                    })
                    break;
                default:
                    socket.emit("error", {status: 'Unknown ', success: false})
                    break;
            }
        } catch (error) {
            console.log((error as Error))
            socket.emit('error', `[Socket.io Error]: ${((error as Error).message)}`)
            socket.disconnect(true)
        }
    })

    socket.on('disconnect', ()=>{
        console.log("Socket Connection Closed 🛑")
    })
})