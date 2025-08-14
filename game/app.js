// app.js
// 這是遊戲後台伺服器的主程式，使用 Express 框架來創建 API。

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// 伺服器設定
const app = express();
const PORT = 3000;

// 中介軟體，用於解析 JSON 格式的請求體
app.use(express.json());

// ====================================================================
// 資料庫設定與初始化
// ====================================================================

// 創建一個 SQLite 資料庫檔案
const dbPath = path.join(__dirname, 'starcup_legend.db');

// 在重新啟動前，先嘗試刪除舊的資料庫檔案
try {
    fs.unlinkSync(dbPath);
    console.log('舊的資料庫檔案已刪除。');
} catch (unlinkErr) {
    // 如果檔案不存在是正常的，不理會
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('資料庫連接錯誤：', err.message);
    } else {
        console.log('成功連接到 starcup_legend.db 資料庫。');
        initializeDatabase(); // 連接成功後，執行初始化
    }
});

/**
 * 執行資料庫初始化，包括創建表格和載入靜態遊戲數據。
 */
async function initializeDatabase() {
    console.log('開始初始化資料庫...');

    // 1. 讀取 SQL 腳本以創建表格
    const sqlSchema = fs.readFileSync(path.join(__dirname, 'SQL.sql'), 'utf8');
    try {
        await runSqlScript(sqlSchema);
        console.log('資料庫表格創建完成。');

        // 2. 載入並插入靜態遊戲數據
        await seedStaticData();
        console.log('靜態遊戲數據載入完成。');
    } catch (error) {
        console.error('初始化資料庫時發生錯誤:', error);
    }
}

/**
 * 執行一個 SQL 腳本，並自動將 MySQL 語法轉換為 SQLite 語法，並移除註解。
 */
function runSqlScript(script) {
    return new Promise((resolve, reject) => {
        // 首先移除所有 --、/*...*/ 和 // 樣式的註解
        let cleanedScript = script.replace(/--.*$|\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

        // 將 MySQL 語法轉換為 SQLite 兼容的語法
        let sqliteScript = cleanedScript
            .replace(/INT PRIMARY KEY AUTO_INCREMENT/g, 'INTEGER PRIMARY KEY AUTOINCREMENT')
            .replace(/ENUM\((.*?)\)/g, 'TEXT')
            .replace(/BOOLEAN/g, 'INTEGER')
            .replace(/DEFAULT FALSE/g, 'DEFAULT 0')
            .replace(/DEFAULT TRUE/g, 'DEFAULT 1')
            .replace(/FOREIGN KEY \((.*?)\) REFERENCES (.*?)\((.*?)\)/g, 'FOREIGN KEY($1) REFERENCES $2($3)')
            .replace(/ALTER TABLE (.*?)\nADD CONSTRAINT (.*?)\nFOREIGN KEY \((.*?)\) REFERENCES (.*?)\((.*?)\)/g, '');

        // 將腳本分割成單個語句
        const statements = sqliteScript.split(';').filter(s => s.trim() !== '');

        // 除錯用途：打印清理後的 SQL 腳本
        console.log('--- 正在執行的 SQL 腳本 ---');
        console.log(statements.join(';\n'));
        console.log('---------------------------');

        // 修正時序問題：確保所有 db.run 執行完畢後才 resolve
        db.serialize(() => {
            const promises = statements.map(statement => {
                return new Promise((stmtResolve, stmtReject) => {
                    db.run(statement.trim(), (err) => {
                        if (err) {
                            console.error('執行 SQL 語句錯誤:', statement, err.message);
                            stmtReject(err);
                        } else {
                            stmtResolve();
                        }
                    });
                });
            });

            Promise.all(promises)
                .then(() => resolve())
                .catch(err => reject(err));
        });
    });
}

/**
 * 載入 JSON 檔案並將其數據插入資料庫。
 */
async function seedStaticData() {
    // 載入角色數據
    const characters = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/characters.json'), 'utf8'));
    const characterPromises = characters.map(char => {
        const { character_name, abilities, special_cards, initial_tokens } = char;
        const sql = `INSERT OR REPLACE INTO CHARACTER (character_name, abilities, special_cards, initial_tokens) VALUES (?, ?, ?, ?)`;
        return new Promise((resolve, reject) => {
            db.run(sql, [character_name, JSON.stringify(abilities), JSON.stringify(special_cards), JSON.stringify(initial_tokens)], (err) => {
                if (err) {
                    console.error('插入角色數據錯誤:', character_name, err.message);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    });
    await Promise.all(characterPromises);

    // 載入卡牌數據
    const cards = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/cards.json'), 'utf8'));
    const cardPromises = cards.map(card => {
        const { card_type, card_name, card_effect, attack_value, magic_type } = card;
        const sql = `INSERT OR REPLACE INTO CARD (card_type, card_name, card_effect, attack_value, magic_type) VALUES (?, ?, ?, ?, ?)`;
        return new Promise((resolve, reject) => {
            db.run(sql, [card_type, card_name, JSON.stringify(card_effect), attack_value, magic_type], (err) => {
                if (err) {
                    console.error('插入卡牌數據錯誤:', card_name, err.message);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    });
    await Promise.all(cardPromises);
}

// ====================================================================
// API 接口定義
// ====================================================================

// POST /games/create - 創建一個新的遊戲房間
app.post('/games/create', async (req, res) => {
    // 此處假設請求體包含玩家ID和選擇的角色ID
    const { playerId, characterId, playerName } = req.body;
    if (!playerId || !characterId || !playerName) {
        return res.status(400).send({ error: '缺少必要的參數。' });
    }

    // 簡化流程：創建一個新遊戲，自動加入兩個陣營，並將玩家設為第一個玩家
    try {
        const newGameId = await createNewGame(playerId, characterId, playerName);
        res.status(201).send({ message: '遊戲創建成功。', gameId: newGameId });
    } catch (error) {
        console.error('創建遊戲錯誤:', error);
        res.status(500).send({ error: '無法創建遊戲。' });
    }
});

// POST /games/:gameId/join - 玩家加入遊戲
app.post('/games/:gameId/join', async (req, res) => {
    const { gameId } = req.params;
    const { playerId, characterId, playerName, teamId } = req.body;
    if (!playerId || !characterId || !playerName || !teamId) {
        return res.status(400).send({ error: '缺少必要的參數。' });
    }

    try {
        await addPlayerToGame(gameId, playerId, characterId, playerName, teamId);
        res.status(200).send({ message: `玩家 ${playerName} 成功加入遊戲 ${gameId}。` });
    } catch (error) {
        console.error('玩家加入遊戲錯誤:', error);
        res.status(500).send({ error: '無法加入遊戲。' });
    }
});

// GET /games/:gameId/status - 獲取當前遊戲狀態
app.get('/games/:gameId/status', async (req, res) => {
    const { gameId } = req.params;
    try {
        const gameState = await getGameState(gameId);
        res.status(200).json(gameState);
    } catch (error) {
        console.error('獲取遊戲狀態錯誤:', error);
        res.status(500).send({ error: '無法獲取遊戲狀態。' });
    }
});

// POST /games/:gameId/action - 處理玩家的行動
app.post('/games/:gameId/action', async (req, res) => {
    const { gameId } = req.params;
    const { playerId, actionType, targetId, cardId } = req.body;
    if (!playerId || !actionType) {
        return res.status(400).send({ error: '缺少必要的行動參數。' });
    }

    // 核心遊戲邏輯處理
    try {
        await processPlayerAction(gameId, playerId, actionType, targetId, cardId);

        // 返回更新後的遊戲狀態
        const newGameState = await getGameState(gameId);
        res.status(200).json(newGameState);
    } catch (error) {
        console.error('處理玩家行動錯誤:', error);
        res.status(500).send({ error: '無法執行玩家行動。' });
    }
});

// ====================================================================
// 遊戲邏輯與資料庫操作的輔助函數
// ====================================================================

/**
 * 創建一個新遊戲的後台邏輯
 */
async function createNewGame(playerId, characterId, playerName) {
    return new Promise((resolve, reject) => {
        db.run('BEGIN TRANSACTION;', (err) => {
            if (err) return reject(err);

            let gameId;
            let teamIds = [];

            const insertGameSql = `INSERT INTO GAME (start_time) VALUES (?)`;
            db.run(insertGameSql, [new Date().toISOString()], function (err) {
                if (err) return db.run('ROLLBACK;', () => reject(err));
                gameId = this.lastID;

                const insertTeamSql = `INSERT INTO TEAM (game_id, color) VALUES (?, ?), (?, ?)`;
                db.run(insertTeamSql, [gameId, 'red', gameId, 'blue'], function (err) {
                    if (err) return db.run('ROLLBACK;', () => reject(err));

                    db.all(`SELECT team_id FROM TEAM WHERE game_id = ?`, [gameId], (err, teams) => {
                        if (err) return db.run('ROLLBACK;', () => reject(err));
                        teamIds = teams.map(t => t.team_id);

                        const initialTeamId = teamIds[0];
                        const insertPlayerSql = `INSERT INTO PLAYER (game_id, team_id, character_id, player_name, is_first_player) VALUES (?, ?, ?, ?, ?)`;
                        db.run(insertPlayerSql, [gameId, initialTeamId, characterId, playerName, 1], function (err) {
                            if (err) return db.run('ROLLBACK;', () => reject(err));
                            const newPlayerId = this.lastID;

                            const insertPlayerStatusSql = `INSERT INTO PLAYER_STATUS (player_id, hp, energy_gem, energy_crystal, yellow_tokens, blue_tokens) VALUES (?, ?, ?, ?, ?, ?)`;
                            db.run(insertPlayerStatusSql, [newPlayerId, 10, 0, 0, JSON.stringify([]), JSON.stringify([])], (err) => {
                                if (err) return db.run('ROLLBACK;', () => reject(err));

                                const insertTeamStatusSql = `INSERT INTO TEAM_STATUS (team_id, morale, score_gem, score_crystal, star_cup_count) VALUES (?, ?, ?, ?, ?)`;
                                db.run(insertTeamStatusSql, [initialTeamId, 15, 0, 0, 0], (err) => {
                                    if (err) return db.run('ROLLBACK;', () => reject(err));

                                    db.run('COMMIT;', (err) => {
                                        if (err) return reject(err);
                                        resolve(gameId);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}

/**
 * 處理玩家的行動，這裡是一個佔位符函數，展示核心邏輯。
 */
async function processPlayerAction(gameId, playerId, actionType, targetId, cardId) {
    console.log(`處理遊戲 ${gameId} 中玩家 ${playerId} 的行動: ${actionType}`);

    const playerStatus = await getPlayerStatus(playerId);
    const gameStatus = await getGameStatus(gameId);

    if (actionType === 'attack' && gameStatus.turn_player_id === playerId) {
        const card = await getCardById(cardId);
        console.log(`玩家 ${playerId} 使用卡牌 ${card.card_name} 攻擊了目標 ${targetId}。`);

        await updatePlayerStatus(targetId, { hp: playerStatus.hp - card.attack_value });

        const teamStatus = await getTeamStatusByPlayerId(targetId);
        if (teamStatus.morale <= 0) {
            console.log(`遊戲 ${gameId} 結束，玩家 ${targetId} 所在的陣營失敗。`);
            await updateGameStatus(gameId, { status: 'completed' });
        }
    }

    await updateGameStatus(gameId, { turn_player_id: getNextPlayerId(gameStatus.turn_player_id) });
}

/**
 * 獲取完整的遊戲狀態
 */
async function getGameState(gameId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT
                g.*,
                t.team_id, t.color,
                ts.morale, ts.score_gem, ts.score_crystal, ts.star_cup_count,
                p.player_id, p.player_name, p.character_id,
                ps.hp, ps.energy_gem, ps.energy_crystal
            FROM GAME g
            LEFT JOIN TEAM t ON g.game_id = t.game_id
            LEFT JOIN TEAM_STATUS ts ON t.team_id = ts.team_id
            LEFT JOIN PLAYER p ON t.team_id = p.team_id
            LEFT JOIN PLAYER_STATUS ps ON p.player_id = ps.player_id
            WHERE g.game_id = ?
        `;

        db.all(sql, [gameId], (err, rows) => {
            if (err) return reject(err);
            if (rows.length === 0) return resolve(null);

            const gameState = {
                gameId: rows[0].game_id,
                status: rows[0].status,
                teams: []
            };

            const teams = {};
            rows.forEach(row => {
                if (!teams[row.team_id]) {
                    teams[row.team_id] = {
                        team_id: row.team_id,
                        color: row.color,
                        status: {
                            morale: row.morale,
                            score_gem: row.score_gem,
                            score_crystal: row.score_crystal,
                            star_cup_count: row.star_cup_count
                        },
                        players: []
                    };
                }
                teams[row.team_id].players.push({
                    player_id: row.player_id,
                    player_name: row.player_name,
                    character_id: row.character_id,
                    status: {
                        hp: row.hp,
                        energy_gem: row.energy_gem,
                        energy_crystal: row.energy_crystal
                    }
                });
            });

            gameState.teams = Object.values(teams);
            resolve(gameState);
        });
    });
}

/**
 * 獲取單個玩家的狀態
 */
async function getPlayerStatus(playerId) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM PLAYER_STATUS WHERE player_id = ?', [playerId], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

/**
 * 獲取單個遊戲的狀態
 */
async function getGameStatus(gameId) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM GAME WHERE game_id = ?', [gameId], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

/**
 * 獲取單個卡牌的數據
 */
async function getCardById(cardId) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM CARD WHERE card_id = ?', [cardId], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

/**
 * 獲取玩家所在陣營的狀態
 */
async function getTeamStatusByPlayerId(playerId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT ts.* FROM TEAM_STATUS ts
            JOIN PLAYER p ON p.team_id = ts.team_id
            WHERE p.player_id = ?
        `;
        db.get(sql, [playerId], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

/**
 * 更新玩家狀態
 */
async function updatePlayerStatus(playerId, updates) {
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    const sql = `UPDATE PLAYER_STATUS SET ${setClause} WHERE player_id = ?`;
    await new Promise((resolve, reject) => {
        db.run(sql, [...values, playerId], (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

/**
 * 更新遊戲狀態
 */
async function updateGameStatus(gameId, updates) {
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    const sql = `UPDATE GAME SET ${setClause} WHERE game_id = ?`;
    await new Promise((resolve, reject) => {
        db.run(sql, [...values, gameId], (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

function getNextPlayerId(currentPlayerId) {
    return currentPlayerId + 1;
}

app.listen(PORT, () => {
    console.log(`伺服器正在運行於 http://localhost:${PORT}`);
});
