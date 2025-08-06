// routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const Room = require('../models/Room'); // 引入 Room 模型
const { ADMIN_LIST } = require('../config'); // 假設您有一個 config 檔案來管理管理員列表

// 管理員移除玩家路由
router.post('/remove-player', async (req, res) => {
    const io = req.app.get('io'); // 從 app 物件中獲取 io 實例
    try {
        const { roomName, playerToRemove, adminUsername } = req.body;
        // 使用從 server.js 傳入的 ADMIN_LIST
        if (!ADMIN_LIST.includes(adminUsername)) {
            return res.status(403).json({ success: false, message: '無權限執行此操作。' });
        }
        
        const room = await Room.findOne({ roomName });
        if (!room) {
            return res.status(404).json({ success: false, message: '房間不存在。' });
        }
        
        const initialPlayerCount = room.players.length;
        room.players = room.players.filter(player => player !== playerToRemove);
        
        if (room.players.length < initialPlayerCount) {
            await room.save();
            // 通知所有客戶端房間已更新
            io.to(roomName).emit('room_update', { roomId: room._id, players: room.players });
            res.json({ success: true, message: '管理員已移除玩家！', room });
        } else {
            res.status(400).json({ success: false, message: '玩家不在房間中。' });
        }
    } catch (error) {
        console.error('Error admin removing player:', error);
        res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
    }
});

// 管理員獲取所有房間列表路由
router.get('/rooms', async (req, res) => {
    try {
        const rooms = await Room.find({});
        res.json(rooms);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
    }
});

module.exports = router;