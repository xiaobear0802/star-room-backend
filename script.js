// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA8pRY3Blep_NFyINsZHGb9eKAJX_jWcEM",
  authDomain: "star-3a045.firebaseapp.com",
  projectId: "star-3a045",
  storageBucket: "star-3a045.firebasestorage.app",
  messagingSenderId: "1022086956918",
  appId: "1:1022086956918:web:51bf753442360a232bdc57",
  measurementId: "G-DSELMS0CPG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

document.addEventListener('DOMContentLoaded', () => {
    // Get HTML elements
    const usernameInput = document.getElementById('username');
    const roomNameInput = document.getElementById('roomName');
    const roomPasswordInput = document.getElementById('roomPassword');
    const customGameRulesInput = document.getElementById('customGameRules'); 
    const createButton = document.getElementById('createRoomButton');
    const joinButton = document.getElementById('joinRoomButton');
    const messageParagraph = document.getElementById('message');

    // References to the new structure for the right panel
    const mainRightPanelTitle = document.getElementById('main-right-panel-title'); 
    const publicRoomListContainer = document.getElementById('public-room-list-container'); 
    const publicRoomListUl = document.getElementById('publicRoomList'); 
    const publicRoomListMessage = document.getElementById('publicRoomListMessage'); 
    const roomDetailsContentDiv = document.getElementById('room-details-content'); 

    // Elements that will be created/updated inside roomDetailsContentDiv
    let playerCountDisplay, maxPlayersDisplay, gameRulesDisplay, gameModeDisplay, playerListUl;
    let startGameButton, deleteRoomButton, editMaxPlayersButton, editModeButton; 

    // Define backend server URL - 替換為您的 Render 服務 URL
    const backendUrl = 'https://star-room-backend.onrender.com'
    
    // Connect to Socket.IO - 使用新的後端 URL
    const socket = io(backendUrl);

    // Store current room owner and data
    let currentRoomOwner = null;
    let currentRoomData = null; 

    // Helper to clear the right panel and show public room list
    function showPublicRoomListState() {
        mainRightPanelTitle.textContent = '加入一個房間';
        if (publicRoomListContainer) publicRoomListContainer.classList.remove('hidden');
        if (roomDetailsContentDiv) roomDetailsContentDiv.classList.add('hidden');
        roomDetailsContentDiv.innerHTML = ''; 
        
        // Reset element references
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

    // Helper to show the detailed room view
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
                <button id="startGameButton">開始遊戲</button>
                <button id="deleteRoomButton">刪除房間</button>
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

    // Helper to clear the right panel and show public room list
    function showPublicRoomListState() {
        mainRightPanelTitle.textContent = '加入一個房間';
        if (publicRoomListContainer) publicRoomListContainer.classList.remove('hidden');
        if (roomDetailsContentDiv) roomDetailsContentDiv.classList.add('hidden');
        roomDetailsContentDiv.innerHTML = ''; 
        
        // Reset element references
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

    // Helper to show the detailed room view
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
                <button id="startGameButton">開始遊戲</button>
                <button id="deleteRoomButton">刪除房間</button>
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

    showPublicRoomListState();

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
                            messageParagraph.textContent = '請先輸入你的名稱！';
                            messageParagraph.style.color = '#e74c3c';
                            return;
                        }

                        const roomPassword = prompt(`請輸入房間 "${roomName}" 的密碼：`);
                        if (roomPassword === null) { 
                            messageParagraph.textContent = '已取消加入房間。';
                            messageParagraph.style.color = '#888';
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

    function attachGameRoomButtonListeners() {
        if (editMaxPlayersButton) editMaxPlayersButton.addEventListener('click', handleEditMaxPlayers);
        if (editModeButton) editModeButton.addEventListener('click', handleEditMode);
        if (deleteRoomButton) deleteRoomButton.addEventListener('click', handleDeleteRoom);
        if (startGameButton) startGameButton.addEventListener('click', handleStartGame);
    }

    function getModeText(modeValue) {
        switch(modeValue) {
            case 'normal': return '正常遊戲模式';
            case 'custom': return '特殊模式 (自訂義)';
            default: return '正常遊戲模式';
        }
    }

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
                            // alert('無法獲取房間名稱。'); // 替換為自訂訊息框
                            showMessageBox('錯誤', '無法獲取房間名稱。');
                            return;
                        }
                        // if (confirm(`確定要將玩家 "${player}" 從房間中移除嗎？`)) { // 替換為自訂訊息框
                        showConfirmBox(`確定要將玩家 "${player}" 從房間中移除嗎？`, async () => {
                            try {
                                const response = await fetch(`${backendUrl}/api/remove-player`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ roomName, username: player, ownerUsername: owner })
                                });
                                const data = await response.json();
                                if (!data.success) {
                                    // alert(`錯誤: ${data.message}`); // 替換為自訂訊息框
                                    showMessageBox('錯誤', `錯誤: ${data.message}`);
                                }
                            } catch (error) {
                                console.error('Error:', error);
                                showMessageBox('錯誤', '網路錯誤，無法移除玩家。');
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
                            // alert('無法獲取房間名稱。'); // 替換為自訂訊息框
                            showMessageBox('錯誤', '無法獲取房間名稱。');
                            return;
                        }
                        if (player === usernameInput.value.trim()) {
                            // alert('您已經是房主，無法將房主權限轉移給自己。'); // 替換為自訂訊息框
                            showMessageBox('提示', '您已經是房主，無法將房主權限轉移給自己。');
                            return;
                        }
                        // if (confirm(`確定要將房主權限轉移給 "${player}" 嗎？`)) { // 替換為自訂訊息框
                        showConfirmBox(`確定要將房主權限轉移給 "${player}" 嗎？`, async () => {
                            await handleTransferOwnership(player); 
                        });
                    });
                    playerLi.appendChild(transferOwnerButton);
                }
            }
            
            playerListUl.appendChild(playerLi);
        });
    }
    
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
        } else if (maxPlayersDisplay && playerListUl) {
             const maxPlayers = maxPlayersDisplay.textContent;
             const owner = currentRoomOwner;
             renderPlayerList(players, maxPlayers, owner); 
        }
    });

    socket.on('updateRules', (newRules) => {
        if (gameRulesDisplay) {
            gameRulesDisplay.textContent = newRules;
            // alert('遊戲規則已更新！'); // 替換為自訂訊息框
            showMessageBox('更新', '遊戲規則已更新！');
        }
    });

    socket.on('updateMaxPlayers', (newMaxPlayers) => {
        if (maxPlayersDisplay && playerListUl) {
            maxPlayersDisplay.textContent = newMaxPlayers;
            // alert(`玩家上限已更新為 ${newMaxPlayers}！`); // 替換為自訂訊息框
            showMessageBox('更新', `玩家上限已更新為 ${newMaxPlayers}！`);
            if (currentRoomData) {
                renderPlayerList(currentRoomData.players, newMaxPlayers, currentRoomOwner);
            }
        }
    });

    socket.on('updateGameMode', (newMode) => {
        if (gameModeDisplay) {
            gameModeDisplay.textContent = getModeText(newMode);
            // alert(`遊戲模式已更新為 ${getModeText(newMode)}！`); // 替換為自訂訊息框
            showMessageBox('更新', `遊戲模式已更新為 ${getModeText(newMode)}！`);
        }
    });
    
    socket.on('roomDeleted', () => {
        // alert('房間已被刪除！你將被導回房間列表。'); // 替換為自訂訊息框
        showMessageBox('通知', '房間已被刪除！你將被導回房間列表。');
        showPublicRoomListState(); 
    });

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

    async function handleJoinRoom(roomName, roomPassword, username) {
        if (!username || username === '') {
            messageParagraph.textContent = '請先輸入你的名稱！';
            messageParagraph.style.color = '#e74c3c';
            return;
        }
        if (!roomName || roomPassword === undefined || roomPassword === null) { 
            messageParagraph.textContent = '房間名稱或密碼無效。';
            messageParagraph.style.color = '#e74c3c';
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

    async function handleTransferOwnership(newOwnerUsername) {
        if (!currentRoomData || currentRoomData.owner !== usernameInput.value.trim()) {
            // alert('只有房主才能轉移房主權限。'); // 替換為自訂訊息框
            showMessageBox('錯誤', '只有房主才能轉移房主權限。');
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
                // alert(`錯誤：${data.message}`); // 替換為自訂訊息框
                showMessageBox('錯誤', `錯誤：${data.message}`);
            } else {
                messageParagraph.textContent = data.message;
                messageParagraph.style.color = '#28a745';
            }
        } catch (error) {
            // alert('網路錯誤，無法轉移房主。'); // 替換為自訂訊息框
            showMessageBox('錯誤', '網路錯誤，無法轉移房主。');
            console.error('Error transferring ownership:', error);
        }
    }

    async function handleEditMaxPlayers() {
        const roomName = currentRoomData ? currentRoomData.roomName : '';
        if (!roomName) {
            // alert('無法獲取房間名稱。'); // 替換為自訂訊息框
            showMessageBox('錯誤', '無法獲取房間名稱。');
            return;
        }
        const currentMax = parseInt(maxPlayersDisplay.textContent) || 8; 
        const newMax = prompt('請輸入新的玩家上限（2-8）：', currentMax);
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
                        // alert(`錯誤：${data.message}`); // 替換為自訂訊息框
                        showMessageBox('錯誤', `錯誤：${data.message}`);
                    }
                } catch (error) {
                    console.error('Error:', error);
                    showMessageBox('錯誤', '網路錯誤，無法更新玩家上限。');
                }
            } else {
                // alert('玩家上限必須是介於 2 到 8 之間的數字。'); // 替換為自訂訊息框
                showMessageBox('錯誤', '玩家上限必須是介於 2 到 8 之間的數字。');
            }
        }
    }

    async function handleEditMode() {
        const roomName = currentRoomData ? currentRoomData.roomName : '';
        if (!roomName) {
            // alert('無法獲取房間名稱。'); // 替換為自訂訊息框
            showMessageBox('錯誤', '無法獲取房間名稱。');
            return;
        }
        const newMode = prompt('請輸入新的遊戲模式 (normal 或 custom)：');
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
                    // alert(`錯誤：${data.message}`); // 替換為自訂訊息框
                    showMessageBox('錯誤', `錯誤：${data.message}`);
                }
            } catch (error) {
                console.error('Error:', error);
                showMessageBox('錯誤', '網路錯誤，無法更新遊戲模式。');
            }
        } else {
            // alert('無效的遊戲模式。請輸入 "normal" 或 "custom"。'); // 替換為自訂訊息框
            showMessageBox('錯誤', '無效的遊戲模式。請輸入 "normal" 或 "custom"。');
        }
    }

    async function handleDeleteRoom() {
        const roomName = currentRoomData ? currentRoomData.roomName : '';
        if (!roomName) {
            // alert('無法獲取房間名稱。'); // 替換為自訂訊息框
            showMessageBox('錯誤', '無法獲取房間名稱。');
            return;
        }
        const username = usernameInput.value.trim(); 
        try {
            const response = await fetch(`${backendUrl}/api/delete-room`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomName: roomName, username: username })
            });
            const data = await response.json();
            if (data.success) {
                // alert(data.message); // 替換為自訂訊息框
                showMessageBox('成功', data.message);
                showPublicRoomListState(); 
            } else {
                // alert(`錯誤：${data.message}`); // 替換為自訂訊息框
                showMessageBox('錯誤', `錯誤：${data.message}`);
            }
        } catch (error) {
            // alert('網路錯誤，請檢查伺服器是否運行。'); // 替換為自訂訊息框
            showMessageBox('錯誤', '網路錯誤，請檢查伺服器是否運行。');
            console.error('Error:', error);
        }
    }
    
    function handleStartGame() {
        // alert('遊戲即將開始！'); // 替換為自訂訊息框
        showMessageBox('通知', '遊戲即將開始！');
    }

    createButton.addEventListener('click', handleCreateRoom);
    joinButton.addEventListener('click', () => {
        showPublicRoomListState();
        messageParagraph.textContent = ''; 
    });

    // Custom Message Box Functions
    function showMessageBox(title, message) {
        const modalId = 'custom-alert-modal';
        let modal = document.getElementById(modalId);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.style.cssText = `
                position: fixed;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            `;
            modal.innerHTML = `
                <div style="
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    text-align: center;
                    max-width: 400px;
                    width: 90%;
                ">
                    <h3 style="margin-top: 0;" id="modal-title"></h3>
                    <p id="modal-message"></p>
                    <button id="modal-ok-button" style="
                        background-color: #007bff;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        margin-top: 15px;
                    ">確定</button>
                </div>
            `;
            document.body.appendChild(modal);
            document.getElementById('modal-ok-button').addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').textContent = message;
        modal.style.display = 'flex';
    }

    function showConfirmBox(message, onConfirm) {
        const modalId = 'custom-confirm-modal';
        let modal = document.getElementById(modalId);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.style.cssText = `
                position: fixed;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            `;
            modal.innerHTML = `
                <div style="
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    text-align: center;
                    max-width: 400px;
                    width: 90%;
                ">
                    <h3 style="margin-top: 0;">確認</h3>
                    <p id="confirm-message"></p>
                    <div style="display: flex; justify-content: space-around; margin-top: 20px;">
                        <button id="confirm-yes-button" style="
                            background-color: #28a745;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 5px;
                            cursor: pointer;
                        ">是</button>
                        <button id="confirm-no-button" style="
                            background-color: #dc3545;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 5px;
                            cursor: pointer;
                        ">否</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        document.getElementById('confirm-message').textContent = message;
        modal.style.display = 'flex';

        const yesButton = document.getElementById('confirm-yes-button');
        const noButton = document.getElementById('confirm-no-button');

        // Clear previous event listeners
        const newYesButton = yesButton.cloneNode(true);
        yesButton.parentNode.replaceChild(newYesButton, yesButton);
        const newNoButton = noButton.cloneNode(true);
        noButton.parentNode.replaceChild(newNoButton, noButton);

        newYesButton.addEventListener('click', () => {
            modal.style.display = 'none';
            if (onConfirm) onConfirm();
        });
        newNoButton.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
});
