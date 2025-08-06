// server.js

// 引入必要的模組
const express = require('express');
const http = require('http');
const { Server } = require('socket.io'); // 修正：使用解構賦值以獲得更清晰的程式碼
const mongoose = require('mongoose');
const cors = require('cors'); // 引入 cors 模組
const initializeSocketIO = require('./socketHandlers'); // 引入 socketHandlers 模組

// 引入路由
const roomRoutes = require('./routes/roomRoutes');

// 創建 Express 應用程式實例
const app = express();
// 創建 HTTP 伺服器，將 Express 應用程式傳入
const server = http.createServer(app);
// 初始化 Socket.IO，並將 HTTP 伺服器傳入
const io = new Server(server, { // 修正：使用 new Server 進行初始化
    cors: {
        origin: "*", // 允許所有來源，在生產環境中應限制為您的前端網域
        methods: ["GET", "POST"]
    }
});

// 使用 CORS 中介軟體
app.use(cors());

// 讓 Express 能夠解析 JSON 格式的請求主體
app.use(express.json());

// ============================================================================
// MongoDB 連線
// 從環境變數中獲取 MongoDB URI
// 在 Render 上，您需要在 Environment Variables 中設定 MONGODB_URI
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB 連線成功！'))
    .catch(err => console.error('MongoDB 連線錯誤:', err));

// ============================================================================
// 初始化 Socket.IO 處理器
initializeSocketIO(io);

// ============================================================================
// 路由設定
// 將房間相關的路由掛載到 /api/rooms 路徑下
app.use('/api/rooms', roomRoutes);

// 根路由，用於測試伺服器是否正常運行
app.get('/', (req, res) => {
    res.send('Star Room Backend API is running!');
});

// 錯誤處理中介軟體 (可選，但推薦)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// 監聽埠口
// Render 會在 process.env.PORT 中提供一個埠口。如果沒有，則使用 3000。
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`伺服器運行在埠口 ${PORT}`);
    // 修正：從環境變數中讀取管理員列表，如果不存在則使用預設值
    const ADMIN_LIST = process.env.ADMIN_LIST
        ? process.env.ADMIN_LIST.split(',').map(name => name.trim())
        : ['admin', 'xiaobear', 'babybear'];
    console.log('伺服器啟動時：管理員列表為', ADMIN_LIST);
});