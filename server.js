// 引入必要的模組
const express = require('express');
// 正確範例：從環境變數讀取
const mongoose = require('mongoose');

// 確保連線字串來自環境變數
const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI, {
  // ... 其他選項
}).then(() => {
  console.log('MongoDB 連線成功！');
}).catch(err => {
  console.error('MongoDB 連線錯誤:', err);
});
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

// 引入自定義的路由
const adminRoutes = require('./routes/adminRoutes');
const roomRoutes = require('./routes/roomRoutes');
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');

// 引入 Socket.IO 初始化函式
const initializeSocketIO = require('./socketHandlers');

// 創建 Express 應用程式實例
const app = express();

// 設定伺服器監聽的端口
const PORT = process.env.PORT || 10000;

// 設定 MongoDB 連接字串
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/star-room';

// 設定管理員列表
const ADMIN_LIST = process.env.ADMIN_LIST
  ? process.env.ADMIN_LIST.split(',').map(name => name.trim())
  : ['admin', 'xiaobear', 'babybear'];

// 將管理員列表添加到 app.locals
app.locals.adminList = ADMIN_LIST;
console.log('伺服器啟動時：管理員列表為', ADMIN_LIST);

// 中間件設定
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 路由設定
app.use('/api/admin', adminRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

// 處理前端路由（SPA）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), err => {
    if (err) {
      res.status(500).send(err);
    }
  });
});

// 創建 HTTP 伺服器
const server = http.createServer(app);

// 初始化 Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*", // 生產環境請改為你的前端網址
    methods: ["GET", "POST"]
  }
});

initializeSocketIO(io); // 傳遞 io 實例給 Socket.IO 處理函式

// 連接到 MongoDB 並啟動伺服器
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB.');
    if (require.main === module) {
      server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
      });
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// 處理未捕獲的異常
process.on('unhandledRejection', reason => {
  console.error('未處理的拒絕:', reason);
});

process.on('uncaughtException', err => {
  console.error('未捕獲的異常:', err);
});

// 導出 app 和 server（可選）
module.exports = { app, server };
