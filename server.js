const dns = require('dns');
// 移除這行，在生產環境中通常不需要，且可能導致問題
// dns.setDefaultResultOrder('ipv4first'); 

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
// Render 會通過 PORT 環境變數指定埠號
const port = process.env.PORT || 10000; // Render 通常使用 10000 埠，也可以是其他，但使用 process.env.PORT 最保險

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // 允許所有來源，在生產環境中建議指定您的前端域名
        methods: ["GET", "POST"]
    }
});

const administrators = ['admin', 'manager', 'admin_name']; 
console.log('伺服器啟動時：管理員列表為', administrators);

// 確保靜態檔案路徑正確，在容器中，應用程式根目錄就是容器根目錄
app.use(express.static(path.join(__dirname))); 
app.use(bodyParser.json());

app.use(cors({
    origin: '*', // 允許所有來源，在生產環境中建議指定您的前端域名
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
}));

// MongoDB 連線資訊，確保在生產環境中是安全的
mongoose.connect('mongodb+srv://xiaobear:Qaz74109630@cluster0.bc8amjp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
    .then(() => {
        console.log('Successfully connected to MongoDB.');
    })
    .catch(err => {
        console.error('Connection error:', err);
    });

// 定義詳細的預設遊戲規則 (此部分內容省略，因為與部署無關)
const DEFAULT_DETAILED_GAME_RULES = `
... (您的遊戲規則內容) ...
`;

const roomSchema = new mongoose.Schema({
    roomName: String,
    password: String,
    players: {
        type: [String],
        default: []
    },
    owner: String, 
    maxPlayers: {
        type: Number,
        default: 8 
    },
    gameRules: {
        type: String,
        default: DEFAULT_DETAILED_GAME_RULES 
    },
    gameMode: {
        type: String,
        default: 'normal'
    }
});

const Room = mongoose.model('Room', roomSchema);

io.on('connection', (socket) => {
    console.log(`玩家連線：${socket.id}`);

    socket.on('joinRoom', (roomName) => {
        socket.join(roomName);
        console.log(`玩家 ${socket.id} 加入房間：${roomName}`);
    });

    socket.on('disconnect', () => {
        console.log(`玩家斷線：${socket.id}`);
    });
});

// 注意：在 Render 中，通常不會直接提供靜態檔案（如 index.html），
// 靜態檔案由 Firebase Hosting 提供。這個路由可能不需要。
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API 路由 (省略詳細內容，與部署無關)
app.post('/api/create-room', async (req, res) => { /* ... */ });
app.post('/api/join-room', async (req, res) => { /* ... */ });
app.get('/api/admin/rooms', async (req, res) => { /* ... */ });
app.post('/api/update-game-mode', async (req, res) => { /* ... */ });
app.post('/api/update-max-players', async (req, res) => { /* ... */ });
app.post('/api/remove-player', async (req, res) => { /* ... */ });
app.post('/api/delete-room', async (req, res) => { /* ... */ });
app.post('/api/admin/remove-player', async (req, res) => { /* ... */ });
app.post('/api/transfer-host', async (req, res) => { /* ... */ });


// 啟動伺服器
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
