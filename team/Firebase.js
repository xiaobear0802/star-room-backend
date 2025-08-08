// Firebase.js
// 這個檔案負責初始化 Firebase 並導出所需的服務實例。

// 從 CDN 導入 Firebase SDK 模組
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// 如果您需要 Analytics，也可以導入：
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";

// 您的網頁應用程式的 Firebase 配置 (請替換為您自己的實際值)
const firebaseConfig = {
  apiKey: "AIzaSyA8zjoOKjc4uK6y73V5eb-QjZeYWl3kUEQ",
  authDomain: "team-a3e3a.firebaseapp.com",
  projectId: "team-a3e3a",
  storageBucket: "team-a3e3a.firebasestorage.app",
  messagingSenderId: "377611437601",
  appId: "1:377611437601:web:37508e08c5c21904ed4560",
  measurementId: "G-LNSYQVT2YX" // 如果有啟用 Analytics
};

// 初始化 Firebase 應用程式
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); // 如果需要 Analytics，取消註解這行

// 導出 Firebase 服務實例和專案 ID，供其他檔案使用
export const auth = getAuth(app);
export const db = getFirestore(app);
export const projectAppId = firebaseConfig.projectId; // 導出 projectId 作為 appId
