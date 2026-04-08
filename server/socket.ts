import { Server } from "socket.io";
import { Server as HttpServer } from 'http';

let io: Server;

export let initSocket = (server: HttpServer) => {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        socket.on('my-location', (data) => {
            console.log(data);

            io.emit("user-location", data);
        });
        socket.on('disconnect', () => {
            console.log("User disconnected:", socket.id);
        });
    });


    return io;
}

export let getIo = () => {
    if (!io) {
        throw new Error("Socket was not initialized");
    }
    return io;
}