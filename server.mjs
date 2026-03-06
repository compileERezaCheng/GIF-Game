import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

// Importação dos módulos com o padrão Init
import DataInit from './data/data.mjs';
import ServicesInit from './services/services.mjs';
import ApiInit from './web/api/web-api.mjs';

const PORT = 3750;
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ======================================================
// 1. INJEÇÃO DE DEPENDÊNCIAS (O "Coração" da Arquitetura)
// ======================================================

// Inicializa a base de dados em memória
const gameData = DataInit(); 

// Inicializa os serviços passando a base de dados
const gameServices = ServicesInit(gameData); 

// Inicializa a API passando os serviços e a base de dados (para as rotas de debug)
const webApi = ApiInit(gameServices, gameData); 

// ======================================================
// 2. MIDDLEWARES E CONFIGURAÇÕES
// ======================================================

// Essencial para o teu REST Client conseguir enviar o {"tema": "..."} no body
app.use(express.json()); 

// Serve os ficheiros estáticos (HTML/JS/CSS) da pasta do site
app.use(express.static('web/site'));

// ======================================================
// 3. ATIVAÇÃO DAS ROTAS E SOCKETS
// ======================================================

// Ativa as rotas REST (/api/game, /api/themes, /api/leaderboard, etc)
webApi.setupRestRoutes(app); 

// Ativa os ouvintes de WebSockets (join_game, pick_theme, submit_gif, etc)
webApi.setupSockets(io); 

// ======================================================
// 4. ARRANQUE DO SERVIDOR
// ======================================================

server.listen(PORT, () => {
  console.log(`🚀 JOGO DOS GIFS ONLINE`);
  console.log(`🏠 Link Local: http://localhost:${PORT}`);
  console.log(`📊 Leaderboard: http://localhost:${PORT}/api/leaderboard`);
});