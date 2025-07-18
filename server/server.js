// server/server.js
require('dotenv').config();
console.log('🔍 MONGODB_URI=mongodb+srv://chses1:r122574782@cluster0.cltpvmb.mongodb.net/', process.env.MONGODB_URI);   // ← 確認 env 變數有載入
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');

const app = express();
// 允許所有來源 (或只允許你的 GH Pages 網域)
app.use(cors({
  origin: ['https://chses1.github.io']  // 或 simply origin: '*'
}));
app.use(express.json());

// 連接 MongoDB Cloud
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 50,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4
})
.then(() => {
  console.log('✅ 已連線到 MongoDB');
  console.log(`🚀 伺服器設定的 PORT = ${process.env.PORT || 3000}`);
})
.catch(err => console.error('🚨 MongoDB 連線錯誤：', err));

// 定義 Leaderboard schema
const boardSchema = new mongoose.Schema({
  playerId:     String,
  highestLevel: Number,
  highestScore: Number,
  vocabCount:   Number,
  // 原本的 trophyCount 我們保留，但不再作為主要計算依據
  trophyCount:  Number,
  // 新增成就細項欄位
  bronzeCount:  { type: Number, default: 0 }, // 銅牌數
  silverCount:  { type: Number, default: 0 }, // 銀牌數
  goldCount:    { type: Number, default: 0 }  // 金牌數
}, { timestamps: true });
const Leaderboard = mongoose.model('Leaderboard', boardSchema);

// GET /leaderboard → 取所有排行
// GET /leaderboard → 取所有排行（並計算 totalScore、由大到小排序後回傳）
app.get('/leaderboard', async (req, res) => {
  try {
    // 1. 先取出所有紀錄
    const data = await Leaderboard.find({});

    // 2. 對每筆資料計算 totalScore
    //    totalScore = highestScore
    //               + vocabCount * 100
    //               + bronzeCount * 100
    //               + silverCount * 300
    //               + goldCount * 500
    const computed = data.map(item => {
      const totalScore =
        (item.highestScore || 0)
        + (item.vocabCount   || 0) * 100
        + (item.bronzeCount  || 0) * 100
        + (item.silverCount  || 0) * 300
        + (item.goldCount    || 0) * 500;

      // 將 totalScore 附加到回傳物件
      return {
        playerId:     item.playerId,
        highestLevel: item.highestLevel,
        highestScore: item.highestScore,
        vocabCount:   item.vocabCount,
        trophyCount:  item.trophyCount,
        bronzeCount:  item.bronzeCount,
        silverCount:  item.silverCount,
        goldCount:    item.goldCount,
        totalScore,   // 新增這個欄位
        updatedAt:    item.updatedAt  // 如果你想在前端顯示最後更新時間，也可以一起帶回
      };
    });

    // 3. 依 totalScore 從大到小排序
    computed.sort((a, b) => b.totalScore - a.totalScore);

    // 4. 回傳 JSON 給前端
    res.json(computed);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '伺服器讀取失敗' });
  }
});

// POST /leaderboard → 新增或更新玩家成績
app.post('/leaderboard', async (req, res) => {
  try {
    // 新增：從 body 接收更完整的欄位
    const {
      playerId,
      highestLevel,
      highestScore,
      vocabCount,
      trophyCount,
      bronzeCount,
      silverCount,
      goldCount
    } = req.body;

    let entry = await Leaderboard.findOne({ playerId });
    if (entry) {
      // 如果已經有這個 playerId，就取「更高」或「較多」的值
      entry.highestLevel = Math.max(entry.highestLevel, highestLevel);
      entry.highestScore = Math.max(entry.highestScore, highestScore);
      entry.vocabCount   = Math.max(entry.vocabCount,   vocabCount);
      entry.trophyCount  = Math.max(entry.trophyCount,  trophyCount);

      // 下面三行依照「取最大值」更新各獎牌數
      entry.bronzeCount  = Math.max(entry.bronzeCount,  bronzeCount);
      entry.silverCount  = Math.max(entry.silverCount,  silverCount);
      entry.goldCount    = Math.max(entry.goldCount,    goldCount);

      await entry.save();
    } else {
      // 不存在就新增一筆，帶入所有欄位
      entry = new Leaderboard({
        playerId,
        highestLevel,
        highestScore,
        vocabCount,
        trophyCount,
        bronzeCount,
        silverCount,
        goldCount
      });
      await entry.save();
    }
    res.status(201).json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '伺服器寫入失敗' });
  }
});

// 在 POST /leaderboard 之後，新增 DELETE /leaderboard
// 這個路由會刪除 Leaderboard collection 裡的所有紀錄
app.delete('/leaderboard', async (req, res) => {
  try {
    // 刪除所有文件
    await Leaderboard.deleteMany({});
    res.status(200).json({ message: '所有排行榜成績已清除' });
  } catch (err) {
    console.error('🚨 刪除排行榜失敗：', err);
    res.status(500).json({ error: '伺服器刪除失敗' });
  }
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Leaderboard 伺服器啟動於 http://localhost:${PORT}`));
