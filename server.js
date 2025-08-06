// 引入所需的模組
const express = require('express'); // Express.js 框架
const http = require('http'); // Node.js 內建的 HTTP 模組
const mongoose = require('mongoose'); // MongoDB ORM
const { Server } = require('socket.io'); // Socket.IO 伺服器
const cors = require('cors'); // 處理跨域請求
const path = require('path'); // 處理檔案路徑

// 引入自定義的路由和 Socket.IO 處理函數
const roomRoutes = require('./routes/roomRoutes');
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');
const initializeSocketIO = require('./socketHandlers');

// 創建 Express 應用程式實例
const app = express();

// 設定伺服器監聽的端口
// 優先使用環境變數 PORT，如果沒有則預設為 10000
const PORT = process.env.PORT || 10000;

// 設定 MongoDB 連接字串
// **重要：在 Render 上部署時，您必須設定 MONGO_URI 環境變數為您的雲端 MongoDB 連線字串。**
// 如果未設定，它將嘗試連接到本地的 MongoDB (localhost:27017)，這在雲端部署環境中會失敗。
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/star-room';

// 設定管理員列表 (從環境變數讀取，如果沒有則使用預設值)
const ADMIN_LIST = process.env.ADMIN_LIST ? process.env.ADMIN_LIST.split(',') : ['admin', 'xiaobear', 'babybear'];

// 將管理員列表添加到 app.locals，以便在路由中訪問
app.locals.adminList = ADMIN_LIST;

console.log('伺服器啟動時：管理員列表為', ADMIN_LIST); // 輸出管理員列表

// 中間件設定
app.use(cors()); // 啟用所有 CORS 請求
app.use(express.json()); // 解析 JSON 格式的請求體

// 設定靜態檔案服務
// 這裡假設您的前端建置檔案位於後端專案根目錄下的 'public' 資料夾。
// 如果您的前端建置輸出在其他地方 (例如 'client/build')，您需要調整此路徑。
// 例如：app.use(express.static(path.join(__dirname, '../client/build')));
app.use(express.static(path.join(__dirname, 'public')));

// 路由設定
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

// 健康檢查路由
// **重要修改：處理根路徑，使其提供前端的 index.html**
// 這個路由必須放在所有 API 路由之後，以確保 API 請求不會被它捕獲。
app.get('*', (req, res) => {
    // 檢查 public 資料夾中是否存在 index.html
    const indexPath = path.join(__dirname, 'public', 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('發送 index.html 失敗:', err);
            // 如果找不到 index.html，則發送一個錯誤訊息或健康檢查訊息
            res.status(500).send('無法找到前端應用程式。請確保前端檔案已建置並放置在正確的靜態檔案目錄中。');
        }
    });
});


// 創建 HTTP 伺服器
const server = http.createServer(app);

// 初始化 Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*", // 允許所有來源，生產環境應限制為您的前端 URL
    methods: ["GET", "POST"]
  }
});

initializeSocketIO(io); // 傳遞 io 實例給 Socket.IO 處理函數

// 連接到 MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB.');
    // 只有當這個檔案作為主模組運行時才啟動伺服器
    // 這可以防止在測試或其他情況下被多次調用 listen 方法
    if (require.main === module) {
      server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
      });
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // 連接失敗時退出應用程式
  });

// 處理未捕獲的異常
process.on('unhandledRejection', (reason, promise) => {
  console.error('未處理的拒絕:', reason);
  // 應用程式可能處於不穩定狀態，可以選擇退出
  // process.exit(1);
});

process.on('uncaughtException', err => {
  console.error('未捕獲的異常:', err);
  // 應用程式可能處於不穩定狀態，可以選擇退出
  // process.exit(1);
});

// 導出 app 和 server，以便在測試或外部模組中使用 (可選)
module.exports = { app, server };
