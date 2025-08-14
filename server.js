// 引入所有必要的模組
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server); // <-- 關鍵步驟

// ... 你的 Express 路由 ...

io.on('connection', (socket) => {
  console.log('有使用者連線');
});

// 最後用 server.listen() 啟動伺服器
server.listen(3000, () => {
  console.log('伺服器運行在埠口 3000');
});
  // ... 處理 Socket 事件 ...
// ============================================================================
// 伺服器設定

// 設定 Express 中介軟體
app.use(cors());
app.use(express.json());

// 設定 Socket.IO 伺服器，包含 CORS 設定

// ============================================================================
// 連線到 MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/star-room';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB 連線成功！'))
    .catch(err => {
        console.error('MongoDB 連線錯誤:', err);
        process.exit(1); // 連線失敗則退出應用程式
    });

// ============================================================================
// 路由設定

// 引入並掛載您的 API 路由
const roomRoutes = require('./routes/roomRoutes');
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');
// 假設您有 adminRoutes
// const adminRoutes = require('./routes/adminRoutes');

app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
// app.use('/api/admin', adminRoutes);

// ============================================================================
// Socket.IO 處理器

// 引入 Socket.IO 處理邏輯，並將 io 實例傳遞給它
// 假設 './socketHandlers.js' 導出一個函數
require('./socketHandlers')(io);

// ============================================================================
// 靜態檔案和前端路由

// 提供靜態檔案服務 (例如 index.html, script.js, style.css)
app.use(express.static(path.join(__dirname, 'public')));

// 處理前端路由（SPA）
// 對於任何未匹配的路由，都返回 index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'), err => {
        if (err) {
            console.error('Error sending index.html:', err);
            res.status(500).send('找不到頁面或伺服器錯誤。');
        }
    });
});

// ============================================================================
// 伺服器啟動

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`伺服器運行在埠口 ${PORT}`);
    // 這裡可以放一些啟動時的初始化邏輯，例如管理員列表的印出
    const ADMIN_LIST = process.env.ADMIN_LIST
        ? process.env.ADMIN_LIST.split(',').map(name => name.trim())
        : ['admin', 'xiaobear', 'babybear'];
    console.log('伺服器啟動時：管理員列表為', ADMIN_LIST);
});