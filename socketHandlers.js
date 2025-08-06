// socketHandlers.js

// 這個模組將處理所有 Socket.IO 事件
let globalIo; // 用於在其他地方訪問 io 實例，如果需要從路由中發送 Socket.IO 事件

// 定義 initializeSocketIO 函數
// 注意：這裡只使用了一種方式來定義函數 (const initializeSocketIO = ...)
// 請確保您的檔案中沒有其他重複的 'function initializeSocketIO(...)' 或 'var initializeSocketIO = ...'
const initializeSocketIO = (ioInstance) => {
    globalIo = ioInstance; // 保存 io 實例

    ioInstance.on('connection', (socket) => {
        console.log(`玩家連線：${socket.id}`);

        // 玩家加入房間事件
        socket.on('joinRoom', (roomName) => {
            socket.join(roomName);
            console.log(`玩家 ${socket.id} 加入房間：${roomName}`);
            // 可以廣播給房間內的所有玩家，例如更新玩家列表
            // globalIo.to(roomName).emit('playerJoined', { playerId: socket.id, playerName: 'someName' });
        });

        // 玩家斷線事件
        socket.on('disconnect', () => {
            console.log(`玩家斷線：${socket.id}`);
            // TODO: 在這裡添加玩家退出房間的邏輯
            // 這通常需要遍歷所有房間，找到該 socket.id 所在的房間並更新資料庫
            // 然後通知相關房間的客戶端
            // 範例 (需要根據您的 Room Schema 和實際需求調整):
            // (async () => {
            //     try {
            //         // 假設您有一個 Room 模型可以訪問
            //         // const Room = require('./models/Room'); // 如果 Room 模型在單獨的檔案中
            //         // 或者 Room 模型已經在 server.js 中定義並導出
            //
            //         // 找到所有該玩家所在的房間
            //         // const rooms = await Room.find({ 'players.id': socket.id });
            //         // for (const room of rooms) {
            //         //     // 從房間的玩家列表中移除斷線玩家
            //         //     room.players = room.players.filter(player => player.id !== socket.id);
            //         //     await room.save();
            //         //     // 通知房間內的剩餘玩家列表已更新
            //         //     globalIo.to(room.roomName).emit('updatePlayers', room.players);
            //         //     // 如果房間變空，可以考慮刪除房間或標記為空閒
            //         //     // if (room.players.length === 0) {
            //         //     //     await Room.deleteOne({ _id: room._id });
            //         //     //     globalIo.emit('roomUpdated'); // 通知所有客戶端房間列表已更新
            //         //     // }
            //         // }
            //     } catch (error) {
            //         console.error('Error handling disconnect:', error);
            //     }
            // })();
        });

        // 添加其他 Socket.IO 事件監聽器，例如遊戲事件
        // socket.on('gameAction', (data) => {
        //     console.log(`收到遊戲動作:`, data);
        //     // 處理遊戲動作並廣播給房間內的其他玩家
        //     globalIo.to(data.roomName).emit('gameUpdate', data);
        // });
    });
};

// 導出 initializeSocketIO 函數，以便在 server.js 中引入和調用
// 也導出 getIo 函數，以便在路由模組中獲取 io 實例來發送事件
module.exports = initializeSocketIO; // 只導出 initializeSocketIO 函數
// 如果您需要從路由中訪問 io 實例，可以這樣導出：
// module.exports = { initializeSocketIO, getIo };
