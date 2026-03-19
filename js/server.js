// server/server.js
require('dotenv').config();
console.log('🔍 MONGODB_URI=', process.env.MONGODB_URI);
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');

const app = express();
app.use(cors({
  origin: [
    'https://chses1.github.io',
    'https://ninja-typing-game.onrender.com'
  ]
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

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

const boardSchema = new mongoose.Schema({
  playerId:     String,
  highestLevel: Number,
  highestScore: Number,
  vocabCount:   Number,
  trophyCount:  Number,
  bronzeCount:  { type: Number, default: 0 },
  silverCount:  { type: Number, default: 0 },
  goldCount:    { type: Number, default: 0 }
}, { timestamps: true });
const Leaderboard = mongoose.model('Leaderboard', boardSchema);

function toLeaderboardItem(item) {
  const totalScore =
    (item.highestScore || 0) +
    (item.vocabCount   || 0) * 100 +
    (item.bronzeCount  || 0) * 100 +
    (item.silverCount  || 0) * 300 +
    (item.goldCount    || 0) * 500;

  return {
    playerId:     item.playerId,
    highestLevel: item.highestLevel,
    highestScore: item.highestScore,
    vocabCount:   item.vocabCount,
    trophyCount:  item.trophyCount,
    bronzeCount:  item.bronzeCount,
    silverCount:  item.silverCount,
    goldCount:    item.goldCount,
    totalScore,
    updatedAt:    item.updatedAt
  };
}

// GET /leaderboard
// 可選：?classPrefix=301 只取某班
app.get('/leaderboard', async (req, res) => {
  try {
    const classPrefix = String(req.query.classPrefix || '').trim();

    const data = await Leaderboard.find({});
    let computed = data.map(toLeaderboardItem);

    if (classPrefix) {
      computed = computed.filter(item => String(item.playerId || '').startsWith(classPrefix));
    }

    computed.sort((a, b) => b.totalScore - a.totalScore);
    res.json(computed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '伺服器讀取失敗' });
  }
});

app.post('/leaderboard', async (req, res) => {
  try {
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
      entry.highestLevel = Math.max(entry.highestLevel, highestLevel);
      entry.highestScore = Math.max(entry.highestScore, highestScore);
      entry.vocabCount   = Math.max(entry.vocabCount,   vocabCount);
      entry.trophyCount  = Math.max(entry.trophyCount,  trophyCount);
      entry.bronzeCount  = Math.max(entry.bronzeCount,  bronzeCount);
      entry.silverCount  = Math.max(entry.silverCount,  silverCount);
      entry.goldCount    = Math.max(entry.goldCount,    goldCount);
      await entry.save();
    } else {
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

app.delete('/leaderboard', async (req, res) => {
  try {
    await Leaderboard.deleteMany({});
    res.status(200).json({ message: '所有排行榜成績已清除' });
  } catch (err) {
    console.error('🚨 刪除排行榜失敗：', err);
    res.status(500).json({ error: '伺服器刪除失敗' });
  }
});

app.delete('/leaderboard/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const result = await Leaderboard.deleteOne({ playerId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: '找不到該玩家成績' });
    }

    res.status(200).json({ message: `玩家 ${playerId} 成績已刪除` });
  } catch (err) {
    console.error('🚨 刪除單一玩家失敗：', err);
    res.status(500).json({ error: '伺服器刪除失敗' });
  }
});

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Leaderboard 伺服器啟動於 http://localhost:${PORT}`));
