        const express = require('express');
        const router = express.Router();

        // 引入 Room 模型 (假設 Room 模型在 models/Room.js)
        // const Room = require('../models/Room'); 
        // 或者直接在這裡定義 Room 模型，但建議分開
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
        const roomSchema = new mongoose.Schema({
            roomName: String,
            password: String,
            players: { type: [String], default: [] },
            owner: String, 
            maxPlayers: { type: Number, default: 8 },
            gameRules: { type: String, default: 'Default rules' },
            gameMode: { type: String, default: 'normal' }
        });
        const Room = mongoose.models.Room || mongoose.model('Room', roomSchema);


        // 假設管理員列表從 server.js 傳遞或從環境變數獲取
        // 這裡暫時硬編碼，實際應從 server.js 獲取或環境變數
        const ADMINISTRATORS = ['admin', 'manager', 'admin_name']; 

        // 管理員移除玩家路由
        router.post('/remove-player', async (req, res) => {
            try {
                const { roomName, playerToRemove, adminUsername } = req.body;
                if (!ADMINISTRATORS.includes(adminUsername)) {
                    return res.status(403).json({ success: false, message: '無權限執行此操作。' });
                }
                const room = await Room.findOne({ roomName });
                if (!room) {
                    return res.status(404).json({ success: false, message: '房間不存在。' });
                }
                room.players = room.players.filter(player => player !== playerToRemove);
                await room.save();
                // 這裡需要 Socket.IO 實例來發送更新，但路由模組通常不直接訪問 io
                // 您可能需要將 Socket.IO 實例傳遞給路由，或者使用事件發射器
                res.json({ success: true, message: '管理員已移除玩家！', room });
            } catch (error) {
                console.error('Error admin removing player:', error);
                res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
            }
        });

        // 管理員獲取所有房間列表路由 (您在 server.js 中已有的 /api/admin/rooms)
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
        