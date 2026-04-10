import express from "express";
import httpServer from 'http'
import { initSocket } from './socket.js';

const app = express();

const server = httpServer.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});