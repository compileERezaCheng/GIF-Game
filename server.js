const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// Configurar o servidor
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Dizer ao servidor para servir os ficheiros da pasta 'public' (vamos criá-la a seguir)
app.use(express.static('public'));

// O que acontece quando alguém se liga ao jogo
io.on('connection', (socket) => {
  console.log('🎉 Um novo jogador ligou-se! ID:', socket.id);

  // O que acontece quando este jogador se desliga
  socket.on('disconnect', () => {
    console.log('👋 Um jogador saiu. ID:', socket.id);
  });
});

// Ligar o servidor na porta 3000
server.listen(3000, () => {
  console.log('🚀 Servidor a correr! Vai a http://localhost:3000 no teu browser.');
});