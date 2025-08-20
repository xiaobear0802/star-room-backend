// server.js - 一個單一且正確的版本
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// Express 中介軟體設定
app.use(cors());
app.use(express.json());

// 帶有 CORS 設定的 Socket.IO 伺服器設定
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// MongoDB 連線
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/star-room';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB 連線成功！'))
    .catch(err => {
        console.error('MongoDB 連線錯誤:', err);
        process.exit(1);
    });

// API 路由
const roomRoutes = require('./routes/roomRoutes');
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

// Socket.IO 處理器
require('./socketHandlers')(io);

// 從 'public' 資料夾服務靜態檔案
app.use(express.static(path.join(__dirname, 'public')));

// 用於前端路由的 SPA 備用方案
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'), err => {
        if (err) {
            console.error('Error sending index.html:', err);
            res.status(500).send('找不到頁面或伺服器錯誤。');
        }
    });
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`伺服器運行在埠口 ${PORT}`);
});