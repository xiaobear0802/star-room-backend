// Custom Alert Function (定義為全局，以便 index.html 中的 onclick 可以調用)
window.customAlert = function(message, title = "提示") {
    return new Promise(resolve => {
        const dialog = document.getElementById('customAlertDialog');
        const msgElement = document.getElementById('customAlertMessage');
        const titleElement = document.getElementById('customAlertTitle');
        const okButton = document.getElementById('customAlertOkButton');

        titleElement.textContent = title;
        msgElement.textContent = message;
        dialog.classList.remove('hidden');

        const handler = () => {
            dialog.classList.add('hidden');
            okButton.removeEventListener('click', handler);
            resolve();
        };
        okButton.addEventListener('click', handler);
    });
};

// Custom Prompt Function (定義為全局)
window.customPrompt = function(message, defaultValue = '', title = "輸入") {
    return new Promise(resolve => {
        const dialog = document.getElementById('customPromptDialog');
        const msgElement = document.getElementById('customPromptMessage');
        const titleElement = document.getElementById('customPromptTitle');
        const inputElement = document.getElementById('customPromptInput');
        const okButton = document.getElementById('customPromptOkButton');
        const cancelButton = document.getElementById('customPromptCancelButton');

        titleElement.textContent = title;
        msgElement.textContent = message;
        inputElement.value = defaultValue;
        dialog.classList.remove('hidden');

        const okHandler = () => {
            dialog.classList.add('hidden');
            okButton.removeEventListener('click', okHandler);
            cancelButton.removeEventListener('click', cancelHandler);
            resolve(inputElement.value);
        };

        const cancelHandler = () => {
            dialog.classList.add('hidden');
            okButton.removeEventListener('click', okHandler);
            cancelButton.removeEventListener('click', cancelHandler);
            resolve(null);
        };

        okButton.addEventListener('click', okHandler);
        cancelButton.addEventListener('click', cancelHandler);
        inputElement.focus();
    });
};

// Import Firebase modules using full CDN URLs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// !!! 重要: 使用 Canvas 環境提供的全局變數來獲取 Firebase 配置 !!!
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // 獲取 Auth 服務實例
const db = getFirestore(app); // 獲取 Firestore 服務實例

let userId = null; // 用於儲存用戶ID

// 監聽認證狀態變化
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userId = user.uid;
        console.log("User signed in:", userId);
        setupApp(); // 認證完成後設置應用程式
    } else {
        // 如果沒有用戶登入，嘗試匿名登入
        try {
            if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
            } else {
                await signInAnonymously(auth);
            }
            userId = auth.currentUser?.uid || crypto.randomUUID(); // 如果匿名登入，生成一個隨機ID
            console.log("Signed in anonymously or with custom token. User ID:", userId);
            setupApp(); // 認證完成後設置應用程式
        } catch (error) {
            console.error("Error signing in:", error);
            await window.customAlert("登入失敗，請檢查網路連接或稍後再試。");
        }
    }
});

// 確保您的其他 JavaScript 邏輯在 Firebase 初始化和認證完成後執行
async function setupApp() {
    // 確保 userId 已經被設定
    if (!userId) {
        console.log("Waiting for user authentication...");
        return;
    }

    // 獲取 HTML 元素
    const userNameInput = document.getElementById('userNameInput');
    const createRoomNameInput = document.getElementById('createRoomNameInput');
    const createRoomPasswordInput = document.getElementById('createRoomPasswordInput');
    const gameRulesInput = document.getElementById('gameRulesInput'); 
    const createRoomButton = document.getElementById('createRoomButton');
    const joinRoomByIdButton = document.getElementById('joinRoomByIdButton');
    const joinRoomIdInput = document.getElementById('joinRoomIdInput');
    const joinRoomPasswordInput = document.getElementById('joinRoomPasswordInput');

    // 遊戲房間介面元素
    const mainContainer = document.querySelector('.main-container');
    const gameRoomSection = document.getElementById('gameRoom');
    const currentRoomNameDisplay = document.getElementById('currentRoomName');
    const currentRoomIdDisplay = document.getElementById('currentRoomId');
    const currentUserNameDisplay = document.getElementById('currentUserName');
    const currentUserIdDisplay = document.getElementById('currentUserId');
    const roomPlayersList = document.getElementById('roomPlayersList');
    const availableRoomsDiv = document.getElementById('availableRooms');

    // 獲取房間列表
    const roomsCollectionRef = collection(db, `artifacts/${appId}/public/data/rooms`);
    onSnapshot(roomsCollectionRef, (snapshot) => {
        const rooms = [];
        snapshot.forEach((doc) => {
            rooms.push({ id: doc.id, ...doc.data() });
        });
        console.log("Available rooms:", rooms);
        displayRooms(rooms);
    }, (error) => {
        console.error("Error fetching rooms:", error);
    });

    // 處理創建房間
    if (createRoomButton) {
        createRoomButton.addEventListener('click', async () => {
            const roomName = createRoomNameInput.value;
            const roomPassword = createRoomPasswordInput.value;
            const gameRules = gameRulesInput.value;
            const userName = userNameInput.value;

            if (!roomName || !userName) {
                await window.customAlert("房間名稱和您的名稱不能為空！");
                return;
            }

            try {
                const newRoomRef = await addDoc(roomsCollectionRef, {
                    name: roomName,
                    password: roomPassword, // 在實際應用中，密碼應該被哈希處理
                    rules: gameRules,
                    creatorId: userId,
                    creatorName: userName,
                    createdAt: new Date(),
                    players: [{ id: userId, name: userName }] // 創建者自動加入
                });
                console.log("Room created with ID:", newRoomRef.id);
                await window.customAlert(`房間 "${roomName}" 創建成功！`);
                // 清空表單
                createRoomNameInput.value = '';
                createRoomPasswordInput.value = '';
                gameRulesInput.value = '';
                // 自動進入房間或導向到房間頁面
                enterRoom(newRoomRef.id, roomName, roomPassword, userName);

            } catch (e) {
                console.error("Error adding document: ", e);
                await window.customAlert("創建房間失敗，請重試！");
            }
        });
    }

    // 處理通過 ID 和密碼進入房間
    if (joinRoomByIdButton) {
        joinRoomByIdButton.addEventListener('click', async () => {
            const roomId = joinRoomIdInput.value;
            const joinRoomPassword = joinRoomPasswordInput.value;
            const userName = userNameInput.value;

            if (!roomId || !userName) {
                await window.customAlert("房間 ID 和您的名稱不能為空！");
                return;
            }

            try {
                const roomDocRef = doc(db, `artifacts/${appId}/public/data/rooms`, roomId);
                const roomDoc = await getDoc(roomDocRef);

                if (roomDoc.exists()) {
                    const roomData = roomDoc.data();
                    if (roomData.password && roomData.password !== joinRoomPassword) {
                        await window.customAlert("密碼錯誤！");
                        return;
                    }

                    // 檢查玩家是否已在房間內
                    const playerExists = roomData.players.some(player => player.id === userId);
                    if (!playerExists) {
                        // 將玩家加入房間
                        const updatedPlayers = [...roomData.players, { id: userId, name: userName }];
                        await updateDoc(roomDocRef, { players: updatedPlayers });
                        console.log(`User ${userName} joined room ${roomData.name}`);
                    } else {
                        console.log(`User ${userName} is already in room ${roomData.name}`);
                    }

                    await window.customAlert(`成功進入房間 "${roomData.name}"！`);
                    // 清空表單
                    joinRoomIdInput.value = '';
                    joinRoomPasswordInput.value = '';
                    // 進入房間或導向到房間頁面
                    enterRoom(roomId, roomData.name, roomData.password, userName);

                } else {
                    await window.customAlert("房間不存在！");
                }
            } catch (error) {
                console.error("Error joining room by ID:", error);
                await window.customAlert("進入房間失敗，請重試！");
            }
        });
    }

    // 顯示可用房間的函數
    function displayRooms(rooms) {
        if (availableRoomsDiv) {
            availableRoomsDiv.innerHTML = ''; // 清空現有列表
            if (rooms.length === 0) {
                availableRoomsDiv.innerHTML = '<p class="text-gray-500">目前沒有可用的房間。</p>';
                availableRoomsDiv.classList.add('flex', 'items-center', 'justify-center'); // 重新添加居中
                return;
            }
            const ul = document.createElement('ul');
            ul.className = 'space-y-2 w-full'; // Add w-full to make it take full width
            rooms.forEach(room => {
                const li = document.createElement('li');
                li.className = 'bg-gray-100 p-3 rounded-lg shadow-sm flex justify-between items-center';
                li.innerHTML = `
                    <div>
                        <h4 class="font-semibold text-lg">${room.name}</h4>
                        <p class="text-sm text-gray-600">玩家: ${room.players ? room.players.length : 0}</p>
                        <p class="text-xs text-gray-500">ID: ${room.id}</p>
                    </div>
                    <button class="join-room-btn bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors duration-200" data-room-id="${room.id}" data-room-name="${room.name}" data-room-password="${room.password || ''}">加入</button>
                `;
                ul.appendChild(li);
            });
            availableRoomsDiv.appendChild(ul);
            availableRoomsDiv.classList.remove('flex', 'items-center', 'justify-center'); // 移除居中以顯示列表
        }

        // 為每個加入按鈕添加事件監聽器
        availableRoomsDiv.querySelectorAll('.join-room-btn').forEach(button => {
            button.addEventListener('click', async () => {
                const roomId = button.dataset.roomId;
                const roomName = button.dataset.roomName;
                const roomPassword = button.dataset.roomPassword;
                const userName = userNameInput.value;

                if (!userName) {
                    await window.customAlert("請先輸入您的名稱！");
                    return;
                }

                // 如果房間有密碼，提示用戶輸入
                if (roomPassword) {
                    const enteredPassword = await window.customPrompt(`請輸入房間 "${roomName}" 的密碼：`);
                    if (enteredPassword === null || enteredPassword !== roomPassword) {
                        await window.customAlert("密碼錯誤或取消！");
                        return;
                    }
                }
                enterRoom(roomId, roomName, roomPassword, userName);
            });
        });
    }

    // 進入房間後的處理函數（您可以擴展此函數來顯示遊戲介面）
    async function enterRoom(roomId, roomName, roomPassword, userName) {
        console.log(`進入房間: ${roomName} (ID: ${roomId})，用戶: ${userName}`);
        // 在這裡您可以隱藏房間列表，顯示遊戲介面
        if (mainContainer && gameRoomSection && currentRoomNameDisplay && currentRoomIdDisplay && currentUserNameDisplay && currentUserIdDisplay && roomPlayersList) {
            mainContainer.classList.add('hidden'); // 隱藏主容器
            gameRoomSection.classList.remove('hidden'); // 顯示遊戲房間模態框
            currentRoomNameDisplay.textContent = roomName;
            currentRoomIdDisplay.textContent = roomId;
            currentUserNameDisplay.textContent = userName;
            currentUserIdDisplay.textContent = userId; // 顯示完整的 userId

            // 監聽當前房間的玩家列表變化
            const roomDocRef = doc(db, `artifacts/${appId}/public/data/rooms`, roomId);
            onSnapshot(roomDocRef, (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const roomData = docSnapshot.data();
                    const players = roomData.players || [];
                    roomPlayersList.innerHTML = ''; // 清空現有列表
                    players.forEach(player => {
                        const li = document.createElement('li');
                        li.className = 'bg-gray-50 p-2 rounded-md shadow-sm';
                        li.textContent = `${player.name} (ID: ${player.id})`;
                        roomPlayersList.appendChild(li);
                    });
                } else {
                    // 如果房間不存在了（例如被創建者刪除），則退出房間
                    console.log("Room no longer exists. Exiting room.");
                    window.customAlert("房間已被刪除！您將被導回房間列表。").then(() => {
                        exitRoom();
                    });
                }
            }, (error) => {
                console.error("Error fetching room players:", error);
            });
        }
    }

    // 退出房間的函數
    window.exitRoom = async function() {
        if (mainContainer && gameRoomSection && currentRoomIdDisplay && userId) {
            const currentRoomId = currentRoomIdDisplay.textContent;
            try {
                const roomDocRef = doc(db, `artifacts/${appId}/public/data/rooms`, currentRoomId);
                const roomDoc = await getDoc(roomDocRef);

                if (roomDoc.exists()) {
                    const roomData = roomDoc.data();
                    // 過濾掉當前用戶，但如果用戶是唯一一個玩家，則不從列表中移除
                    // 這樣即使是最後一個退出的人，房間也不會自動消失
                    // 只有創建者才能刪除房間
                    const updatedPlayers = roomData.players.filter(player => player.id !== userId);
                    await updateDoc(roomDocRef, { players: updatedPlayers });
                    console.log(`User ${userId} exited room ${currentRoomId}`);
                }
            } catch (error) {
                console.error("Error exiting room:", error);
            } finally {
                gameRoomSection.classList.add('hidden'); // 隱藏遊戲房間模態框
                mainContainer.classList.remove('hidden'); // 顯示主容器
                // 清空房間相關顯示
                currentRoomNameDisplay.textContent = '';
                currentRoomIdDisplay.textContent = '';
                roomPlayersList.innerHTML = '';
                // 清空加入房間的輸入框
                joinRoomIdInput.value = '';
                joinRoomPasswordInput.value = '';
            }
        }
    };
}
