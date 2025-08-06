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
    origin: '*', // 允許所有來源，在生產環境中建議將其替換為您的前端域名，例如 'https://your-firebase-app.web.app'
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
}));

// **新增健康檢查路由** - 這是 Render 平台正常運行的關鍵！
app.get('/', (req, res) => {
    res.status(200).send('Service is healthy');
});

// MongoDB 連線資訊，確保在生產環境中是安全的
// 建議將此連接字串儲存在 Render 的環境變數中，而不是直接寫在程式碼裡
// 例如，在 Render 環境變數中設定 MONGO_URI = 'mongodb+srv://xiaobear:Qaz74109630@cluster0.bc8amjp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
const mongoUri = process.env.MONGO_URI || 'mongodb+srv://xiaobear:Qaz74109630@cluster0.bc8amjp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoUri)
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
這是一個通用遊戲的規則範本。
1. 遊戲目標：根據遊戲模式的不同，玩家有不同的目標。
2. 玩家數量：最少2人，最多8人。
3. 遊戲流程：
   - 房間創建者可以設定遊戲模式和最大玩家數。
   - 玩家可以加入現有房間或創建新房間。
   - 遊戲開始後，玩家將根據遊戲模式進行互動。
4. 勝利條件：
   - 根據遊戲模式而定。
5. 失敗條件：
   - 根據遊戲模式而定。
6. 特殊規則：
   - 房間密碼保護：如果房間設定了密碼，加入時需要提供正確密碼。
   - 玩家退出：玩家可以隨時退出房間，但可能影響遊戲進程。
   - 房間管理：房間創建者擁有踢出玩家和刪除房間的權限。
請根據具體的遊戲內容填充此處。
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
        // TODO: 在這裡添加玩家退出房間的邏輯，例如從房間的 players 陣列中移除玩家
        // 這需要遍歷所有房間，找到該 socket.id 所在的房間並更新
        // 範例 (需要根據您的 Room Schema 和實際需求調整):
        // (async () => {
        //     try {
        //         const rooms = await Room.find({ 'players.id': socket.id }); // 假設 players 存儲的是 { id, name } 對象
        //         for (const room of rooms) {
        //             room.players = room.players.filter(player => player.id !== socket.id);
        //             await room.save();
        //             io.to(room.roomName).emit('updatePlayers', room.players);
        //             io.emit('roomUpdated'); // 通知所有客戶端房間列表已更新
        //         }
        //     } catch (error) {
        //         console.error('Error handling disconnect:', error);
        //     }
        // })();
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
app.post('/api/update-game-mode', async (req, res) => { 
    try {
        const { roomName, gameMode } = req.body;
        const room = await Room.findOne({ roomName });
        if (!room) {
            return res.status(404).json({ success: false, message: '房間不存在。' });
        }
        room.gameMode = gameMode;
        await room.save();
        io.to(roomName).emit('updateRoomSettings', { gameMode: room.gameMode });
        res.json({ success: true, message: '遊戲模式更新成功！', room });
    } catch (error) {
        console.error('Error updating game mode:', error);
        res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
    }
});

app.post('/api/update-max-players', async (req, res) => { 
    try {
        const { roomName, maxPlayers } = req.body;
        const room = await Room.findOne({ roomName });
        if (!room) {
            return res.status(404).json({ success: false, message: '房間不存在。' });
        }
        room.maxPlayers = maxPlayers;
        await room.save();
        io.to(roomName).emit('updateRoomSettings', { maxPlayers: room.maxPlayers });
        res.json({ success: true, message: '最大玩家數更新成功！', room });
    } catch (error) {
        console.error('Error updating max players:', error);
        res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
    }
});

app.post('/api/remove-player', async (req, res) => { 
    try {
        const { roomName, playerToRemove } = req.body;
        const room = await Room.findOne({ roomName });
        if (!room) {
            return res.status(404).json({ success: false, message: '房間不存在。' });
        }
        room.players = room.players.filter(player => player !== playerToRemove);
        await room.save();
        io.to(roomName).emit('updatePlayers', room.players);
        res.json({ success: true, message: '玩家已移除！', room });
    } catch (error) {
        console.error('Error removing player:', error);
        res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
    }
});

app.post('/api/delete-room', async (req, res) => { 
    try {
        const { roomName } = req.body;
        const result = await Room.deleteOne({ roomName });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: '房間不存在或已被刪除。' });
        }
        io.emit('roomUpdated'); // 通知所有客戶端房間列表已更新
        res.json({ success: true, message: '房間已刪除！' });
    } catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
    }
});

app.post('/api/admin/remove-player', async (req, res) => { 
    try {
        const { roomName, playerToRemove, adminUsername } = req.body;
        if (!administrators.includes(adminUsername)) {
            return res.status(403).json({ success: false, message: '無權限執行此操作。' });
        }
        const room = await Room.findOne({ roomName });
        if (!room) {
            return res.status(404).json({ success: false, message: '房間不存在。' });
        }
        room.players = room.players.filter(player => player !== playerToRemove);
        await room.save();
        io.to(roomName).emit('updatePlayers', room.players);
        res.json({ success: true, message: '管理員已移除玩家！', room });
    } catch (error) {
        console.error('Error admin removing player:', error);
        res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
    }
});

app.post('/api/transfer-host', async (req, res) => { 
    try {
        const { roomName, newHostName } = req.body;
        const room = await Room.findOne({ roomName });
        if (!room) {
            return res.status(404).json({ success: false, message: '房間不存在。' });
        }
        // 確保新主持人是房間的現有玩家
        if (!room.players.includes(newHostName)) {
            return res.status(400).json({ success: false, message: '新主持人必須是房間內的玩家。' });
        }
        room.owner = newHostName;
        await room.save();
        io.to(roomName).emit('updateRoomSettings', { owner: room.owner });
        res.json({ success: true, message: '主持人已轉移！', room });
    } catch (error) {
        console.error('Error transferring host:', error);
        res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
    }
});


// 啟動伺服器
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
