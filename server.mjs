import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
// Agora importamos as DUAS funções
import { setupSockets, setupRestRoutes } from './web/api/web-api.mjs'; 

const PORT = 3750;
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Ligar as rotas REST para testares
setupRestRoutes(app);

// Ligar os WebSockets
setupSockets(io);

server.listen(PORT, () => {
  console.log('🚀 Servidor a correr! Vai a http://localhost:' + PORT);
});