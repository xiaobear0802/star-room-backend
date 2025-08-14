const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// 設定 Express 中間件
app.use(require('cors')());
app.use(express.json());

// 設定 Socket.IO 伺服器，包含 CORS 設定
// 這裡只初始化一次
const io = new Server(server, {
  cors: {
    origin: "*", // 允許所有來源，在開發環境中很有用
    methods: ["GET", "POST"]
  }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Successfully connected to MongoDB.'))
    .catch(err => console.error('Connection error', err));

// Serve static files from the 'public' directory
// This is where your front-end HTML, CSS, and JS files would be
app.use(express.static(path.join(__dirname, 'public')));

// Use your custom API routes
// The path parameter defines the base URL for these routes
app.use('/api/rooms', require('./routes/roomRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

// Pass the Socket.IO instance to your handlers
require('./socketHandlers')(io);

// Define the port from environment variables or use a default

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
// 使用 CORS 中介軟體
app.use(cors());

// 讓 Express 能夠解析 JSON 格式的請求主體
app.use(express.json());

// ============================================================================
// MongoDB 連線
// 從環境變數中獲取 MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/star-room'; // 添加本地預設值方便開發

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB 連線成功！'))
    .catch(err => {
        console.error('MongoDB 連線錯誤:', err);
        process.exit(1); // 連線失敗則退出應用程式
    });

// ============================================================================
// 初始化 Socket.IO 處理器
initializeSocketIO(io);

// ============================================================================
// 路由設定
// 將 Socket.IO 實例設定到 app 物件上，以便在路由中訪問
app.set('io', io);

app.use('/api/rooms', roomRoutes);
// 假設您還有其他路由，請在這裡掛載
// app.use('/api/admin', adminRoutes);
// app.use('/api/messages', messageRoutes);
// app.use('/api/users', userRoutes);

// 處理靜態檔案 (例如 index.html, script.js, style.css)
// 假設您的前端靜態檔案位於專案根目錄下的 'public' 資料夾
app.use(express.static(path.join(__dirname, 'public')));

// 處理前端路由（SPA） - 對於任何未匹配的路由，都返回 index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'), err => {
        if (err) {
            console.error('Error sending index.html:', err);
            res.status(500).send('找不到頁面或伺服器錯誤。');
        }
    });
});

// 錯誤處理中介軟體
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// 監聽埠口
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`伺服器運行在埠口 ${PORT}`);
    const ADMIN_LIST = process.env.ADMIN_LIST
        ? process.env.ADMIN_LIST.split(',').map(name => name.trim())
        : ['admin', 'xiaobear', 'babybear']; // 預設管理員列表
    console.log('伺服器啟動時：管理員列表為', ADMIN_LIST);
});