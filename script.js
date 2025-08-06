// Custom Alert Function (定義為全局，以便 index.html 中的 onclick 可以調用)
//========================================================
// Custom Alert and Prompt Functions
//========================================================
window.customAlert = function(message, title = "提示") {
    return new Promise(resolve => {
        const dialog = document.getElementById('customAlertDialog');
        const msgElement = document.getElementById('customAlertMessage');
        const titleElement = document.getElementById('customAlertTitle');
        const okButton = document.getElementById('customAlertOkButton');

        if (!dialog || !msgElement || !titleElement || !okButton) {
            console.error("Custom alert dialog elements not found in DOM.");
            alert(`${title}: ${message}`); // Fallback to native alert
            resolve();
            return;
        }

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

        if (!dialog || !msgElement || !titleElement || !inputElement || !okButton || !cancelButton) {
            console.error("Custom prompt dialog elements not found in DOM.");
            const result = prompt(`${title}: ${message}`, defaultValue); // Fallback to native prompt
            resolve(result);
            return;
        }

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
// 已更新為 Firebase JS SDK 11.6.1 版本
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, getDoc, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA8pRY3Blep_NFyINsZHGb9eKAJX_jWcEM",
    authDomain: "star-3a045.firebaseapp.com",
    projectId: "star-3a045",
    storageBucket: "star-3a045.firebasestorage.app",
    messagingSenderId: "1022086956918",
    appId: "1:1022086956918:web:57a9fd275f43f1112bdc57",
    measurementId: "G-TXL6CBL7SE"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = firebaseConfig.appId;
const initialAuthToken = null;

let userId = null;

// 監聽認證狀態變化
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userId = user.uid;
        console.log("User signed in:", userId);
        setupApp();
    } else {
        try {
            if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
            } else {
                await signInAnonymously(auth);
            }
            userId = auth.currentUser?.uid || crypto.randomUUID();
            console.log("Signed in anonymously or with custom token. User ID:", userId);
            setupApp();
        } catch (error) {
            console.error("Error signing in:", error);
            await window.customAlert(`登入失敗，請檢查網路連接或稍後再試。錯誤: ${error.message}`);
        }
    }
});

// 確保您的其他 JavaScript 邏輯在 Firebase 初始化和認證完成後執行
async function setupApp() {
    if (!userId) {
        console.log("Waiting for user authentication...");
        return;
    }

    const userNameInput = document.getElementById('userNameInput');
    const createRoomButton = document.getElementById('createRoomButton');
    const createRoomNameInput = document.getElementById('createRoomNameInput');
    const createRoomPasswordInput = document.getElementById('createRoomPasswordInput');
    const gameRulesInput = document.getElementById('gameRulesInput');
    const joinRoomByIdButton = document.getElementById('joinRoomByIdButton');
    const joinRoomIdInput = document.getElementById('joinRoomIdInput');
    const joinRoomPasswordInput = document.getElementById('joinRoomPasswordInput');
    const mainContainer = document.querySelector('.main-container');
    const gameRoomSection = document.getElementById('gameRoom');
    const currentRoomNameDisplay = document.getElementById('currentRoomName');
    const currentRoomIdDisplay = document.getElementById('currentRoomId');
    const currentUserNameDisplay = document.getElementById('currentUserName');
    const currentUserIdDisplay = document.getElementById('currentUserId');
    const roomPlayersList = document.getElementById('roomPlayersList');
    const availableRoomsDiv = document.getElementById('availableRooms');

    const roomsCollectionRef = collection(db, `artifacts/${appId}/public/data/rooms`);
    onSnapshot(roomsCollectionRef, (snapshot) => {
        const rooms = [];
        snapshot.forEach(doc => {
            rooms.push({ id: doc.id, ...doc.data() });
        });
        displayRooms(rooms);
    }, (error) => {
        console.error("Error fetching rooms:", error);
        window.customAlert(`無法載入房間列表：${error.message}`);
    });

    if (createRoomButton) {
        createRoomButton.addEventListener('click', async () => {
            const roomName = createRoomNameInput.value.trim();
            const roomPassword = createRoomPasswordInput.value.trim();
            const gameRules = gameRulesInput.value.trim();
            const userName = userNameInput.value.trim();

            if (!roomName || !userName) {
                await window.customAlert("房間名稱和您的名稱不能為空！");
                return;
            }

            try {
                const newRoomRef = await addDoc(roomsCollectionRef, {
                    name: roomName,
                    password: roomPassword,
                    rules: gameRules,
                    creatorId: userId,
                    creatorName: userName,
                    createdAt: new Date(),
                    players: [{ id: userId, name: userName }]
                });
                console.log("Room created with ID:", newRoomRef.id);
                await window.customAlert(`房間 "${roomName}" 創建成功！`);

                createRoomNameInput.value = '';
                createRoomPasswordInput.value = '';
                gameRulesInput.value = '';
                
                enterRoom(newRoomRef.id, roomName, roomPassword, userName);
            } catch (e) {
                console.error("Error adding document: ", e);
                await window.customAlert("創建房間失敗，請重試！");
            }
        });
    }

    if (joinRoomByIdButton) {
        joinRoomByIdButton.addEventListener('click', async () => {
            const roomId = joinRoomIdInput.value.trim();
            const joinRoomPassword = joinRoomPasswordInput.value.trim();
            const userName = userNameInput.value.trim();

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

                    const playerExists = roomData.players.some(player => player.id === userId);
                    if (!playerExists) {
                        const updatedPlayers = [...roomData.players, { id: userId, name: userName }];
                        await updateDoc(roomDocRef, { players: updatedPlayers });
                        console.log(`User ${userName} joined room ${roomData.name}`);
                    } else {
                        console.log(`User ${userName} is already in room ${roomData.name}`);
                    }

                    await window.customAlert(`成功進入房間 "${roomData.name}"！`);
                    joinRoomIdInput.value = '';
                    joinRoomPasswordInput.value = '';
                    enterRoom(roomId, roomData.name, roomData.password, userName);
                } else {
                    await window.customAlert("房間不存在！");
                }
            } catch (e) {
                console.error("Error joining room:", e);
                await window.customAlert("加入房間失敗，請重試！");
            }
        });
    }

    function displayRooms(rooms) {
        if (availableRoomsDiv) {
            availableRoomsDiv.innerHTML = '';
            if (rooms.length === 0) {
                availableRoomsDiv.innerHTML = '<p class="text-gray-500">目前沒有可用的房間。</p>';
                availableRoomsDiv.classList.add('flex', 'items-center', 'justify-center');
                return;
            }
            const ul = document.createElement('ul');
            ul.className = 'space-y-2 w-full';
            rooms.forEach(room => {
                const li = document.createElement('li');
                li.className = 'bg-gray-100 p-3 rounded-lg shadow-sm flex justify-between items-center';
                const roomInfo = `
                    <div>
                        <h3 class="font-semibold text-lg">${room.name}</h3>
                        <p class="text-gray-600 text-sm">玩家人數: ${room.players ? room.players.length : 0}</p>
                    </div>
                `;
                const joinButton = document.createElement('button');
                joinButton.textContent = room.password ? '加入 (需密碼)' : '加入';
                joinButton.className = `join-room-btn px-4 py-2 rounded-md font-medium text-white ${room.password ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'}`;
                joinButton.dataset.roomId = room.id;
                joinButton.dataset.roomName = room.name;
                if (room.password) {
                    joinButton.dataset.roomPassword = room.password;
                }

                li.innerHTML = roomInfo;
                li.appendChild(joinButton);
                ul.appendChild(li);
            });
            availableRoomsDiv.appendChild(ul);
            availableRoomsDiv.classList.remove('flex', 'items-center', 'justify-center');
        }

        availableRoomsDiv.querySelectorAll('.join-room-btn').forEach(button => {
            button.addEventListener('click', async () => {
                const roomId = button.dataset.roomId;
                const roomName = button.dataset.roomName;
                const roomPassword = button.dataset.roomPassword;
                const userName = userNameInput.value.trim();

                if (!userName) {
                    await window.customAlert("請先輸入您的名稱！");
                    return;
                }
                
                if (roomPassword) {
                    const enteredPassword = await window.customPrompt(`請輸入房間 "${roomName}" 的密碼：`);
                    if (enteredPassword === null || enteredPassword !== roomPassword) {
                        await window.customAlert("密碼錯誤或取消輸入！");
                        return;
                    }
                }
                enterRoom(roomId, roomName, roomPassword, userName);
            });
        });
    }

    async function enterRoom(roomId, roomName, roomPassword, userName) {
        console.log(`進入房間: ${roomName} (ID: ${roomId})，用戶: ${userName}`);
        if (mainContainer && gameRoomSection && currentRoomNameDisplay && currentRoomIdDisplay && currentUserNameDisplay && currentUserIdDisplay && roomPlayersList) {
            mainContainer.classList.add('hidden');
            gameRoomSection.classList.remove('hidden');
            currentRoomNameDisplay.textContent = roomName;
            currentRoomIdDisplay.textContent = roomId;
            currentUserNameDisplay.textContent = userName;
            currentUserIdDisplay.textContent = userId;

            const roomDocRef = doc(db, `artifacts/${appId}/public/data/rooms`, roomId);
            onSnapshot(roomDocRef, (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const roomData = docSnapshot.data();
                    const players = roomData.players || [];
                    roomPlayersList.innerHTML = '';
                    players.forEach(player => {
                        const li = document.createElement('li');
                        li.className = 'bg-gray-50 p-2 rounded-md shadow-sm';
                        li.textContent = `${player.name} (ID: ${player.id})`;
                        roomPlayersList.appendChild(li);
                    });
                } else {
                    console.log("Room no longer exists. Exiting room.");
                    window.customAlert("房間已被刪除！您將被導回房間列表。").then(() => {
                        exitRoom();
                    });
                }
            });
        }
    }

    window.exitRoom = async function() {
        if (mainContainer && gameRoomSection && currentRoomIdDisplay && userId) {
            const currentRoomId = currentRoomIdDisplay.textContent;
            try {
                const roomDocRef = doc(db, `artifacts/${appId}/public/data/rooms`, currentRoomId);
                const roomDoc = await getDoc(roomDocRef);
                if (roomDoc.exists()) {
                    const roomData = roomDoc.data();
                    const updatedPlayers = roomData.players.filter(player => player.id !== userId);
                    await updateDoc(roomDocRef, { players: updatedPlayers });
                    console.log(`User ${userId} exited room ${currentRoomId}`);
                }
            } catch (error) {
                console.error("Error exiting room:", error);
                window.customAlert(`退出房間失敗：${error.message}`);
            } finally {
                gameRoomSection.classList.add('hidden');
                mainContainer.classList.remove('hidden');
                currentRoomNameDisplay.textContent = '';
                currentRoomIdDisplay.textContent = '';
                roomPlayersList.innerHTML = '';
                joinRoomIdInput.value = '';
                joinRoomPasswordInput.value = '';
            }
        }
    };
}