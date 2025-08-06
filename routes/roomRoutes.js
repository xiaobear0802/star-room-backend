        const express = require('express');
        const router = express.Router();
        const mongoose = require('mongoose');

        // 引入 Room 模型 (假設 Room 模型在 models/Room.js)
        // const Room = require('../models/Room'); 
        // 或者直接在這裡定義 Room 模型，但建議分開
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

        // 創建房間路由
        router.post('/create-room', async (req, res) => {
            try {
                const { username, roomName, password, gameRules } = req.body;
                if (!username || !roomName) {
                    return res.status(400).json({ success: false, message: '用戶名和房間名稱不能為空。' });
                }
                const existingRoom = await Room.findOne({ roomName });
                if (existingRoom) {
                    return res.status(409).json({ success: false, message: '房間名稱已存在。' });
                }
                const newRoom = new Room({
                    roomName,
                    password, // 實際應用中應加密密碼
                    owner: username,
                    players: [username],
                    gameRules,
                    maxPlayers: 8, // 預設值
                    gameMode: 'normal' // 預設值
                });
                await newRoom.save();
                // io.emit('roomUpdated'); // 這裡需要 Socket.IO 實例
                res.json({ success: true, message: '房間創建成功！', room: newRoom });
            } catch (error) {
                console.error('Error creating room:', error);
                res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
            }
        });

        // 加入房間路由
        router.post('/join-room', async (req, res) => {
            try {
                const { username, roomName, password } = req.body;
                if (!username || !roomName) {
                    return res.status(400).json({ success: false, message: '用戶名和房間名稱不能為空。' });
                }
                const room = await Room.findOne({ roomName });
                if (!room) {
                    return res.status(404).json({ success: false, message: '房間不存在。' });
                }
                if (room.password && room.password !== password) { // 實際應用中應比對加密密碼
                    return res.status(401).json({ success: false, message: '密碼錯誤。' });
                }
                if (room.players.includes(username)) {
                    return res.status(200).json({ success: true, message: '您已在房間中。', room });
                }
                if (room.players.length >= room.maxPlayers) {
                    return res.status(403).json({ success: false, message: '房間已滿。' });
                }
                room.players.push(username);
                await room.save();
                // io.to(roomName).emit('updatePlayers', room.players); // 這裡需要 Socket.IO 實例
                // io.emit('roomUpdated'); // 這裡需要 Socket.IO 實例
                res.json({ success: true, message: '成功加入房間！', room });
            } catch (error) {
                console.error('Error joining room:', error);
                res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
            }
        });

        // 更新遊戲模式路由
        router.post('/update-game-mode', async (req, res) => { 
            try {
                const { roomName, gameMode } = req.body;
                const room = await Room.findOne({ roomName });
                if (!room) {
                    return res.status(404).json({ success: false, message: '房間不存在。' });
                }
                room.gameMode = gameMode;
                await room.save();
                // io.to(roomName).emit('updateRoomSettings', { gameMode: room.gameMode }); // 這裡需要 Socket.IO 實例
                res.json({ success: true, message: '遊戲模式更新成功！', room });
            } catch (error) {
                console.error('Error updating game mode:', error);
                res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
            }
        });

        // 更新最大玩家數路由
        router.post('/update-max-players', async (req, res) => { 
            try {
                const { roomName, maxPlayers } = req.body;
                const room = await Room.findOne({ roomName });
                if (!room) {
                    return res.status(404).json({ success: false, message: '房間不存在。' });
                }
                room.maxPlayers = maxPlayers;
                await room.save();
                // io.to(roomName).emit('updateRoomSettings', { maxPlayers: room.maxPlayers }); // 這裡需要 Socket.IO 實例
                res.json({ success: true, message: '最大玩家數更新成功！', room });
            } catch (error) {
                console.error('Error updating max players:', error);
                res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
            }
        });

        // 移除玩家路由
        router.post('/remove-player', async (req, res) => { 
            try {
                const { roomName, playerToRemove } = req.body;
                const room = await Room.findOne({ roomName });
                if (!room) {
                    return res.status(404).json({ success: false, message: '房間不存在。' });
                }
                room.players = room.players.filter(player => player !== playerToRemove);
                await room.save();
                // io.to(roomName).emit('updatePlayers', room.players); // 這裡需要 Socket.IO 實例
                res.json({ success: true, message: '玩家已移除！', room });
            } catch (error) {
                console.error('Error removing player:', error);
                res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
            }
        });

        // 刪除房間路由
        router.post('/delete-room', async (req, res) => { 
            try {
                const { roomName } = req.body;
                const result = await Room.deleteOne({ roomName });
                if (result.deletedCount === 0) {
                    return res.status(404).json({ success: false, message: '房間不存在或已被刪除。' });
                }
                // io.emit('roomUpdated'); // 這裡需要 Socket.IO 實例
                res.json({ success: true, message: '房間已刪除！' });
            } catch (error) {
                console.error('Error deleting room:', error);
                res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
            }
        });

        // 轉移主持人路由
        router.post('/transfer-host', async (req, res) => { 
            try {
                const { roomName, newHostName } = req.body;
                const room = await Room.findOne({ roomName });
                if (!room) {
                    return res.status(404).json({ success: false, message: '房間不存在。' });
                }
                // 確保新主持人是房間的現有玩家
                if (!room.players.includes(newHostName)) {
                    return res.status(400).json({ success: false, message: '新主持人必須是房間內的玩家。' });
                }
                room.owner = newHostName;
                await room.save();
                // io.to(roomName).emit('updateRoomSettings', { owner: room.owner }); // 這裡需要 Socket.IO 實例
                res.json({ success: true, message: '主持人已轉移！', room });
            } catch (error) {
                console.error('Error transferring host:', error);
                res.status(500).json({ success: false, message: '伺服器內部錯誤。' });
            }
        });

        module.exports = router;
        