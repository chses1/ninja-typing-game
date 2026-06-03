// server/server.js
require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'english-type';
const FIREBASE_CERT_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const DEFAULT_TEACHER_EMAIL = 'cairo1680@apps.chses.tyc.edu.tw';
const TEACHER_EMAILS = new Set(
  [DEFAULT_TEACHER_EMAIL, ...(process.env.TEACHER_EMAILS || '').split(',')]
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
);

let firebaseCertCache = {
  expiresAt: 0,
  certs: {}
};

app.use(cors({
  origin: [
    'https://chses1.github.io',
    'https://ninja-typing-game.onrender.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ]
}));

app.use(express.json({ limit: '1mb' }));
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
  firebaseUid: { type: String, index: true, unique: true, sparse: true },
  email: { type: String, default: '' },
  displayName: { type: String, default: '' },
  photoURL: { type: String, default: '' },
  playerId: { type: String, index: true },
  highestLevel: { type: Number, default: 0 },
  highestScore: { type: Number, default: 0 },
  bestCombo: { type: Number, default: 0 },
  vocabCount: { type: Number, default: 0 },
  trophyCount: { type: Number, default: 0 },
  bronzeCount: { type: Number, default: 0 },
  silverCount: { type: Number, default: 0 },
  goldCount: { type: Number, default: 0 },
  unlockedWords: { type: [String], default: [] },
  achievementsUnlocked: { type: [String], default: [] },
  lastLoginAt: Date,
  lastPlayedAt: Date
}, { timestamps: true });

const Leaderboard = mongoose.model('Leaderboard', boardSchema);

function base64UrlDecode(input) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64');
}

function parseJwt(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('Firebase token 格式不正確');
  return {
    header: JSON.parse(base64UrlDecode(parts[0]).toString('utf8')),
    payload: JSON.parse(base64UrlDecode(parts[1]).toString('utf8')),
    signature: parts[2],
    signedContent: `${parts[0]}.${parts[1]}`
  };
}

async function getFirebaseCerts() {
  if (firebaseCertCache.expiresAt > Date.now() && Object.keys(firebaseCertCache.certs).length > 0) {
    return firebaseCertCache.certs;
  }

  const res = await fetch(FIREBASE_CERT_URL);
  if (!res.ok) throw new Error('無法取得 Firebase 驗證憑證');
  const cacheControl = res.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 60 * 60 * 1000;
  firebaseCertCache = {
    expiresAt: Date.now() + maxAgeMs,
    certs: await res.json()
  };
  return firebaseCertCache.certs;
}

async function verifyFirebaseIdToken(token) {
  const { header, payload, signature, signedContent } = parseJwt(token);
  if (header.alg !== 'RS256') throw new Error('Firebase token 演算法不正確');
  if (!header.kid) throw new Error('Firebase token 缺少 key id');

  const certs = await getFirebaseCerts();
  const cert = certs[header.kid];
  if (!cert) throw new Error('Firebase token key id 無效');

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(signedContent);
  verifier.end();
  const valid = verifier.verify(cert, base64UrlDecode(signature));
  if (!valid) throw new Error('Firebase token 簽章無效');

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== FIREBASE_PROJECT_ID) throw new Error('Firebase token 專案不符');
  if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) {
    throw new Error('Firebase token 發行者不符');
  }
  if (!payload.sub || typeof payload.sub !== 'string') throw new Error('Firebase token 缺少使用者');
  if (payload.exp <= now) throw new Error('Firebase token 已過期');
  if (payload.iat > now + 300) throw new Error('Firebase token 時間不正確');

  return payload;
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isTeacherEmail(email) {
  return TEACHER_EMAILS.has(normalizeEmail(email));
}

async function requireFirebaseUser(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: '請先使用 Google 登入' });
    req.firebaseUser = await verifyFirebaseIdToken(token);
    next();
  } catch (err) {
    console.error('🚨 Firebase 驗證失敗：', err.message);
    res.status(401).json({ error: 'Google 登入驗證失敗' });
  }
}

function requireTeacher(req, res, next) {
  if (!isTeacherEmail(req.firebaseUser?.email)) {
    return res.status(403).json({ error: '此 Google 帳號沒有老師後台權限' });
  }
  next();
}

function normalizePlayerId(value) {
  return String(value || '').trim();
}

function validatePlayerId(playerId) {
  return /^\d{5}$/.test(playerId);
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(v => String(v || '').trim()).filter(Boolean))];
}

function countFromBody(body, key, fallback = 0) {
  const value = Number(body[key]);
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
}

function toLeaderboardItem(item, { includePrivate = false } = {}) {
  const totalScore =
    (item.highestScore || 0) +
    (item.vocabCount || 0) * 100 +
    (item.bronzeCount || 0) * 100 +
    (item.silverCount || 0) * 300 +
    (item.goldCount || 0) * 500;

  const output = {
    studentId: String(item._id),
    playerId: item.playerId,
    displayName: item.displayName || '',
    highestLevel: item.highestLevel || 0,
    highestScore: item.highestScore || 0,
    bestCombo: item.bestCombo || 0,
    vocabCount: item.vocabCount || 0,
    trophyCount: item.trophyCount || 0,
    bronzeCount: item.bronzeCount || 0,
    silverCount: item.silverCount || 0,
    goldCount: item.goldCount || 0,
    totalScore,
    lastLoginAt: item.lastLoginAt,
    lastPlayedAt: item.lastPlayedAt,
    updatedAt: item.updatedAt
  };

  if (includePrivate) {
    output.unlockedWords = item.unlockedWords || [];
    output.achievementsUnlocked = item.achievementsUnlocked || [];
  }

  return output;
}

function toUserProfile(item, firebaseUser) {
  const email = item?.email || firebaseUser?.email || '';
  return {
    uid: firebaseUser?.sub || item?.firebaseUid || '',
    email,
    displayName: item?.displayName || firebaseUser?.name || '',
    photoURL: item?.photoURL || firebaseUser?.picture || '',
    playerId: item?.playerId || '',
    role: isTeacherEmail(email) ? 'teacher' : 'student',
    needsPlayerId: !item?.playerId
  };
}

async function findOrCreateUserRecord(firebaseUser, playerId = '') {
  const uid = firebaseUser.sub;
  const email = normalizeEmail(firebaseUser.email);
  const desiredPlayerId = normalizePlayerId(playerId);

  if (desiredPlayerId && !validatePlayerId(desiredPlayerId)) {
    const err = new Error('請輸入正好 5 位數字編號');
    err.status = 400;
    throw err;
  }

  let entry = await Leaderboard.findOne({ firebaseUid: uid });
  if (!entry && desiredPlayerId) {
    const legacy = await Leaderboard.findOne({ firebaseUid: { $exists: false }, playerId: desiredPlayerId });
    if (legacy) entry = legacy;
  }
  if (!entry) entry = new Leaderboard({ firebaseUid: uid });

  if (desiredPlayerId) entry.playerId = desiredPlayerId;
  entry.firebaseUid = uid;
  entry.email = email;
  entry.displayName = firebaseUser.name || entry.displayName || '';
  entry.photoURL = firebaseUser.picture || entry.photoURL || '';
  entry.lastLoginAt = new Date();
  await entry.save();
  return entry;
}

function mergeProgress(entry, body = {}) {
  const unlockedWords = uniqueStrings([...(entry.unlockedWords || []), ...uniqueStrings(body.unlockedWords)]);
  const achievementsUnlocked = uniqueStrings([
    ...(entry.achievementsUnlocked || []),
    ...uniqueStrings(body.achievementsUnlocked)
  ]);

  entry.highestLevel = Math.max(entry.highestLevel || 0, countFromBody(body, 'highestLevel'));
  entry.highestScore = Math.max(entry.highestScore || 0, countFromBody(body, 'highestScore'));
  entry.bestCombo = Math.max(entry.bestCombo || 0, countFromBody(body, 'bestCombo'));
  entry.unlockedWords = unlockedWords;
  entry.achievementsUnlocked = achievementsUnlocked;
  entry.vocabCount = Math.max(entry.vocabCount || 0, countFromBody(body, 'vocabCount', unlockedWords.length), unlockedWords.length);
  entry.trophyCount = Math.max(
    entry.trophyCount || 0,
    countFromBody(body, 'trophyCount', achievementsUnlocked.length),
    achievementsUnlocked.length
  );
  entry.bronzeCount = Math.max(entry.bronzeCount || 0, countFromBody(body, 'bronzeCount'));
  entry.silverCount = Math.max(entry.silverCount || 0, countFromBody(body, 'silverCount'));
  entry.goldCount = Math.max(entry.goldCount || 0, countFromBody(body, 'goldCount'));
  entry.lastPlayedAt = new Date();
}

app.post('/auth/google', requireFirebaseUser, async (req, res) => {
  try {
    const entry = await findOrCreateUserRecord(req.firebaseUser, req.body.playerId);
    res.json({
      user: toUserProfile(entry, req.firebaseUser),
      progress: toLeaderboardItem(entry, { includePrivate: true })
    });
  } catch (err) {
    console.error('🚨 Google 登入同步失敗：', err);
    res.status(err.status || 500).json({ error: err.message || '登入同步失敗' });
  }
});

app.get('/me', requireFirebaseUser, async (req, res) => {
  const entry = await Leaderboard.findOne({ firebaseUid: req.firebaseUser.sub });
  res.json({ user: toUserProfile(entry, req.firebaseUser) });
});

app.get('/progress', requireFirebaseUser, async (req, res) => {
  const entry = await Leaderboard.findOne({ firebaseUid: req.firebaseUser.sub });
  if (!entry) return res.status(404).json({ error: '找不到學生進度' });
  res.json({
    user: toUserProfile(entry, req.firebaseUser),
    progress: toLeaderboardItem(entry, { includePrivate: true })
  });
});

app.post('/progress', requireFirebaseUser, async (req, res) => {
  try {
    const entry = await Leaderboard.findOne({ firebaseUid: req.firebaseUser.sub });
    if (!entry || !entry.playerId) {
      return res.status(400).json({ error: '請先設定班級座號' });
    }
    mergeProgress(entry, req.body);
    await entry.save();
    res.status(201).json({
      user: toUserProfile(entry, req.firebaseUser),
      progress: toLeaderboardItem(entry, { includePrivate: true })
    });
  } catch (err) {
    console.error('🚨 進度寫入失敗：', err);
    res.status(500).json({ error: '伺服器寫入失敗' });
  }
});

app.get('/leaderboard', async (req, res) => {
  try {
    const classPrefix = String(req.query.classPrefix || '').trim();
    const query = classPrefix ? { playerId: new RegExp(`^${classPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) } : {};
    const data = await Leaderboard.find(query);
    const computed = data.map(item => toLeaderboardItem(item));
    computed.sort((a, b) => b.totalScore - a.totalScore);
    res.json(computed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '伺服器讀取失敗' });
  }
});

app.post('/leaderboard', requireFirebaseUser, async (req, res) => {
  try {
    const entry = await Leaderboard.findOne({ firebaseUid: req.firebaseUser.sub });
    if (!entry || !entry.playerId) {
      return res.status(400).json({ error: '請先設定班級座號' });
    }
    mergeProgress(entry, req.body);
    await entry.save();
    res.status(201).json(toLeaderboardItem(entry, { includePrivate: true }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '伺服器寫入失敗' });
  }
});

app.get('/admin/leaderboard', requireFirebaseUser, requireTeacher, async (req, res) => {
  try {
    const classPrefix = String(req.query.classPrefix || '').trim();
    const query = classPrefix ? { playerId: new RegExp(`^${classPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) } : {};
    const data = await Leaderboard.find(query);
    const computed = data.map(item => toLeaderboardItem(item, { includePrivate: true }));
    computed.sort((a, b) => b.totalScore - a.totalScore);
    res.json(computed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '伺服器讀取失敗' });
  }
});

app.delete('/admin/leaderboard/:studentId', requireFirebaseUser, requireTeacher, async (req, res) => {
  try {
    const { studentId } = req.params;
    const query = mongoose.Types.ObjectId.isValid(studentId)
      ? { _id: studentId }
      : { playerId: studentId };
    const result = await Leaderboard.deleteOne(query);

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: '找不到該學生紀錄' });
    }

    res.status(200).json({ message: '學生紀錄已刪除' });
  } catch (err) {
    console.error('🚨 刪除單一學生失敗：', err);
    res.status(500).json({ error: '伺服器刪除失敗' });
  }
});

app.delete('/leaderboard', requireFirebaseUser, requireTeacher, async (req, res) => {
  try {
    await Leaderboard.deleteMany({});
    res.status(200).json({ message: '所有排行榜成績已清除' });
  } catch (err) {
    console.error('🚨 刪除排行榜失敗：', err);
    res.status(500).json({ error: '伺服器刪除失敗' });
  }
});

app.delete('/leaderboard/:playerId', requireFirebaseUser, requireTeacher, async (req, res) => {
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
