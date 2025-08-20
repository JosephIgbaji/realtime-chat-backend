import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import app from "./app";
import { setupSocket } from "./sockets/index";

const PORT = Number(process.env.PORT) || 4000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",") || "*"
  }
});

setupSocket(io);

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
