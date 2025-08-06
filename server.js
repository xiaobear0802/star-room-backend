// server.js

// 引入必要的模組
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // 引入 path 模組來處理靜態檔案路徑

// 引入自定義的路由
const adminRoutes = require('./routes/adminRoutes'); // 假設 adminRoutes.js 存在
const roomRoutes = require('./routes/roomRoutes');
const messageRoutes = require('./routes/messageRoutes'); // 假設 messageRoutes.js 存在
const userRoutes = require('./routes/userRoutes'); // 假設 userRoutes.js 存在

// 引入 Socket.IO 初始化函式
const initializeSocketIO = require('./socketHandlers');

// 創建 Express 應用程式實例
const app = express();
// 創建 HTTP 伺服器，將 Express 應用程式傳入
const server = http.createServer(app);
// 初始化 Socket.IO，並將 HTTP 伺服器傳入
const io = new Server(server, {
    cors: {
        origin: "*", // 允許所有來源，在生產環境中應限制為您的前端網域 (例如: 'https://your-frontend-domain.com')
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