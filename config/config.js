// star/config.js

module.exports = {
  // 你的 MongoDB 連線 URI
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/star-room',

  // 你的管理員列表
  ADMIN_LIST: process.env.ADMIN_LIST
    ? process.env.ADMIN_LIST.split(',').map(name => name.trim())
    : ['admin', 'xiaobear', 'babybear'],

  // 其他設定...
};