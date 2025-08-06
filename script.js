// public/script.js

// 確保在 DOM 完全加載後執行腳本
document.addEventListener('DOMContentLoaded', () => {
    // 獲取 DOM 元素
    const roomNameInput = document.getElementById('roomNameInput');
    const usernameInput = document.getElementById('usernameInput');
    const joinRoomButton = document.getElementById('joinRoomButton');
    const exitRoomButton = document.getElementById('exitRoomButton');
    const currentRoomIdSpan = document.getElementById('currentRoomId');
    const currentUserIdSpan = document.getElementById('currentUserId');
    const currentUsernameSpan = document.getElementById('currentUsername');
    const playerListUl = document.getElementById('playerList');

    // 連接到 Socket.IO 伺服器
    // 請根據您的後端服務的實際 URL 進行調整
    // 如果在本地測試，通常是 http://localhost:PORT
    // 如果部署到 Render，則是 Render 提供的服務 URL
    const socket = io('http://localhost:10000'); // 替換為您的後端 URL

    let currentRoom = null;
    let currentUsername = null;

    // Socket.IO 連線成功
    socket.on('connect', () => {
        console.log('已連線到 Socket.IO 伺服器，ID:', socket.id);
        currentUserIdSpan.textContent = socket.id;
    });

    // Socket.IO 連線斷開
    socket.on('disconnect', () => {
        console.log('已斷開與 Socket.IO 伺服器的連線');
        currentRoomIdSpan.textContent = '未加入';
        currentUserIdSpan.textContent = '未連線';
        currentUsernameSpan.textContent = '未設定';
        playerListUl.innerHTML = '<li class="text-gray-500">目前沒有玩家</li>';
        currentRoom = null;
        currentUsername = null;
    });

    // 處理加入/創建房間按鈕點擊
    joinRoomButton.addEventListener('click', () => {
        const roomName = roomNameInput.value.trim();
        const username = usernameInput.value.trim();

        if (roomName && username) {
            currentUsername = username; // 保存用戶名
            socket.emit('joinRoom', { roomName, username }); // 發送加入房間事件到伺服器
            console.log(`嘗試加入房間: ${roomName}, 用戶名: ${username}`);
        } else {
            alert('請輸入房間名稱和你的名稱！'); // 簡單提示，實際應用中應使用更友善的 UI
        }
    });

    // 處理退出房間按鈕點擊
    exitRoomButton.addEventListener('click', () => {
        if (currentRoom) {
            socket.emit('leaveRoom', currentRoom); // 發送退出房間事件到伺服器
            console.log(`嘗試退出房間: ${currentRoom}`);
        } else {
            alert('您尚未加入任何房間！');
        }
    });

    // 監聽伺服器發送的 'roomJoined' 事件
    socket.on('roomJoined', (data) => {
        currentRoom = data.roomName;
        currentRoomIdSpan.textContent = data.roomName;
        currentUsernameSpan.textContent = currentUsername; // 顯示用戶設定的名稱
        console.log(`成功加入房間: ${data.roomName}`);
        // 假設伺服器會發送初始玩家列表
        updatePlayerList(data.players || []);
    });

    // 監聽伺服器發送的 'roomLeft' 事件
    socket.on('roomLeft', (data) => {
        if (data.roomName === currentRoom) {
            currentRoomIdSpan.textContent = '未加入';
            currentUsernameSpan.textContent = '未設定';
            playerListUl.innerHTML = '<li class="text-gray-500">目前沒有玩家</li>';
            currentRoom = null;
            currentUsername = null;
            console.log(`已退出房間: ${data.roomName}`);
        }
    });

    // 監聽伺服器發送的 'updatePlayers' 事件
    socket.on('updatePlayers', (players) => {
        updatePlayerList(players);
    });

    // 更新玩家列表的輔助函數
    function updatePlayerList(players) {
        playerListUl.innerHTML = ''; // 清空現有列表
        if (players && players.length > 0) {
            players.forEach(player => {
                const li = document.createElement('li');
                li.className = 'py-1 border-b border-gray-200 last:border-b-0';
                li.textContent = `${player.username} (ID: ${player.id})`;
                playerListUl.appendChild(li);
            });
        } else {
            playerListUl.innerHTML = '<li class="text-gray-500">目前沒有玩家</li>';
        }
    }

    // 初始狀態處理 (例如，如果頁面刷新，需要重新連線)
    // 可以在這裡添加一些邏輯來檢查是否已經在房間中
});
