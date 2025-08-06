const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path'); // 雖然不再用於靜態檔案，但其他地方可能需要

const app = express();
// Render 會通過 PORT 環境變數指定埠號
const port = process.env.PORT || 10000; // 使用 process.env.PORT 最保險，10000 是常見的 Render 預設值

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // 允許所有來源，在生產環境中建議指定您的前端域名 (例如 'https://your-firebase-app.web.app')
        methods: ["GET", "POST"]
    }
});

const administrators = ['admin', 'manager', 'admin_name']; 
console.log('伺服器啟動時：管理員列表為', administrators);

// 移除靜態檔案服務和根路由處理，因為前端由 Firebase Hosting 提供
// app.use(express.static(path.join(__dirname))); 
// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, 'index.html'));
// });

app.use(bodyParser.json());

// 再次設定 CORS，確保所有路由都應用此規則
app.use(cors({
    origin: '*', // 允許所有來源，在生產環境中建議指定您的前端域名
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
}));

// MongoDB 連線資訊，確保在生產環境中是安全的
// 建議將此連接字串儲存在 Render 的環境變數中，而不是直接寫在程式碼裡
mongoose.connect('mongodb+srv://xiaobear:Qaz74109630@cluster0.bc8amjp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
    .then(() => {
        console.log('Successfully connected to MongoDB.');
    })
    .catch(err => {
        console.error('Connection error to MongoDB:', err);
        // 在生產環境中，如果資料庫連接失敗，您可能希望停止伺服器啟動
        // process.exit(1); 
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
        // 在這裡添加玩家退出房間的邏輯，例如從房間的 players 陣列中移除玩家
        // 這需要遍歷所有房間，找到該 socket.id 所在的房間並更新
    });
});

// API 路由 (請確保這些路由在您的後端程式碼中是完整的)
app.post('/api/create-room', async (req, res) => { 
    // 這裡應該有完整的房間創建邏輯
    try {
        const { username, roomName, password, gameRules } = req.body;
        if (!username || !roomName) {
            return res.status(400).json({ success: false, message: '用戶名和房間名稱不能為空。' });
        }
        const existingRoom = await Room.findOne({ roomName });
        if (existingRoom) {
            return res.status(409).json({ success: false, message: '房間名稱已存在。' });
        }
        const newRoom = new Room({
            roomName,
            password, // 實際應用中應加密密碼
            owner: username,
            players: [username],
            gameRules,
            maxPlayers: 8, // 預設值
            gameMode: 'normal' // 預設值
        });
        await newRoom.save();
        io.emit('roomUpdated'); // 通知所有客戶端房間列表已更新
        res.json({ success: true, message: '房間創建成功！', room: newRoom });
    } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
    }
});

app.post('/api/join-room', async (req, res) => { 
    // 這裡應該有完整的加入房間邏輯
    try {
        const { username, roomName, password } = req.body;
        if (!username || !roomName) {
            return res.status(400).json({ success: false, message: '用戶名和房間名稱不能為空。' });
        }
        const room = await Room.findOne({ roomName });
        if (!room) {
            return res.status(404).json({ success: false, message: '房間不存在。' });
        }
        if (room.password && room.password !== password) { // 實際應用中應比對加密密碼
            return res.status(401).json({ success: false, message: '密碼錯誤。' });
        }
        if (room.players.includes(username)) {
            return res.status(200).json({ success: true, message: '您已在房間中。', room });
        }
        if (room.players.length >= room.maxPlayers) {
            return res.status(403).json({ success: false, message: '房間已滿。' });
        }
        room.players.push(username);
        await room.save();
        io.to(roomName).emit('updatePlayers', room.players); // 通知房間內玩家列表更新
        io.emit('roomUpdated'); // 通知所有客戶端房間列表已更新
        res.json({ success: true, message: '成功加入房間！', room });
    } catch (error) {
        console.error('Error joining room:', error);
        res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
    }
});

app.get('/api/admin/rooms', async (req, res) => { 
    // 這裡應該有完整的獲取所有房間列表邏輯
    try {
        const rooms = await Room.find({});
        res.json(rooms);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
    }
});

// 確保以下 API 路由也有完整的實現
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
