// socketHandlers.js

// 用於儲存所有活躍房間的物件
// 鍵是 roomName，值是房間的詳細資訊
const rooms = {};

module.exports = function(io) {
    io.on('connection', (socket) => {
        console.log('一個用戶已連線:', socket.id);

        // 當客戶端連線時，發送當前房間列表
        socket.emit('updateRoomList', getPublicRoomData());

        // 處理客戶端請求房間列表的事件
        socket.on('getRoomList', () => {
            socket.emit('updateRoomList', getPublicRoomData());
        });

        // 處理創建房間的事件
        socket.on('createRoom', ({ roomName, username, password, isPublic }) => {
            if (rooms[roomName]) {
                socket.emit('roomError', `房間 "${roomName}" 已存在。`);
                return;
            }

            // 確保公開房間沒有密碼
            if (isPublic && password) {
                socket.emit('roomError', '公開房間不能設置密碼。');
                return;
            }

            // 如果不是公開房間，但沒有提供密碼，則提示
            if (!isPublic && !password) {
                socket.emit('roomError', '私人房間必須設置密碼。');
                return;
            }

            rooms[roomName] = {
                roomName,
                creatorId: socket.id,
                creatorName: username, // 儲存創建者名稱
                password: isPublic ? null : password, // 如果是公開，密碼為 null
                isPublic: isPublic,
                players: [{ id: socket.id, username: username }] // 將創建者加入房間
            };
            socket.join(roomName); // 將 socket 加入到該房間的頻道

            socket.emit('roomJoined', { roomName });
            console.log(`房間 "${roomName}" 已由 ${username} 創建。公開: ${isPublic}`);

            // 廣播更新的房間列表給所有客戶端
            io.emit('updateRoomList', getPublicRoomData());
        });

        // 處理加入房間的事件
        socket.on('joinRoom', ({ roomName, username, password }) => {
            const room = rooms[roomName];

            if (!room) {
                socket.emit('roomError', `房間 "${roomName}" 不存在。`);
                return;
            }

            // 檢查是否已在房間內
            if (room.players.some(player => player.id === socket.id)) {
                socket.emit('roomJoined', { roomName }); // 重新確認已在房間內
                return;
            }

            // 如果房間是私人的，檢查密碼
            if (!room.isPublic && room.password !== password) {
                socket.emit('roomError', '密碼錯誤。');
                return;
            }

            room.players.push({ id: socket.id, username: username });
            socket.join(roomName); // 將 socket 加入到該房間的頻道

            socket.emit('roomJoined', { roomName });
            console.log(`${username} 已加入房間 "${roomName}"。`);

            // 廣播更新的房間列表給所有客戶端
            io.emit('updateRoomList', getPublicRoomData());
            // 也可以廣播給房間內的玩家，例如 'playerJoined' 事件
            // io.to(roomName).emit('playerJoined', { username: username, id: socket.id });
        });

        // 處理用戶斷線
        socket.on('disconnect', () => {
            console.log('一個用戶已斷線:', socket.id);

            // 檢查用戶是否在任何房間內
            for (const roomName in rooms) {
                const room = rooms[roomName];
                const playerIndex = room.players.findIndex(player => player.id === socket.id);

                if (playerIndex !== -1) {
                    const disconnectedPlayer = room.players[playerIndex];
                    room.players.splice(playerIndex, 1); // 從房間中移除玩家
                    console.log(`${disconnectedPlayer.username} 已離開房間 "${roomName}"。`);

                    // 如果房間沒有玩家了，則刪除房間
                    if (room.players.length === 0) {
                        delete rooms[roomName];
                        console.log(`房間 "${roomName}" 已被刪除，因為沒有玩家了。`);
                    }
                    // 廣播更新的房間列表給所有客戶端
                    io.emit('updateRoomList', getPublicRoomData());
                    // 也可以廣播給房間內的玩家，例如 'playerLeft' 事件
                    // io.to(roomName).emit('playerLeft', { username: disconnectedPlayer.username, id: disconnectedPlayer.id });
                    break; // 每個 socket 只會屬於一個房間，找到後即可退出迴圈
                }
            }
        });
    });

    // 輔助函數：獲取公開的房間資訊 (不包含密碼)
    function getPublicRoomData() {
        return Object.values(rooms).map(room => ({
            roomName: room.roomName,
            creatorName: room.creatorName,
            isPublic: room.isPublic,
            playerCount: room.players.length // 可以顯示房間人數
        }));
    }
};
