// routes/roomRoutes.js
const express = require('express');
const router = express.Router();
const Room = require('../models/Room'); // 引入 Room 模型

// 創建房間路由
router.post('/create-room', async (req, res) => {
    const io = req.app.get('io'); // 獲取 Socket.IO 實例
    try {
        const { userId, userName, roomName, password, gameRules } = req.body; // 從前端獲取 userId 和 userName
        if (!userId || !userName || !roomName) {
            return res.status(400).json({ success: false, message: '用戶 ID、用戶名和房間名稱不能為空。' });
        }
        const existingRoom = await Room.findOne({ roomName });
        if (existingRoom) {
            return res.status(409).json({ success: false, message: '房間名稱已存在。' });
        }
        const newRoom = new Room({
            roomName,
            password, // 實際應用中應加密密碼
            owner: userId, // 儲存 owner 的 userId
            players: [{ id: userId, name: userName }], // 儲存為物件陣列
            gameRules,
            maxPlayers: 8,
            gameMode: 'normal'
        });
        await newRoom.save();
        io.emit('room_created', { id: newRoom._id, name: newRoom.roomName, players: newRoom.players }); // 通知所有客戶端有新房間創建
        res.json({ success: true, message: '房間創建成功！', room: newRoom });
    } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
    }
});

// 加入房間路由
router.post('/join-room', async (req, res) => {
    const io = req.app.get('io'); // 獲取 Socket.IO 實例
    try {
        const { userId, userName, roomName, password } = req.body; // 從前端獲取 userId 和 userName
        if (!userId || !userName || !roomName) {
            return res.status(400).json({ success: false, message: '用戶 ID、用戶名和房間名稱不能為空。' });
        }
        const room = await Room.findOne({ roomName });
        if (!room) {
            return res.status(404).json({ success: false, message: '房間不存在。' });
        }
        if (room.password && room.password !== password) { // 實際應用中應比對加密密碼
            return res.status(401).json({ success: false, message: '密碼錯誤。' });
        }
        // 檢查玩家是否已在房間中
        const playerExists = room.players.some(player => player.id === userId);
        if (playerExists) {
            return res.status(200).json({ success: true, message: '您已在房間中。', room });
        }
        if (room.players.length >= room.maxPlayers) {
            return res.status(403).json({ success: false, message: '房間已滿。' });
        }
        room.players.push({ id: userId, name: userName }); // 儲存為物件陣列
        await room.save();
        io.to(room.roomName).emit('room_update', { roomId: room._id, players: room.players }); // 通知房間內玩家列表更新
        io.emit('room_list_update', { id: room._id, name: room.roomName, players: room.players }); // 通知所有客戶端房間列表更新
        res.json({ success: true, message: '成功加入房間！', room });
    } catch (error) {
        console.error('Error joining room:', error);
        res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
    }
});

// 更新遊戲模式路由
router.post('/update-game-mode', async (req, res) => {
    const io = req.app.get('io'); // 獲取 Socket.IO 實例
    try {
        const { roomName, gameMode, userId: requesterId } = req.body; // 獲取請求者的 userId
        const room = await Room.findOne({ roomName });
        if (!room) {
            return res.status(404).json({ success: false, message: '房間不存在。' });
        }
        // 驗證請求者是否為房間擁有者
        if (room.owner !== requesterId) {
            return res.status(403).json({ success: false, message: '只有房間擁有者才能更改遊戲模式。' });
        }
        room.gameMode = gameMode;
        await room.save();
        io.to(room.roomName).emit('room_settings_update', { gameMode: room.gameMode }); // 通知房間內玩家設定更新
        res.json({ success: true, message: '遊戲模式更新成功！', room });
    } catch (error) {
        console.error('Error updating game mode:', error);
        res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
    }
});

// 更新最大玩家數路由
router.post('/update-max-players', async (req, res) => {
    const io = req.app.get('io'); // 獲取 Socket.IO 實例
    try {
        const { roomName, maxPlayers, userId: requesterId } = req.body; // 獲取請求者的 userId
        const room = await Room.findOne({ roomName });
        if (!room) {
            return res.status(404).json({ success: false, message: '房間不存在。' });
        }
        // 驗證請求者是否為房間擁有者
        if (room.owner !== requesterId) {
            return res.status(403).json({ success: false, message: '只有房間擁有者才能更改最大玩家數。' });
        }
        if (maxPlayers < room.players.length) {
            return res.status(400).json({ success: false, message: '最大玩家數不能小於當前玩家數。' });
        }
        room.maxPlayers = maxPlayers;
        await room.save();
        io.to(room.roomName).emit('room_settings_update', { maxPlayers: room.maxPlayers }); // 通知房間內玩家設定更新
        res.json({ success: true, message: '最大玩家數更新成功！', room });
    } catch (error) {
        console.error('Error updating max players:', error);
        res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
    }
});

// 移除玩家路由 (由房主執行)
router.post('/remove-player', async (req, res) => {
    const io = req.app.get('io'); // 獲取 Socket.IO 實例
    try {
        const { roomName, playerToRemoveId, userId: requesterId } = req.body; // 獲取要移除的玩家 ID 和請求者的 userId
        const room = await Room.findOne({ roomName });
        if (!room) {
            return res.status(404).json({ success: false, message: '房間不存在。' });
        }
        // 驗證請求者是否為房間擁有者
        if (room.owner !== requesterId) {
            return res.status(403).json({ success: false, message: '只有房間擁有者才能移除玩家。' });
        }
        // 確保不能移除自己
        if (playerToRemoveId === requesterId) {
            return res.status(400).json({ success: false, message: '不能移除自己。請使用退出房間功能。' });
        }

        const initialPlayerCount = room.players.length;
        room.players = room.players.filter(player => player.id !== playerToRemoveId);

        if (room.players.length < initialPlayerCount) {
            await room.save();
            io.to(room.roomName).emit('room_update', { roomId: room._id, players: room.players }); // 通知房間內玩家列表更新
            io.to(playerToRemoveId).emit('kicked_from_room', { roomName }); // 通知被移除的玩家
            res.json({ success: true, message: '玩家已移除！', room });
        } else {
            res.status(400).json({ success: false, message: '玩家不在房間中。' });
        }
    } catch (error) {
        console.error('Error removing player:', error);
        res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
    }
});

// 刪除房間路由 (由房主執行)
router.post('/delete-room', async (req, res) => {
    const io = req.app.get('io'); // 獲取 Socket.IO 實例
    try {
        const { roomName, userId: requesterId } = req.body; // 獲取請求者的 userId
        const room = await Room.findOne({ roomName });
        if (!room) {
            return res.status(404).json({ success: false, message: '房間不存在或已被刪除。' });
        }
        // 驗證請求者是否為房間擁有者
        if (room.owner !== requesterId) {
            return res.status(403).json({ success: false, message: '只有房間擁有者才能刪除房間。' });
        }

        const result = await Room.deleteOne({ roomName });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: '房間不存在或已被刪除。' });
        }
        io.emit('room_deleted', { roomName }); // 通知所有客戶端房間已被刪除
        res.json({ success: true, message: '房間已刪除！' });
    } catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
    }
});

// 轉移主持人路由 (由房主執行)
router.post('/transfer-host', async (req, res) => {
    const io = req.app.get('io'); // 獲取 Socket.IO 實例
    try {
        const { roomName, newHostId, userId: requesterId } = req.body; // 獲取新主持人 ID 和請求者的 userId
        const room = await Room.findOne({ roomName });
        if (!room) {
            return res.status(404).json({ success: false, message: '房間不存在。' });
        }
        // 驗證請求者是否為房間擁有者
        if (room.owner !== requesterId) {
            return res.status(403).json({ success: false, message: '只有房間擁有者才能轉移主持人。' });
        }
        // 確保新主持人是房間的現有玩家
        const newHostPlayer = room.players.find(player => player.id === newHostId);
        if (!newHostPlayer) {
            return res.status(400).json({ success: false, message: '新主持人必須是房間內的玩家。' });
        }
        room.owner = newHostId; // 儲存新主持人的 userId
        await room.save();
        io.to(room.roomName).emit('room_settings_update', { owner: room.owner }); // 通知房間內玩家設定更新
        res.json({ success: true, message: '主持人已轉移！', room });
    } catch (error) {
        console.error('Error transferring host:', error);
        res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
    }
});

module.exports = router;