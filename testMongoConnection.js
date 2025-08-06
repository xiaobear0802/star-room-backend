// 引入 MongoDB 驅動程式
const { MongoClient, ServerApiVersion } = require('mongodb');

// 您的 MongoDB 連線字串
// 請確保將 <xiaobear> 替換為您的使用者名稱，<Qaz74109630> 替換為您的密碼
const uri = "mongodb+srv://xiaobear:Qaz74109630@cluster0.bc8amjp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// 建立一個新的 MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // 連接到 MongoDB 伺服器
    console.log("嘗試連接到 MongoDB...");
    await client.connect();
    console.log("成功連接到 MongoDB！");

    // 執行一個 ping 命令來確認連接成功
    await client.db("admin").command({ ping: 1 });
    console.log("Ping 您的部署成功。您已成功連接到 MongoDB！");

    // 列出所有資料庫
    console.log("\n列出所有資料庫:");
    const databasesList = await client.db().admin().listDatabases();
    databasesList.databases.forEach(db => console.log(`- ${db.name}`));

  } catch (error) {
    // 捕獲並印出任何錯誤
    console.error("連接或操作 MongoDB 時發生錯誤:", error);
  } finally {
    // 確保客戶端在完成或發生錯誤時關閉連接
    console.log("\n關閉 MongoDB 連接。");
    await client.close();
  }
}

// 執行主函數
run().catch(console.dir);
