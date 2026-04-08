import express from "express";
import httpServer from 'http'
import { initSocket } from './socket.ts';

const app = express();

const server = httpServer.createServer(app);
initSocket(server);

server.listen(3000, () => {
    console.log("Server is listening");
});