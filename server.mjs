import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

import DataInit from './data/data.mjs';
import ServicesInit from './services/services.mjs';
import ApiInit from './web/api/web-api.mjs';

const PORT = 3750;
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const gameData = DataInit();
const gameServices = ServicesInit(gameData);
const webApi = ApiInit(gameServices, gameData);

app.use(express.json());
app.use(express.static('web/site'));

webApi.setupRestRoutes(app);
webApi.setupSockets(io);

server.listen(PORT, () => {
  console.log('🚀 JOGO DOS GIFS - MOTOR ATIVO EM http://localhost:' + PORT);
});