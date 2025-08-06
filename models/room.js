// models/Room.js
const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    roomName: { type: String, required: true, unique: true },
    password: { type: String }, // 實際應用中應儲存雜湊後的密碼
    players: {
        type: [{
            id: { type: String, required: true },
            name: { type: String, required: true }
        }],
        default: []
    },
    owner: { type: String, required: true }, // 儲存 owner 的 userId
    maxPlayers: { type: Number, default: 8 },
    gameRules: { type: String, default: 'Default rules' },
    gameMode: { type: String, default: 'normal' },
    createdAt: { type: Date, default: Date.now }
});

const Room = mongoose.models.Room || mongoose.model('Room', roomSchema);
module.exports = Room;