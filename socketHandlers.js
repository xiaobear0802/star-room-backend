        // 這個模組將處理所有 Socket.IO 事件
        let globalIo; // 用於在其他地方訪問 io 實例

        const initializeSocketIO = (ioInstance) => {
            globalIo = ioInstance; // 保存 io 實例
            ioInstance.on('connection', (socket) => {
                console.log(`玩家連線：${socket.id}`);

                socket.on('joinRoom', (roomName) => {
                    socket.join(roomName);
                    console.log(`玩家 ${socket.id} 加入房間：${roomName}`);
                    // 在這裡可以發送事件給房間內的所有玩家，例如更新玩家列表
                    // globalIo.to(roomName).emit('playerJoined', { playerId: socket.id });
                });

                socket.on('disconnect', () => {
                    console.log(`玩家斷線：${socket.id}`);
                    // 這裡添加玩家退出房間的邏輯
                    // 範例：遍歷所有房間，找到該 socket.id 所在的房間並更新
                    // 這需要訪問 Room 模型，可能需要將 Room 模型傳遞給這個模組
                    // 或者在 server.js 中處理這些 Socket.IO 相關的資料庫操作
                });

                // 添加其他 Socket.IO 事件監聽器，例如遊戲事件
                // socket.on('gameAction', (data) => {
                //     // 處理遊戲動作並廣播給房間內的其他玩家
                //     globalIo.to(data.roomName).emit('gameUpdate', data);
                // });
            });
        };

        // 導出 io 實例，以便在路由中發送 Socket.IO 事件 (如果需要)
        const getIo = () => globalIo;

        module.exports = { initializeSocketIO, getIo };
        function initializeSocketIO(io) {
  io.on('connection', socket => {
    console.log('使用者已連線:', socket.id);

    socket.on('disconnect', () => {
      console.log('使用者已離線:', socket.id);
    });

    // 你可以在這裡加入更多事件處理邏輯
  });
}

module.exports = initializeSocketIO;