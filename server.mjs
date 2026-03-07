import express from 'express';
import http from 'http';
import cookieParser from 'cookie-parser';
import { Server } from 'socket.io';
import { engine } from 'express-handlebars';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import DataInit from './data/data.mjs';
import ServicesInit from './services/services.mjs';
import SiteInit from './web/site/web-site.mjs';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.engine('hbs', engine({
    extname: '.hbs',
    defaultLayout: false,
    partialsDir: path.join(__dirname, 'web/site/views/partials'),
    helpers: {
        slice: (str, start, end) => str ? str.slice(start, end) : "",
        eq: (v1, v2) => String(v1) === String(v2),
        add: (v1, v2) => parseInt(v1) + parseInt(v2),
        string: (v) => String(v),
        not: (v) => !v,
        or: (v1, v2) => v1 || v2
    }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'web/site/views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'web/site/public')));

const gameData = DataInit();
const gameServices = ServicesInit(gameData);
const webSite = SiteInit(gameServices, gameData, io);

app.use(webSite.sessionMiddleware);
webSite.setupRoutes(app);

io.on('connection', (socket) => {
    const cookieHeader = socket.request.headers.cookie;
    let userId = null;
    
    if (cookieHeader) {
        const cookies = cookieHeader.split(';').map(c => c.trim().split('='));
        const userCookie = cookies.find(c => c[0] === 'userId');
        if (userCookie) userId = userCookie[1];
    }

    if (userId) {
        gameData.setPlayerOnline(userId, true);
        const player = gameData.getPlayer(userId);
        if (player?.roomId) {
            socket.join(player.roomId);
            webSite.broadcastSync(player.roomId, 'player_update');
        }
    }

    socket.on('disconnect', () => {
        if (userId) {
            gameData.setPlayerOnline(userId, false);
            const player = gameData.getPlayer(userId);
            if (player?.roomId) {
                webSite.broadcastSync(player.roomId, 'player_update');
            }
        }
    });
});

server.listen(3750, () => console.log('🚀 Arena Online: http://localhost:3750'));