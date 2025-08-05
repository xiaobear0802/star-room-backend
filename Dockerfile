# 使用官方 Node.js 18 輕量級映像檔作為基礎
FROM node:18-alpine

# 設定工作目錄為 /app
WORKDIR /app

# 將 package.json 和 package-lock.json 複製到工作目錄
# 這樣可以利用 Docker 的快取機制，如果依賴沒變，就不會重新安裝
COPY package*.json ./

# 安裝所有依賴
RUN npm install

# 將所有應用程式檔案複製到工作目錄
COPY . .

# 暴露應用程式監聽的埠號
# Cloud Run 會自動處理埠號映射，但這是容器的最佳實踐
EXPOSE 8080 

# 定義啟動容器時執行的命令
# 這裡假設您的主檔案是 server.js
CMD ["npm", "start"]
