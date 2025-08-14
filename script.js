// public/script.js

document.addEventListener('DOMContentLoaded', () => {
    // 獲取 DOM 元素 - 左側卡片 (創建/進入房間)
    const createUsernameInput = document.getElementById('createUsernameInput');
    const createRoomNameInput = document.getElementById('createRoomNameInput');
    const createRoomPasswordInput = document.getElementById('createRoomPasswordInput'); // 新增密碼輸入
    const isPublicRoomCheckbox = document.getElementById('isPublicRoomCheckbox');     // 新增公開房間核選方塊
    const createRoomButton = document.getElementById('createRoomButton');
    const enterRoomButton = document.getElementById('enterRoomButton');

    // 獲取 DOM 元素 - 右側卡片 (加入房間)
    const joinRoomIdInput = document.getElementById('joinRoomIdInput');
    const joinRoomPasswordInput = document.getElementById('joinRoomPasswordInput');
    const roomListContainer = document.getElementById('roomListContainer'); // 新增房間列表容器

    // 獲取彈窗元素
    const messageModal = document.getElementById('messageModal');
    const modalMessage = document.getElementById('modalMessage');
    const modalConfirmButton = document.getElementById('modalConfirmButton');

    // 連接到 Socket.IO 伺服器
    // 請根據您的後端服務的實際 URL 進行調整
    const socket = io('http://localhost:3000'); // 替換為您的後端 URL (Render 部署時請改為 Render URL)

    let currentRoom = null;
    let currentUsername = null;

    // 顯示提示訊息彈窗
    function showMessage(message) {
        modalMessage.textContent = message;
        messageModal.classList.remove('hidden');
    }

    // 隱藏提示訊息彈窗
    modalConfirmButton.addEventListener('click', () => {
        messageModal.classList.add('hidden');
    });

    // 處理公開房間核選方塊的變化
    isPublicRoomCheckbox.addEventListener('change', () => {
        if (isPublicRoomCheckbox.checked) {
            createRoomPasswordInput.value = ''; // 如果是公開房間，清空密碼
            createRoomPasswordInput.disabled = true; // 禁用密碼輸入
            createRoomPasswordInput.placeholder = '公開房間無需密碼';
        } else {
            createRoomPasswordInput.disabled = false; // 啟用密碼輸入
            createRoomPasswordInput.placeholder = '如果需要';
        }
    });

    // Socket.IO 連線成功
    socket.on('connect', () => {
        console.log('已連線到 Socket.IO 伺服器，ID:', socket.id);
        // 連線成功後，請求最新的房間列表
        socket.emit('getRoomList');
    });

    // Socket.IO 連線斷開
    socket.on('disconnect', () => {
        console.log('已斷開與 Socket.IO 伺服器的連線');
        currentRoom = null;
        currentUsername = null;
        showMessage('已斷開與伺服器的連線。');
        roomListContainer.innerHTML = '<p class="text-gray-500 text-center">目前沒有房間。</p>'; // 清空房間列表
    });

    // 處理「開闢房間」按鈕點擊
    createRoomButton.addEventListener('click', () => {
        const username = createUsernameInput.value.trim();
        const roomName = createRoomNameInput.value.trim();
        const password = createRoomPasswordInput.value.trim();
        const isPublic = isPublicRoomCheckbox.checked;

        if (!username) {
            showMessage('請輸入你的名稱！');
            return;
        }
        if (!roomName) {
            showMessage('請輸入房間名稱來創建房間！');
            return;
        }

        currentUsername = username;
        socket.emit('createRoom', { roomName, username, password, isPublic });
        console.log(`嘗試創建房間: ${roomName}, 用戶名: ${username}, 密碼: ${password}, 公開: ${isPublic}`);
    });

    // 處理「進入房間」按鈕點擊
    enterRoomButton.addEventListener('click', () => {
        const username = createUsernameInput.value.trim();
        const roomNameFromCreate = createRoomNameInput.value.trim(); // 用於左側的房間名稱
        const joinId = joinRoomIdInput.value.trim(); // 用於右側的房間 ID
        const joinPassword = joinRoomPasswordInput.value.trim();

        if (!username) {
            showMessage('請先輸入你的名稱！');
            return;
        }

        currentUsername = username;

        if (roomNameFromCreate) { // 如果左側的「房間名稱」有填寫
            // 嘗試從左側進入房間 (可能是新創建或已存在的)
            socket.emit('joinRoom', { roomName: roomNameFromCreate, username });
            console.log(`嘗試進入房間 (左側): ${roomNameFromCreate}, 用戶名: ${username}`);
        } else if (joinId) { // 如果右側的「房間 ID」有填寫
            // 嘗試從右側加入房間
            socket.emit('joinRoom', { roomName: joinId, username, password: joinPassword });
            console.log(`嘗試加入房間 (右側): ${joinId}, 用戶名: ${username}, 密碼: ${joinPassword}`);
        } else {
            showMessage('請輸入房間名稱或房間 ID 來進入房間！');
        }
    });

    // 監聽伺服器發送的 'roomJoined' 事件
    socket.on('roomJoined', (data) => {
        currentRoom = data.roomName;
        console.log(`成功加入房間: ${data.roomName}, 作為: ${currentUsername}`);
        showMessage(`成功加入房間: ${data.roomName}`);
        // 這裡可以更新 UI 顯示當前房間和用戶名，或導向到聊天/遊戲頁面
        // window.location.href = `/chat?room=${data.roomName}&user=${currentUsername}`;
    });

    // 監聽伺服器發送的 'roomError' 事件 (例如房間不存在、密碼錯誤等)
    socket.on('roomError', (message) => {
        console.error('房間錯誤:', message);
        showMessage(`房間錯誤: ${message}`);
    });

    // 監聽伺服器發送的 'updateRoomList' 事件，更新房間列表
    socket.on('updateRoomList', (rooms) => {
        console.log('收到更新的房間列表:', rooms);
        renderRoomList(rooms);
    });

    // 渲染房間列表的函數
    function renderRoomList(rooms) {
        roomListContainer.innerHTML = ''; // 清空現有列表

        if (rooms.length === 0) {
            roomListContainer.innerHTML = '<p class="text-gray-500 text-center">目前沒有房間。</p>';
            return;
        }

        rooms.forEach(room => {
            const roomItem = document.createElement('div');
            roomItem.classList.add('bg-gray-50', 'p-4', 'rounded-lg', 'shadow-sm', 'mb-3', 'flex', 'items-center', 'justify-between', 'cursor-pointer', 'hover:bg-gray-100', 'transition', 'duration-200');
            roomItem.dataset.roomName = room.roomName; // 儲存房間名稱以便點擊加入

            const statusColor = room.isPublic ? 'bg-green-500' : 'bg-red-500';
            const statusText = room.isPublic ? '公開' : '私人';

            roomItem.innerHTML = `
                <div class="flex items-center">
                    <span class="w-3 h-3 rounded-full ${statusColor} mr-3"></span>
                    <div>
                        <p class="font-bold text-gray-800">${room.roomName}</p>
                        <p class="text-sm text-gray-600">創建者: ${room.creatorName || '未知'}</p>
                    </div>
                </div>
                <button class="join-button bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold py-1 px-3 rounded-md transition duration-200">加入</button>
            `;
            roomListContainer.appendChild(roomItem);
        });

        // 為每個「加入」按鈕添加事件監聽器
        roomListContainer.querySelectorAll('.join-button').forEach(button => {
            button.addEventListener('click', (event) => {
                event.stopPropagation(); // 防止事件冒泡到父元素
                const roomName = event.target.closest('[data-room-name]').dataset.roomName;
                const username = createUsernameInput.value.trim(); // 使用左側的用戶名

                if (!username) {
                    showMessage('請先輸入你的名稱！');
                    return;
                }

                // 彈出一個提示框讓用戶輸入密碼，如果房間是私人的
                const roomToJoin = rooms.find(r => r.roomName === roomName);
                if (roomToJoin && !roomToJoin.isPublic) {
                    const password = prompt(`請輸入房間 "${roomName}" 的密碼:`);
                    if (password !== null) { // 如果用戶沒有點擊取消
                        currentUsername = username;
                        socket.emit('joinRoom', { roomName, username, password });
                    }
                } else {
                    currentUsername = username;
                    socket.emit('joinRoom', { roomName, username });
                }
            });
        });
    }

    // 初始狀態：如果公開房間被選中，禁用密碼輸入
    if (isPublicRoomCheckbox.checked) {
        createRoomPasswordInput.disabled = true;
        createRoomPasswordInput.placeholder = '公開房間無需密碼';
    }
});
