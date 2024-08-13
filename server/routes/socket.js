import 'dotenv/config';
import server from "../server.js";
import { Server } from "socket.io";
import env from '../assets/env.js';
import Authentication from '../assets/authentication.js';
const io = new Server(server);
const events = {
    join: 'join',
    command: 'command'
};
io.on('connection', (socket) => {
    console.log("Socket Connection Established ✅");
    socket.on(events.join, async (inputPath) => {
        try {
            if (!inputPath) {
                throw new Error('invalid Path Input');
            }
            const socketPath = inputPath.toString().sanitizePath();
            switch (socketPath) {
                case env.ADMIN_PAGE_URL:
                    socket.join(env.ADMIN_PAGE_URL);
                    const isAuthorized = await Authentication.main(socket.handshake, null, () => { }, {
                        adminOnly: true,
                        returnBool: true
                    });
                    if (!isAuthorized) {
                        throw new Error("Not Authorized");
                    }
                    const res = {
                        status: "Successfully Joined",
                        success: true,
                        data: null,
                        meta: {
                            event: events.join,
                            inputPath: inputPath
                        }
                    };
                    socket.emit("response", res);
                    socket.on('command', (MSG) => {
                        const msg = (MSG.toString());
                        // const authenticated = Authentication.main(socket.)
                        console.log(msg);
                    });
                    break;
                default:
                    socket.emit("error", { status: 'Unknown ', success: false });
                    break;
            }
        }
        catch (error) {
            console.log(error);
            socket.emit('error', `[Socket.io Error]: ${(error.message)}`);
            socket.disconnect(true);
        }
    });
    socket.on('disconnect', () => {
        console.log("Socket Connection Closed 🛑");
    });
});
