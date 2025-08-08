-- 創建遊戲局表 (Game Session)
CREATE TABLE GAME (
    game_id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT NOT NULL DEFAULT 'in_progress',
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    winner_team_id INTEGER,
    turn_player_id INTEGER,
    current_phase TEXT NOT NULL DEFAULT 'setup',
    public_deck TEXT, -- JSON array of card IDs
    discard_pile TEXT -- JSON array of card IDs
);

-- 創建陣營表
CREATE TABLE TEAM (
    team_id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    color TEXT NOT NULL,
    FOREIGN KEY(game_id) REFERENCES GAME(game_id)
);

-- 創建陣營狀態表
CREATE TABLE TEAM_STATUS (
    team_id INTEGER PRIMARY KEY,
    morale INTEGER NOT NULL DEFAULT 15,
    score_gem INTEGER NOT NULL DEFAULT 0,
    score_crystal INTEGER NOT NULL DEFAULT 0,
    star_cup_count INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(team_id) REFERENCES TEAM(team_id)
);

-- 創建玩家表
CREATE TABLE PLAYER (
    player_id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    character_id INTEGER NOT NULL,
    player_name TEXT NOT NULL,
    is_first_player INTEGER NOT NULL DEFAULT 0, -- 0: false, 1: true
    FOREIGN KEY(game_id) REFERENCES GAME(game_id),
    FOREIGN KEY(team_id) REFERENCES TEAM(team_id),
    FOREIGN KEY(character_id) REFERENCES CHARACTER(character_id)
);

-- 創建玩家狀態表
CREATE TABLE PLAYER_STATUS (
    player_id INTEGER PRIMARY KEY,
    hp INTEGER NOT NULL DEFAULT 10,
    energy_gem INTEGER NOT NULL DEFAULT 0,
    energy_crystal INTEGER NOT NULL DEFAULT 0,
    yellow_tokens TEXT, -- JSON array
    blue_tokens TEXT, -- JSON array
    hand_cards TEXT, -- JSON array of card IDs
    FOREIGN KEY(player_id) REFERENCES PLAYER(player_id)
);

-- 創建角色表 (靜態數據)
CREATE TABLE CHARACTER (
    character_id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_name TEXT NOT NULL UNIQUE,
    abilities TEXT, -- JSON object
    special_cards TEXT, -- JSON array of card IDs
    initial_tokens TEXT -- JSON object
);

-- 創建卡牌表 (靜態數據)
CREATE TABLE CARD (
    card_id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_type TEXT NOT NULL,
    card_name TEXT NOT NULL,
    card_effect TEXT, -- JSON object
    attack_value INTEGER,
    magic_type TEXT
);
