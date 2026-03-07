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
        eq: (v1, v2) => String(v1) === String(v2)
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
    socket.on('join_room_socket', (code) => { if (code) socket.join(code); });
});

server.listen(3750, () => console.log('🚀 GIFWARS Arena ON: http://localhost:3750'));