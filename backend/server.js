import express from "express";
import http from "http";
import cors from "cors";
import {Server} from "socket.io";
import {db} from "./db.js";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingInterval: 10000,
  pingTimeout: 5000    
});

io.on('connection', (socket) => {
  console.log(`[+] New client connected: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`[-] Client disconnected: ${socket.id} | Reason: ${reason}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Transit backend streaming live on port ${PORT}`);
});