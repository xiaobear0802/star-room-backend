const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);

// 假設這是一個簡單的 API 路由
app.get('/', (req, res) => {
  res.send('Hello, server is running!');
});

const PORT = 3000;

// 啟動伺服器並監聽指定端口
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// --- 這裡是如何關閉伺服器的程式碼 ---

// 設置一個定時器，在 10 秒後關閉伺服器
setTimeout(() => {
  console.log('Stopping the server...');
  
  // 呼叫 server.close() 來停止伺服器
  server.close(() => {
    console.log('Server has been successfully stopped.');
    // 這裡可以放置在伺服器關閉後需要執行的程式碼
    // 例如：退出程式
    process.exit(0);
  });
}, 10000); // 10000 毫秒 = 10 秒