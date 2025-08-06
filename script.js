document.addEventListener('DOMContentLoaded', () => {
    // 獲取 HTML 元素
    const usernameInput = document.getElementById('username');
    const roomNameInput = document.getElementById('roomName');
    const roomPasswordInput = document.getElementById('roomPassword');
    const customGameRulesInput = document.getElementById('customGameRules'); 
    const createButton = document.getElementById('createRoomButton');
    const joinButton = document.getElementById('joinRoomButton');
    const messageParagraph = document.getElementById('message');

    // 右側面板新結構的參考
    const mainRightPanelTitle = document.getElementById('main-right-panel-title'); 
    const publicRoomListContainer = document.getElementById('public-room-list-container'); 
    const publicRoomListUl = document.getElementById('publicRoomList'); 
    const publicRoomListMessage = document.getElementById('publicRoomListMessage'); 
    const roomDetailsContentDiv = document.getElementById('room-details-content'); 

    // 將在 roomDetailsContentDiv 內部創建/更新的元素
    let playerCountDisplay, maxPlayersDisplay, gameRulesDisplay, gameModeDisplay, playerListUl;
    let startGameButton, deleteRoomButton, editMaxPlayersButton, editModeButton; 

    // 定義後端伺服器 URL
    const backendUrl = 'https://star-room-backend.onrender.com'
    
    // 連接到 Socket.IO
    const socket = io(backendUrl);

    // 儲存當前房間擁有者和房間資料
    let currentRoomOwner = null;
    let currentRoomData = null; 

    // 輔助函數：清除右側面板並顯示公共房間列表
    function showPublicRoomListState() {
        mainRightPanelTitle.textContent = '加入一個房間';
        if (publicRoomListContainer) publicRoomListContainer.classList.remove('hidden');
        if (roomDetailsContentDiv) roomDetailsContentDiv.classList.add('hidden');
        roomDetailsContentDiv.innerHTML = ''; 
        
        // 重置元素參考
        playerCountDisplay = null;
        maxPlayersDisplay = null;
        gameRulesDisplay = null;
        gameModeDisplay = null;
        playerListUl = null;
        startGameButton = null;
        deleteRoomButton = null;
        editMaxPlayersButton = null;
        editModeButton = null;
        currentRoomOwner = null; 
        currentRoomData = null; 

        fetchAndRenderPublicRoomList(); 
    }

    // 輔助函數：顯示詳細房間視圖
    function showDetailedRoomState(roomData) {
        currentRoomData = roomData; 
        mainRightPanelTitle.textContent = `房間名稱: ${roomData.roomName}`;
        if (publicRoomListContainer) publicRoomListContainer.classList.add('hidden');
        if (roomDetailsContentDiv) roomDetailsContentDiv.classList.remove('hidden');

        roomDetailsContentDiv.innerHTML = `
            <div id="maxPlayersDisplayArea">
                <p>玩家人數: <span id="playerCountDisplay"></span> / <span id="maxPlayersDisplay"></span></p>
                <button id="editMaxPlayersButton">修改上限</button>
            </div>
            
            <h2>玩家清單:</h2>
            <ul id="playerList">
                <!-- 玩家列表將在這裡動態生成 -->
            </ul>

            <div class="button-group">
                <button id="startGameButton" class="btn-primary">開始遊戲</button>
                <button id="deleteRoomButton" class="btn-secondary">刪除房間</button>
            </div>

            <div id="gameRulesDisplayArea">
                <p>遊戲模式: <span id="gameModeDisplay"></span></p>
                <h3>遊戲規則:</h3>
                <pre id="gameRulesDisplay"></pre>
                <button id="editModeButton">修改模式</button>
            </div>
        `;

        playerCountDisplay = document.getElementById('playerCountDisplay');
        maxPlayersDisplay = document.getElementById('maxPlayersDisplay');
        gameRulesDisplay = document.getElementById('gameRulesDisplay');
        gameModeDisplay = document.getElementById('gameModeDisplay');
        playerListUl = document.getElementById('playerList');
        startGameButton = document.getElementById('startGameButton');
        deleteRoomButton = document.getElementById('deleteRoomButton');
        editMaxPlayersButton = document.getElementById('editMaxPlayersButton');
        editModeButton = document.getElementById('editModeButton');

        maxPlayersDisplay.textContent = roomData.maxPlayers;
        gameModeDisplay.textContent = getModeText(roomData.gameMode); 
        gameRulesDisplay.textContent = roomData.gameRules; 

        currentRoomOwner = roomData.owner;
        renderPlayerList(roomData.players, roomData.maxPlayers, currentRoomOwner);
        
        attachGameRoomButtonListeners();

        socket.emit('joinRoom', roomData.roomName);
    }

    showPublicRoomListState(); // 初始化狀態

    // 獲取並渲染公共房間列表
    async function fetchAndRenderPublicRoomList() {
        publicRoomListUl.innerHTML = '<li style="text-align: center; color: #888;">載入房間中...</li>';
        publicRoomListMessage.textContent = '';
        try {
            const response = await fetch(`${backendUrl}/api/admin/rooms`); 
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const rooms = await response.json();

            publicRoomListUl.innerHTML = ''; 
            if (rooms.length === 0) {
                publicRoomListMessage.textContent = '目前沒有可用的房間。';
            } else {
                rooms.forEach(room => {
                    const roomLi = document.createElement('li');
                    roomLi.innerHTML = `
                        <strong>${room.roomName}</strong>
                        <span>房主: ${room.owner || 'N/A'}</span>
                        <span>玩家: ${room.players.length} / ${room.maxPlayers}</span>
                        <span>模式: ${getModeText(room.gameMode)}</span>
                        <button class="join-button" data-room-name="${room.roomName}">加入</button>
                    `;
                    publicRoomListUl.appendChild(roomLi);
                });

                document.querySelectorAll('#publicRoomList .join-button').forEach(button => {
                    button.addEventListener('click', async (event) => {
                        const roomName = event.target.dataset.roomName;
                        const username = usernameInput.value.trim(); 

                        if (username === '') {
                            // 使用全局 showMessageBox 函數
                            window.showMessageBox('錯誤', '請先輸入你的名稱！');
                            return;
                        }

                        // 使用全局 customPrompt 函數
                        const roomPassword = await window.customPrompt(`請輸入房間 "${roomName}" 的密碼：`);
                        if (roomPassword === null) { 
                            // 使用全局 showMessageBox 函數
                            window.showMessageBox('提示', '已取消加入房間。');
                            return;
                        }

                        await handleJoinRoom(roomName, roomPassword, username);
                    });
                });
            }
        } catch (error) {
            publicRoomListMessage.textContent = `無法載入房間列表，請檢查伺服器。錯誤: ${error.message}`;
            console.error('Error fetching public rooms:', error);
        }
    }

    // 附加遊戲房間按鈕監聽器
    function attachGameRoomButtonListeners() {
        if (editMaxPlayersButton) editMaxPlayersButton.addEventListener('click', handleEditMaxPlayers);
        if (editModeButton) editModeButton.addEventListener('click', handleEditMode);
        if (deleteRoomButton) deleteRoomButton.addEventListener('click', handleDeleteRoom);
        if (startGameButton) startGameButton.addEventListener('click', handleStartGame);
    }

    // 獲取遊戲模式的文字描述
    function getModeText(modeValue) {
        switch(modeValue) {
            case 'normal': return '正常遊戲模式';
            case 'custom': return '特殊模式 (自訂義)';
            default: return '正常遊戲模式';
        }
    }

    // 渲染玩家列表
    function renderPlayerList(players, maxPlayers, owner) {
        if (!playerListUl) return; 

        playerListUl.innerHTML = '';
        if (playerCountDisplay) {
            playerCountDisplay.textContent = `${players.length} / ${maxPlayers}`; 
        }

        players.forEach((player) => { 
            const playerLi = document.createElement('li');
            playerLi.classList.add('player-item');
            
            const playerNameSpan = document.createElement('span');
            playerNameSpan.textContent = player;

            if (player === owner) { 
                playerNameSpan.classList.add('player-owner-pink'); 
                playerNameSpan.textContent = `${player} (房主)`; 
            }
            
            playerLi.appendChild(playerNameSpan); 

            if (usernameInput.value.trim() === owner) {
                if (player !== owner) {
                    const removeButton = document.createElement('button');
                    removeButton.textContent = '刪除';
                    removeButton.classList.add('remove-player-btn');
                    removeButton.addEventListener('click', async () => {
                        const roomName = currentRoomData ? currentRoomData.roomName : '';
                        if (!roomName) {
                            window.showMessageBox('錯誤', '無法獲取房間名稱。');
                            return;
                        }
                        window.showConfirmBox(`確定要將玩家 "${player}" 從房間中移除嗎？`, async () => {
                            try {
                                const response = await fetch(`${backendUrl}/api/remove-player`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ roomName, username: player, ownerUsername: owner })
                                });
                                const data = await response.json();
                                if (!data.success) {
                                    window.showMessageBox('錯誤', `錯誤: ${data.message}`);
                                }
                            } catch (error) {
                                console.error('Error:', error);
                                window.showMessageBox('錯誤', '網路錯誤，無法移除玩家。');
                            }
                        });
                    });
                    playerLi.appendChild(removeButton);

                    const transferOwnerButton = document.createElement('button');
                    transferOwnerButton.textContent = '轉移房主';
                    transferOwnerButton.classList.add('transfer-owner-btn');
                    transferOwnerButton.addEventListener('click', async () => {
                        const roomName = currentRoomData ? currentRoomData.roomName : '';
                        if (!roomName) {
                            window.showMessageBox('錯誤', '無法獲取房間名稱。');
                            return;
                        }
                        if (player === usernameInput.value.trim()) {
                            window.showMessageBox('提示', '您已經是房主，無法將房主權限轉移給自己。');
                            return;
                        }
                        window.showConfirmBox(`確定要將房主權限轉移給 "${player}" 嗎？`, async () => {
                            await handleTransferOwnership(player); 
                        });
                    });
                    playerLi.appendChild(transferOwnerButton);
                }
            }
            
            playerListUl.appendChild(playerLi);
        });
    }
    
    // Socket.IO 事件監聽器
    socket.on('updateRoomData', (roomData) => {
        console.log('收到房間完整資料更新通知。', roomData);
        if (currentRoomData && currentRoomData.roomName === roomData.roomName) {
            showDetailedRoomState(roomData); 
        } else {
            fetchAndRenderPublicRoomList();
        }
    });

    socket.on('roomUpdated', () => { 
        console.log('收到一般房間更新通知，重新載入公共列表。');
        fetchAndRenderPublicRoomList();
    });

    socket.on('updatePlayers', (players) => {
        if (currentRoomData && maxPlayersDisplay && playerListUl) {
            const maxPlayers = maxPlayersDisplay.textContent; 
            const owner = currentRoomOwner; 
            renderPlayerList(players, maxPlayers, owner);
        } else if (maxPlayersDisplay && playerListUl) { // 處理在詳細房間頁面時，但 currentRoomData 可能尚未完全同步的情況
            const maxPlayers = maxPlayersDisplay.textContent;
            const owner = currentRoomOwner;
            renderPlayerList(players, maxPlayers, owner); 
        }
    });

    socket.on('updateRules', (newRules) => {
        if (gameRulesDisplay) {
            gameRulesDisplay.textContent = newRules;
            window.showMessageBox('更新', '遊戲規則已更新！');
        }
    });

    socket.on('updateMaxPlayers', (newMaxPlayers) => {
        if (maxPlayersDisplay && playerListUl) {
            maxPlayersDisplay.textContent = newMaxPlayers;
            window.showMessageBox('更新', `玩家上限已更新為 ${newMaxPlayers}！`);
            if (currentRoomData) {
                renderPlayerList(currentRoomData.players, newMaxPlayers, currentRoomOwner);
            }
        }
    });

    socket.on('updateGameMode', (newMode) => {
        if (gameModeDisplay) {
            gameModeDisplay.textContent = getModeText(newMode);
            window.showMessageBox('更新', `遊戲模式已更新為 ${getModeText(newMode)}！`);
        }
    });
    
    socket.on('roomDeleted', () => {
        window.showMessageBox('通知', '房間已被刪除！你將被導回房間列表。');
        showPublicRoomListState(); 
    });

    // 處理創建房間
    async function handleCreateRoom() {
        const username = usernameInput.value.trim();
        const roomName = roomNameInput.value.trim();
        const roomPassword = roomPasswordInput.value.trim();
        const customGameRules = customGameRulesInput.value.trim(); 

        if (username === '' || roomName === '' || roomPassword === '') {
            messageParagraph.textContent = '所有欄位不能為空！';
            messageParagraph.style.color = '#e74c3c';
            return;
        }

        try {
            const response = await fetch(`${backendUrl}/api/create-room`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, roomName, password: roomPassword, gameRules: customGameRules }) 
            });
            const data = await response.json();
            
            if (data.success) {
                showDetailedRoomState(data.room); 
                messageParagraph.textContent = data.message;
                messageParagraph.style.color = '#28a745'; 
            } else {
                messageParagraph.textContent = `錯誤：${data.message}`;
                messageParagraph.style.color = '#e74c3c';
            }
        } catch (error) {
            messageParagraph.textContent = '網路錯誤，請檢查伺服器是否運行。';
            messageParagraph.style.color = '#e74c3c';
            console.error('Error:', error);
        }
    }

    // 處理加入房間
    async function handleJoinRoom(roomName, roomPassword, username) {
        if (!username || username === '') {
            window.showMessageBox('錯誤', '請先輸入你的名稱！');
            return;
        }
        if (!roomName || roomPassword === undefined || roomPassword === null) { 
            window.showMessageBox('錯誤', '房間名稱或密碼無效。');
            return;
        }

        try {
            const response = await fetch(`${backendUrl}/api/join-room`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, roomName, password: roomPassword })
            });
            const data = await response.json();
            
            if (data.success) {
                showDetailedRoomState(data.room);
                messageParagraph.textContent = data.message;
                messageParagraph.style.color = '#28a745';
            } else {
                messageParagraph.textContent = `錯誤：${data.message}`;
                messageParagraph.style.color = '#e74c3c';
            }
        } catch (error) {
            messageParagraph.textContent = '網路錯誤，請檢查伺服器是否運行。';
            messageParagraph.style.color = '#e74c3c';
            console.error('Error:', error);
        }
    }

    // 處理轉移房主權限
    async function handleTransferOwnership(newOwnerUsername) {
        if (!currentRoomData || currentRoomData.owner !== usernameInput.value.trim()) {
            window.showMessageBox('錯誤', '只有房主才能轉移房主權限。');
            return;
        }

        try {
            const response = await fetch(`${backendUrl}/api/transfer-host`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    roomName: currentRoomData.roomName, 
                    currentOwnerUsername: usernameInput.value.trim(), 
                    newOwnerUsername: newOwnerUsername 
                })
            });
            const data = await response.json();
            if (!data.success) {
                window.showMessageBox('錯誤', `錯誤：${data.message}`);
            } else {
                messageParagraph.textContent = data.message;
                messageParagraph.style.color = '#28a745';
            }
        } catch (error) {
            window.showMessageBox('錯誤', '網路錯誤，無法轉移房主。');
            console.error('Error transferring ownership:', error);
        }
    }

    // 處理編輯玩家上限
    async function handleEditMaxPlayers() {
        const roomName = currentRoomData ? currentRoomData.roomName : '';
        if (!roomName) {
            window.showMessageBox('錯誤', '無法獲取房間名稱。');
            return;
        }
        const currentMax = parseInt(maxPlayersDisplay.textContent) || 8; 
        const newMax = await window.customPrompt('請輸入新的玩家上限（2-8）：', currentMax.toString());
        if (newMax !== null) {
            const newMaxInt = parseInt(newMax);
            if (!isNaN(newMaxInt) && newMaxInt >= 2 && newMaxInt <= 8) {
                const username = usernameInput.value.trim(); 
                try {
                    const response = await fetch(`${backendUrl}/api/update-max-players`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ roomName, maxPlayers: newMaxInt, username: username })
                    });
                    const data = await response.json();
                    if (!data.success) {
                        window.showMessageBox('錯誤', `錯誤：${data.message}`);
                    }
                } catch (error) {
                    console.error('Error:', error);
                    window.showMessageBox('錯誤', '網路錯誤，無法更新玩家上限。');
                }
            } else {
                window.showMessageBox('錯誤', '玩家上限必須是介於 2 到 8 之間的數字。');
            }
        }
    }

    // 處理編輯遊戲模式
    async function handleEditMode() {
        const roomName = currentRoomData ? currentRoomData.roomName : '';
        if (!roomName) {
            window.showMessageBox('錯誤', '無法獲取房間名稱。');
            return;
        }
        const newMode = await window.customPrompt('請輸入新的遊戲模式 (normal 或 custom)：');
        if (newMode !== null && (newMode === 'normal' || newMode === 'custom')) {
            const username = usernameInput.value.trim(); 
            try {
                const response = await fetch(`${backendUrl}/api/update-game-mode`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomName, gameMode: newMode, username: username })
                });
                const data = await response.json();
                if (!data.success) {
                    window.showMessageBox('錯誤', `錯誤：${data.message}`);
                }
            } catch (error) {
                console.error('Error:', error);
                window.showMessageBox('錯誤', '網路錯誤，無法更新遊戲模式。');
            }
        } else if (newMode !== null) { // 只有在用戶沒有取消提示時才顯示錯誤
            window.showMessageBox('錯誤', '無效的遊戲模式。請輸入 "normal" 或 "custom"。');
        }
    }

    // 處理刪除房間
    async function handleDeleteRoom() {
        const roomName = currentRoomData ? currentRoomData.roomName : '';
        if (!roomName) {
            window.showMessageBox('錯誤', '無法獲取房間名稱。');
            return;
        }
        const username = usernameInput.value.trim(); 
        window.showConfirmBox('確定要刪除這個房間嗎？', async () => {
            try {
                const response = await fetch(`${backendUrl}/api/delete-room`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomName: roomName, username: username })
                });
                const data = await response.json();
                if (data.success) {
                    window.showMessageBox('成功', data.message);
                    showPublicRoomListState(); 
                } else {
                    window.showMessageBox('錯誤', `錯誤：${data.message}`);
                }
            } catch (error) {
                window.showMessageBox('錯誤', '網路錯誤，請檢查伺服器是否運行。');
                console.error('Error:', error);
            }
        });
    }
    
    // 處理開始遊戲
    function handleStartGame() {
        window.showMessageBox('通知', '遊戲即將開始！');
        // 在這裡添加實際的遊戲啟動邏輯
    }

    // 事件監聽器
    createButton.addEventListener('click', handleCreateRoom);
    joinButton.addEventListener('click', () => {
        showPublicRoomListState();
        messageParagraph.textContent = ''; 
    });
});
