// js/main.js

import { setupInput }    from './input.js';
import { spawnLoop }     from './spawn.js';
import { renderUI }      from './ui.js';
// Expose core functions for debug jump-key
window.initLevel = initLevel;
window.renderUI  = renderUI;
window.spawnLoop = spawnLoop;
// 我們暫時只保留 submitScore，上線 API 後再恢復更新排行榜
import { updateLeaderboard, submitScore } from './leaderboard.js';
import { vocabulary }    from './vocabulary.js';
import { achievements } from './achievements.js';
/** 
 * 統計 achievementsUnlocked 裡面，銅／銀／金牌各有多少個 
 * @param {Array<string>} unlockedList gameState.achievementsUnlocked（已解鎖成就 ID 陣列）
 * @returns {Object} { bronzeCount, silverCount, goldCount }
 */
function countTrophies(unlockedList) {
  let bronzeCount = 0;
  let silverCount = 0;
  let goldCount   = 0;
  // achievements 是已經在 import 的陣列
  unlockedList.forEach(id => {
    // 找到對應成就物件
    const ach = achievements.find(a => a.id === id);
    if (ach) {
      if (ach.trophy === 'bronze')  bronzeCount++;
      if (ach.trophy === 'silver')  silverCount++;
      if (ach.trophy === 'gold')    goldCount++;
    }
  });
  return { bronzeCount, silverCount, goldCount };
}


function getPlayerRecordKey(suffix) {
  const pid = (window.gameState && window.gameState.player && window.gameState.player.id) || localStorage.getItem('currentPlayerId') || 'guest';
  return `typing_ninja_${suffix}_${pid}`;
}

function getPlayerRecords() {
  return {
    bestScore: Number(localStorage.getItem(getPlayerRecordKey('bestScore')) || 0),
    bestLevel: Number(localStorage.getItem(getPlayerRecordKey('bestLevel')) || 0),
    bestCombo: Number(localStorage.getItem(getPlayerRecordKey('bestCombo')) || 0),
    bestVocab: Number(localStorage.getItem(getPlayerRecordKey('bestVocab')) || 0),
  };
}

function savePlayerRecords(next) {
  localStorage.setItem(getPlayerRecordKey('bestScore'), String(next.bestScore || 0));
  localStorage.setItem(getPlayerRecordKey('bestLevel'), String(next.bestLevel || 0));
  localStorage.setItem(getPlayerRecordKey('bestCombo'), String(next.bestCombo || 0));
  localStorage.setItem(getPlayerRecordKey('bestVocab'), String(next.bestVocab || 0));
}

function ensureBossTutorialOverlay() {
  if (document.getElementById('boss-tutorial-overlay')) return;
  const el = document.createElement('div');
  el.id = 'boss-tutorial-overlay';
  el.innerHTML = `
    <div class="boss-tutorial-box">
      <h3>Boss 攻略</h3>
      <div class="boss-steps">
        1. 先打掉飛來的字母<br>
        2. 再照順序打單字<br>
        3. 全部命中就能過關
      </div>
      <button id="boss-tutorial-btn">我知道了，開始挑戰！</button>
    </div>
  `;
  document.body.appendChild(el);
  el.querySelector('#boss-tutorial-btn').onclick = () => el.classList.remove('show');
}

function showBossTutorialOnce() {
  ensureBossTutorialOverlay();
  if (gameState.bossTutorialShown) return false;
  gameState.bossTutorialShown = true;
  const el = document.getElementById('boss-tutorial-overlay');
  if (!el) return false;
  gameState.paused = true;
  if (typeof gameState.pauseSpawnSystems === 'function') {
    gameState.pauseSpawnSystems();
  }
  el.classList.add('show');
  const btn = el.querySelector('#boss-tutorial-btn');
  if (btn) {
    btn.onclick = () => {
      el.classList.remove('show');
      gameState.paused = false;
      if (typeof gameState.resumeSpawnSystems === 'function') {
        gameState.resumeSpawnSystems();
      }
    };
  }
  return true;
}

function ensureUnlockToast() {
  if (document.getElementById('unlock-toast')) return document.getElementById('unlock-toast');
  const el = document.createElement('div');
  el.id = 'unlock-toast';
  document.body.appendChild(el);
  return el;
}

function showUnlockToast(entry) {
  const el = ensureUnlockToast();
  el.innerHTML = `
    <div class="unlock-title">✨ 新解鎖單字</div>
    <div class="unlock-body">
      <img src="${entry.image}" alt="${entry.word}">
      <div>
        <div class="unlock-word">${entry.word}</div>
        <div class="unlock-meta">${entry.definition}｜${entry.category || `第 ${entry.level} 關`}</div>
      </div>
    </div>
  `;
  el.classList.add('show');
  clearTimeout(showUnlockToast._timer);
  showUnlockToast._timer = setTimeout(() => el.classList.remove('show'), 2200);
}


function showItemGainToast(type, count) {
  const label = type === 'health' ? '補血符' : '分身符';
  const icon = type === 'health' ? '❤️' : '👥';
  gameState.itemGainToast = {
    type,
    count,
    label,
    icon,
    until: Date.now() + 1800
  };
}

function pauseGameForModal() {
  gameState.paused = true;
  if (typeof gameState.pauseSpawnSystems === 'function') {
    gameState.pauseSpawnSystems();
  }
}

function resumeGameFromModal() {
  gameState.paused = false;
  if (!gameState.gameOver && typeof gameState.resumeSpawnSystems === 'function') {
    gameState.resumeSpawnSystems();
  }
}

function ensureEndConfirmOverlay() {
  if (document.getElementById('end-confirm-overlay')) return document.getElementById('end-confirm-overlay');
  const overlay = document.createElement('div');
  overlay.id = 'end-confirm-overlay';
  overlay.innerHTML = `
    <div class="end-confirm-box">
      <div class="end-confirm-title">確認結束遊戲？</div>
      <div class="end-confirm-text">
        結束後會立即停止目前這場遊戲，並顯示排行榜。
      </div>
      <div class="end-confirm-actions">
        <button id="end-confirm-cancel" class="end-confirm-btn cancel">返回遊戲</button>
        <button id="end-confirm-ok" class="end-confirm-btn ok">確認結束</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#end-confirm-cancel').onclick = () => {
    overlay.classList.remove('show');
    gameState.endConfirmOpen = false;
    resumeGameFromModal();
  };

  overlay.querySelector('#end-confirm-ok').onclick = () => {
    overlay.classList.remove('show');
    gameState.endConfirmOpen = false;
    finalizeEndGame();
  };

  return overlay;
}

export function openEndConfirm() {
  if (gameState.gameOver || gameState.endConfirmOpen) return;
  const overlay = ensureEndConfirmOverlay();
  pauseGameForModal();
  gameState.endConfirmOpen = true;
  overlay.classList.add('show');
}

function finalizeEndGame() {
  gameState.endConfirmOpen = false;
  gameState.paused = true;
  gameState.health = 0;
  gameState.practiceEnd = null;
  gameState._remainingPractice = 0;
  if (typeof gameState.pauseSpawnSystems === 'function') {
    gameState.pauseSpawnSystems();
  }
  if (gameState.practiceTimer) {
    clearTimeout(gameState.practiceTimer);
    gameState.practiceTimer = null;
  }
  const bossTutorial = document.getElementById('boss-tutorial-overlay');
  if (bossTutorial) bossTutorial.classList.remove('show');
  showLeaderboardAfterGameOver();
}

function triggerBossHitFlash() {
  gameState.bossFlashUntil = Date.now() + 180;
  canvas.classList.remove('boss-hit-flash');
  void canvas.offsetWidth;
  canvas.classList.add('boss-hit-flash');
  clearTimeout(triggerBossHitFlash._timer);
  triggerBossHitFlash._timer = setTimeout(() => canvas.classList.remove('boss-hit-flash'), 180);
}

function addBossHitEffect(x, y) {
  if (!Array.isArray(gameState.bossHitEffects)) gameState.bossHitEffects = [];
  gameState.bossHitEffects.push({
    x,
    y,
    radius: 24,
    alpha: 1,
    life: 22,
    maxLife: 22
  });
}

function triggerPlayerHitFlash() {
  gameState.playerFlashUntil = Date.now() + 240;
  canvas.classList.remove('player-hit-flash');
  void canvas.offsetWidth;
  canvas.classList.add('player-hit-flash');
  clearTimeout(triggerPlayerHitFlash._timer);
  triggerPlayerHitFlash._timer = setTimeout(() => canvas.classList.remove('player-hit-flash'), 240);
}

function addPlayerHitEffect(x, y) {
  if (!Array.isArray(gameState.playerHitEffects)) gameState.playerHitEffects = [];
  gameState.playerHitEffects.push({
    x,
    y,
    radius: 16,
    alpha: 1,
    life: 18,
    maxLife: 18
  });
}

function getStageTitle(level) {
  const entry = vocabulary.find(v => v.level === level);
  return entry?.category || `第 ${level} 關`;
}

function buildProgressMessage() {
  const current = {
    bestScore: gameState.score,
    bestLevel: gameState.currentLevel,
    bestCombo: gameState.maxCombo,
    bestVocab: gameState.unlockedWords.length,
  };
  const prev = getPlayerRecords();
  const improved = [];
  if (current.bestScore > prev.bestScore) improved.push(`刷新最高分：${current.bestScore}`);
  if (current.bestLevel > prev.bestLevel) improved.push(`闖到更高關卡：第 ${current.bestLevel} 關`);
  if (current.bestCombo > prev.bestCombo) improved.push(`最佳連擊提升到：${current.bestCombo}`);
  if (current.bestVocab > prev.bestVocab) improved.push(`圖鑑進度增加到：${current.bestVocab}/30`);
  savePlayerRecords({
    bestScore: Math.max(prev.bestScore, current.bestScore),
    bestLevel: Math.max(prev.bestLevel, current.bestLevel),
    bestCombo: Math.max(prev.bestCombo, current.bestCombo),
    bestVocab: Math.max(prev.bestVocab, current.bestVocab),
  });
  if (improved.length) return improved.join('｜');
  return '這次也很棒！再玩一次就更接近新紀錄了！';
}

function getLevelTitle(level) {
  if (level <= 3) return '動物小高手';
  if (level <= 6) return '校園快手';
  if (level <= 10) return '動作忍者';
  if (level <= 15) return '自然探索者';
  if (level <= 20) return '生活達人';
  if (level <= 25) return '進階挑戰者';
  return '終極忍者';
}

function showLeaderboardAfterGameOver() {
  if (gameState.gameOver) return;

  gameState.gameOver = true;
  gameState.paused = true;
  if (typeof gameState.pauseSpawnSystems === 'function') {
    gameState.pauseSpawnSystems();
  }
  gameoverBg.style.display = 'block';
  keyboardEl.style.display = 'none';

  const { bronzeCount, silverCount, goldCount } = countTrophies(gameState.achievementsUnlocked);
  const vocabCount = gameState.unlockedWords.length;
  const trophyCount = gameState.achievementsUnlocked.length;

  const openLeaderboard = () => {
    const overlay = document.getElementById('leaderboard-overlay');
    if (overlay) overlay.style.display = 'flex';
  };

  if (!gameState.player.id) {
    alert('❌ 請先登入才能上傳成績');
    updateLeaderboard('').then(openLeaderboard);
    return;
  }

  submitScore(
    gameState.player.id,
    gameState.currentLevel,
    gameState.score,
    vocabCount,
    trophyCount,
    bronzeCount,
    silverCount,
    goldCount
  )
  .catch(err => {
    console.error('上傳失敗：', err);
    alert(`❌ 上傳失敗：${err.message || '請稍後再試'}`);
  })
  .finally(() => {
    updateLeaderboard(gameState.player.id).then(openLeaderboard);
  });
}

const gameoverBg = document.getElementById('gameover-bg');
const keyboardEl = document.getElementById('virtual-keyboard');  // 或你實際的鍵盤容器 id
// ↓ 在這裡貼上：道具常數與圖示 ↓
const MAX_HEALTH = 100;
const ITEM_SIZE  = 50;
const healthImg  = new Image();
healthImg.src    = 'img/health.png';
const decoyImg   = new Image();
decoyImg.src     = 'img/dodge.png';
const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');

const bgImgs = [];
for (let i = 0; i < 4; i++) {
  const img = new Image();
  // i = 0 對應 background.png，其餘對應 background1~3.png
  img.src = `img/background${i === 0 ? '' : i}.png`;
  bgImgs.push(img);
}
// 頭目戰背景
const bossBg = new Image();
bossBg.src = 'img/background4.png';
// 暫停／遊戲結束背景
const pauseBg = new Image();
pauseBg.src = 'img/background5.png';
const playerImg0    = new Image(); playerImg0.src    = 'img/player0.png';   // 1–10 關
const playerImgMid  = new Image(); playerImgMid.src  = 'img/player.png';     // 11–20 關
const playerImg1    = new Image(); playerImg1.src    = 'img/player1.png';   // 21–30 關
const enemyBossImg  = new Image(); enemyBossImg.src  = 'img/enemy.png';
const targetImg     = new Image(); targetImg.src     = 'img/target.png';
const shurikenImg   = new Image(); shurikenImg.src   = 'img/player-bullet.png';
const kunaiImg      = new Image(); kunaiImg.src      = 'img/enemy-bullet.png';

window.addEventListener('resize', resize);
resize();
function resize() {
  // 1. 同步 canvas 解析度與畫面上的顯示大小
  const rect = canvas.getBoundingClientRect();
  canvas.width  = rect.width;
  canvas.height = rect.height;

  // 2. 重新計算主角 Y 座標：剛好在虛擬鍵盤上緣
  const keyboard = document.getElementById('virtual-keyboard');
  if (keyboard && window.gameState && window.gameState.player) {
    window.gameState.player.y = keyboard.offsetTop - window.gameState.player.height;
  }
}

// ─── 遊戲狀態 ───────────────────────────────────
const gameState = {
  currentLevel:   1,
  player:         { id:'', x:0, y:0, width:0, height:0 },
  health:         100,
  bossHealthAtStart: null,   // 頭目戰開始前的血量
  bossHealthIntact: false,    // 頭目戰期間血量是否未減少
  score:          0,
  hitCount:       0,    // 累積命中目標次數
  paused:         false,
  targets:        [],
  playerProjectiles: [],
  bossActive:     false,
  boss:           null,
  bossProjectiles: [],
  bossProjectileIdCounter: 0,
  threshold:      100,
  bossHp:         5,
  bossWord:       '',
  achievementsUnlocked: JSON.parse(localStorage.getItem('achievementsUnlocked') || '[]'),
  maxCombo: 0, // 最高連擊
  combo: 0,    // 當前連擊
  // ↓ 新增道具計數 ↓
  decoyCount:  0,
  healthCount: 0,
  items:         [],
  bossDefeatedCount: 0, // 打倒boss數
  bossHitEffects: [],
  playerHitEffects: [],
  projectileClashEffects: [],
  itemGainToast: null,
  bossFlashUntil: 0,
  playerFlashUntil: 0,
  overlayReturnTarget: 'pause',
  unlockedWords: JSON.parse(localStorage.getItem('unlockedWords') || '[]'),
  noErrorPractice: false,    // 練習階段 30 秒內是否無失誤
  gameOver: false,            // ← 新增：遊戲是否已結束
    // ✅ 暫停成就用
  pauseUsed: false,
  pauseCount: 0,
  bossTutorialShown: false,
  endConfirmOpen: false,

  // ✅ 連續成就用（練習無失誤 / Boss 不掉血）
  consecutiveBossHealthIntactCount: 0,
  consecutiveNoErrorPracticeCount: 0,

};
window.gameState = gameState;

// ===============================
// 🛠 成就偵錯面板（Ctrl/Cmd + D 開關）
// ===============================
let achDebugVisible = false;
let achDebugTimer = null;

function ensureAchDebugPanel() {
  if (document.getElementById('ach-debug-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'ach-debug-panel';
  panel.style.cssText = `
    position: fixed;
    right: 12px;
    top: 12px;
    width: min(520px, 92vw);
    max-height: 80vh;
    overflow: auto;
    z-index: 99999;
    background: rgba(0,0,0,0.88);
    color: #fff;
    border: 2px solid #ffea00;
    border-radius: 12px;
    padding: 12px;
    font-family: monospace;
    display: none;
  `;

  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
      <div style="font-weight:bold;color:#ffea00;">🛠 成就偵錯面板</div>
      <button id="ach-debug-close"
        style="background:#ffea00;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;">
        關閉
      </button>
    </div>
    <div id="ach-debug-state" style="margin-top:10px;font-size:12px;line-height:1.5;"></div>
    <hr style="border:0;border-top:1px solid #555;margin:10px 0;">
    <div id="ach-debug-list" style="font-size:12px;line-height:1.6;"></div>
  `;

  document.body.appendChild(panel);

  document.getElementById('ach-debug-close').onclick = () => {
    toggleAchDebug(false);
  };
}

function renderAchDebugPanel() {
  const panel = document.getElementById('ach-debug-panel');
  if (!panel) return;

  const stateEl = document.getElementById('ach-debug-state');
  const listEl = document.getElementById('ach-debug-list');
  const gs = window.gameState;

  // ✅ 顯示一些關鍵狀態
  stateEl.textContent =
    `level=${gs.currentLevel} score=${gs.score} hit=${gs.hitCount} maxCombo=${gs.maxCombo}\n` +
    `pauseUsed=${gs.pauseUsed} pauseCount=${gs.pauseCount}\n` +
    `bossActive=${gs.bossActive} bossHealthIntact=${gs.bossHealthIntact}\n` +
    `noErrorPractice=${gs.noErrorPractice}\n` +
    `consecutiveBossHealthIntact=${gs.consecutiveBossHealthIntactCount} consecutiveNoErrorPractice=${gs.consecutiveNoErrorPracticeCount}`;

  // ✅ 每個成就目前 check 結果
  const unlocked = gs.achievementsUnlocked || [];
  listEl.innerHTML = achievements.map(ach => {
    const isUnlocked = unlocked.includes(ach.id);

    let ok = false;
    let err = null;
    try {
      ok = typeof ach.check === 'function' ? !!ach.check(gs) : false;
    } catch (e) {
      err = e?.message || String(e);
    }

    const color = isUnlocked ? '#7CFC00' : (ok ? '#ffd700' : '#aaa');

    return `
      <div style="padding:6px 0;border-bottom:1px dashed #444;">
        <span style="color:${color};font-weight:bold;">
          ${isUnlocked ? '✅' : (ok ? '⚠️' : '⬜')} ${ach.id}
        </span>
        <span style="color:#ffea00;"> ${ach.name}</span>
        <div style="margin-left:18px;color:#ccc;">
          check=${err ? `ERROR: ${err}` : ok}
        </div>
      </div>
    `;
  }).join('');
}

function toggleAchDebug(force = null) {
  ensureAchDebugPanel();
  const panel = document.getElementById('ach-debug-panel');

  achDebugVisible = (force === null) ? !achDebugVisible : !!force;
  panel.style.display = achDebugVisible ? 'block' : 'none';

  if (achDebugTimer) {
    clearInterval(achDebugTimer);
    achDebugTimer = null;
  }

  if (achDebugVisible) {
    renderAchDebugPanel();
    achDebugTimer = setInterval(renderAchDebugPanel, 250);
  }
}

// Ctrl/Cmd + D 開關
window.addEventListener('keydown', (e) => {
  const key = e.key.toUpperCase();
  const isHotkey = (e.ctrlKey || e.metaKey) && key === 'D';
  if (!isHotkey) return;
  e.preventDefault();
  toggleAchDebug();
});

// ① 先保留原本的單一通知函式
function showAchNotification(name, desc, onClose) {
  const overlay = document.getElementById('ach-notify-overlay');
  const textEl  = document.getElementById('ach-notify-text');
  const btn     = document.getElementById('ach-notify-btn');
  textEl.textContent = `🎉 成就解鎖：「${name}」\n${desc}`;
  overlay.style.display = 'flex';
  btn.onclick = () => {
    overlay.style.display = 'none';
    if (typeof onClose === 'function') onClose();
  };
}

// ② 新增排隊顯示：一次處理一個解鎖，點「確定」後顯示下一個
function showAchQueue(list) {
  let idx = 0;
  function next() {
    if (idx >= list.length) return;
    const ach = list[idx++];
    showAchNotification(ach.name, ach.desc, next);
  }
  next();
}

// ③ 改寫 checkAchievements：只收集、最後呼叫 queue
// ✅ 改成可指定只檢查某些成就 id
export function checkAchievements(onlyIds = null) {
  const unlocked = gameState.achievementsUnlocked;
  const newly = [];

  // 若有指定 onlyIds，就只檢查那幾個
  const list = Array.isArray(onlyIds)
    ? achievements.filter(a => onlyIds.includes(a.id))
    : achievements;

  for (const ach of list) {
    if (
      !unlocked.includes(ach.id) &&
      typeof ach.check === 'function' &&
      ach.check(gameState)
    ) {
      unlocked.push(ach.id);
      newly.push(ach);
    }
  }

  if (newly.length > 0) {
    localStorage.setItem('achievementsUnlocked', JSON.stringify(unlocked));
    gameState.achievementsUnlocked = unlocked;
    showAchQueue(newly);
  }
}


// ─── 讀入題庫 & 顯示解釋 ───────────────────────────
function initLevel(level) {
  const entry = vocabulary.find(v => v.level === level);
  if (!entry) return;
  gameState.bossWord = entry.word;
  gameState.bossHp   = entry.word.length;   // ← 新增：血量 = 字母數
  // UI update for word is handled in ui.js via #level-info
}

// ─── 初始化玩家尺寸／位置 ─────────────────────────
// js/main.js
function initEntities() {
  const baseSize = canvas.height / 4;
  gameState.player.baseWidth  = baseSize;
  gameState.player.baseHeight = baseSize;
  gameState.player.scale      = 1;
  gameState.player.width      = baseSize * gameState.player.scale;
  gameState.player.height     = baseSize * gameState.player.scale;
  gameState.player.x          = 50;

  const keyboard = document.getElementById('virtual-keyboard');
  const kbHeight = keyboard ? keyboard.offsetHeight : 0;
  gameState.player.y = canvas.height - kbHeight - gameState.player.height;
}


// ─── 碰撞檢查 ────────────────────────────────────
function collide(a,b) {
  return !(
    a.x + a.width  < b.x ||
    a.x           > b.x + b.width ||
    a.y + a.height< b.y ||
    a.y           > b.y + b.height
  );
}

function findFrontMostBossProjectileByLetter(letter) {
  const targetLetter = String(letter || '').toUpperCase();
  if (!targetLetter || !Array.isArray(gameState.bossProjectiles)) return null;

  let target = null;
  for (const projectile of gameState.bossProjectiles) {
    if (!projectile || String(projectile.letter || '').toUpperCase() !== targetLetter) continue;
    if (!target || projectile.x < target.x) {
      target = projectile;
    }
  }
  return target;
}

function findFrontMostBossProjectile() {
  if (!Array.isArray(gameState.bossProjectiles) || !gameState.bossProjectiles.length) return null;

  let target = null;
  for (const projectile of gameState.bossProjectiles) {
    if (!projectile) continue;
    if (!target || projectile.x < target.x) {
      target = projectile;
    }
  }
  return target;
}

function addProjectileClashEffect(x, y, radius = 14) {
  if (!Array.isArray(gameState.projectileClashEffects)) gameState.projectileClashEffects = [];
  gameState.projectileClashEffects.push({
    x,
    y,
    radius,
    alpha: 1,
    life: 14,
    maxLife: 14
  });
}

window.findFrontMostBossProjectileByLetter = findFrontMostBossProjectileByLetter;
window.findFrontMostBossProjectile = findFrontMostBossProjectile;

// ─── 主繪製迴圈 ───────────────────────────────────
function gameLoop() {
  if (gameState.paused) {
    requestAnimationFrame(gameLoop);
    return;
  }

  if (gameState.health <= 0 && !gameState.gameOver) {
    showLeaderboardAfterGameOver();
    return;
  }
  
  // 背景
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // 取代原本單一背景的部分
let bgToDraw;

// 遊戲結束或暫停
if (gameState.health <= 0 || gameState.paused) {
  bgToDraw = pauseBg;
}
// 頭目戰
else if (gameState.bossActive) {
  bgToDraw = bossBg;
}
// 一般關卡：依 (currentLevel-1) % 4 選圖
else {
  const lvl = gameState.currentLevel || 1;
  const idx = (lvl - 1) % 4;  // 0→background.png, 1→background1.png, etc.
  bgToDraw = bgImgs[idx];
}
ctx.drawImage(bgToDraw, 0, 0, canvas.width, canvas.height);

// ↓ 在這裡貼上：繪製 & 撿取道具 ↓
/*
gameState.items.forEach((it, idx) => {
  const img = it.type === 'health' ? healthImg : decoyImg;
  ctx.drawImage(img, it.x, it.y, it.width, it.height);
  if (collide(it, gameState.player)) {
    if (it.type === 'health') {
      gameState.health = Math.min(
        MAX_HEALTH,
        gameState.health + MAX_HEALTH * 0.3
      );
    } else {
      gameState.decoyCount += 1;
    }
    gameState.items.splice(idx, 1);
  }
});
*/

  // 1. 練習標靶／普通標靶
  gameState.targets.forEach((t,i) => {
    t.x -= t.speed;
    if (t.justHit) {
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.drawImage(targetImg, t.x - 4, t.y - 4, t.width + 8, t.height + 8);
      ctx.restore();
      t.justHit = false;
    }
    ctx.drawImage(targetImg, t.x,t.y,t.width,t.height);

    // 動態字體
    const fontSize = Math.floor(t.width * 0.6);
    ctx.fillStyle    = 'red';
    ctx.font         = `bold ${fontSize}px sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    const metric     = ctx.measureText(t.letter);
    const ascent     = metric.actualBoundingBoxAscent;
    const descent    = metric.actualBoundingBoxDescent;
    const cx         = t.x + t.width/2;
    const cy         = t.y + t.height/2;
    const ty         = cy + (ascent - descent)/2;
    ctx.fillText(t.letter, cx, ty);

    // 如果標靶碰到玩家，扣血並移除標靶
    if (collide(t, gameState.player)) {
      gameState.health -= 20;
      addPlayerHitEffect(gameState.player.x + gameState.player.baseWidth * 0.5, gameState.player.y + gameState.player.baseHeight * 0.5);
      triggerPlayerHitFlash();
      autoUseHealthIfNeeded();
      gameState.targets.splice(i, 1);
      gameState.combo = 0;
      gameState.noErrorPractice = false;  // 練習階段發生失誤
      return;
      
    }

    // 出界或被吃掉留給 input.js 處理補新的
    if (t.x < -t.width) gameState.targets.splice(i,1);
  });

  // 2. 玩家飛鏢
  gameState.playerProjectiles.forEach((p, pi) => {
    p.x += p.speed;
    ctx.drawImage(shurikenImg, p.x, p.y, p.width, p.height);

    // 僅對移動中的飛鏢判定
    if (p.speed > 0) {
      // a) 普通標靶
      gameState.targets.forEach((t, ti) => {
        if (collide(p, t)) {
          gameState.playerProjectiles.splice(pi, 1);
          gameState.targets.splice(ti, 1);
        }
      });
        
      // c) 撞到頭目本體（Boss 前方若還有手裡劍，任何玩家飛鏢都不能直接命中 Boss）
      if (gameState.bossActive && p.weakIndex !== undefined && collide(p, gameState.boss)) {
        const blockingProjectile = findFrontMostBossProjectile();
        if (blockingProjectile) {
          const hitX = (p.x + p.width * 0.5 + blockingProjectile.x + blockingProjectile.width * 0.5) * 0.5;
          const hitY = (p.y + p.height * 0.5 + blockingProjectile.y + blockingProjectile.height * 0.5) * 0.5;
          gameState.playerProjectiles.splice(pi, 1);
          addProjectileClashEffect(hitX, hitY, 16);
        } else {
          const hitX = p.x + p.width * 0.5;
          const hitY = p.y + p.height * 0.5;
          gameState.playerProjectiles.splice(pi, 1);
          gameState.boss.hp--;
          gameState.boss.hitSlots[p.weakIndex] = true;
          addBossHitEffect(hitX, hitY);
          if (gameState.onBossHealthChange) gameState.onBossHealthChange();
          triggerBossHitFlash();
          if (gameState.boss.hp <= 0) {
            gameState.bossActive = false;
            showLevelOverlay();
          }
        }
      }
    }

    // 飛鏢超出畫面就移除
    if (p.x > canvas.width) {
      gameState.playerProjectiles.splice(pi, 1);
    }
  });

  // 2-1. 玩家手裡劍與 Boss 手裡劍互撞
  // 規則：只有可互撞的 Boss 戰飛鏢才會判定，而且必須「相同字母」才能消除。
  // 另外會優先鎖定畫面最前面（最靠近玩家、x 最小）的那一顆同字母手裡劍，避免後面的同字母被先吃掉。
  if (gameState.bossActive && gameState.playerProjectiles.length && gameState.bossProjectiles.length) {
    for (let pi = gameState.playerProjectiles.length - 1; pi >= 0; pi--) {
      const p = gameState.playerProjectiles[pi];
      if (!p || !p.canClash || !p.letter) continue;

      let targetIndex = -1;
      if (p.targetBossProjectileId !== undefined && p.targetBossProjectileId !== null) {
        targetIndex = gameState.bossProjectiles.findIndex((b) => b && b.id === p.targetBossProjectileId);
      }

      if (targetIndex === -1) {
        const frontMost = findFrontMostBossProjectileByLetter(p.letter);
        if (!frontMost) continue;
        p.targetBossProjectileId = frontMost.id;
        targetIndex = gameState.bossProjectiles.findIndex((b) => b && b.id === frontMost.id);
      }

      if (targetIndex === -1) continue;

      const b = gameState.bossProjectiles[targetIndex];
      if (!b || !b.letter) continue;

      if (String(p.letter).toUpperCase() !== String(b.letter).toUpperCase()) continue;

      if (collide(p, b)) {
        const hitX = (p.x + p.width * 0.5 + b.x + b.width * 0.5) * 0.5;
        const hitY = (p.y + p.height * 0.5 + b.y + b.height * 0.5) * 0.5;

        gameState.playerProjectiles.splice(pi, 1);
        gameState.bossProjectiles.splice(targetIndex, 1);
        addProjectileClashEffect(hitX, hitY, 14);
      }
    }
  }

  // 3. 頭目 & 手裡劍
  if (gameState.bossActive) {
    const B = gameState.boss;
    // ── Boss 弱點血條 (分段，與玩家血條同寬同高) ──
    const weakLetters = gameState.bossWord.split('');
    const totalSeg    = weakLetters.length;
    // 從 CSS #health-bar 讀出寬高
    const healthBarEl = document.getElementById('health-bar');
    const bbWidth     = healthBarEl.offsetWidth;
    const bbHeight    = healthBarEl.offsetHeight;
    const gap    = 4;  // 格子間距
    // 每格寬度
    const segW   = (bbWidth - (totalSeg - 1) * gap) / totalSeg;
    // 中心對齊於 boss 之上
    const barX   = B.x + (B.width  - bbWidth)  / 2;
    const barY   = B.y - bbHeight - 8;
    ctx.lineWidth    = 2;
    ctx.font         = `${bbHeight * 0.6}px sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < totalSeg; i++) {
      const x = barX + i * (segW + gap);
      // 根據 hitSlots 決定顏色：hitSlots[i] === true → gray, else red
      const isHit = Array.isArray(gameState.boss.hitSlots) && gameState.boss.hitSlots[i];
      ctx.fillStyle = isHit ? '#444' : 'red';
      ctx.fillRect(x, barY, segW, bbHeight);
      ctx.strokeStyle = 'white';
      ctx.strokeRect(x, barY, segW, bbHeight);
      // 格子中間的字母
      ctx.fillStyle = 'white';
      ctx.fillText(weakLetters[i], x + segW/2, barY + bbHeight/2);
    };

    // 頭目本體
    const bossFlashing = gameState.bossFlashUntil && gameState.bossFlashUntil > Date.now();
    const bossDrawX = bossFlashing ? B.x + Math.sin(Date.now() * 0.08) * 8 : B.x;
    const bossDrawY = bossFlashing ? B.y + Math.cos(Date.now() * 0.09) * 4 : B.y;
    if (bossFlashing) {
      ctx.save();
      ctx.shadowColor = 'rgba(255, 240, 120, 0.95)';
      ctx.shadowBlur = 36;
      ctx.globalAlpha = 0.92;
      ctx.drawImage(enemyBossImg, bossDrawX - 4, bossDrawY - 4, B.width + 8, B.height + 8);
      ctx.restore();
    }
    ctx.drawImage(enemyBossImg, bossDrawX, bossDrawY, B.width, B.height);
    if (bossFlashing) {
      ctx.save();
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = '#fff7a8';
      ctx.fillRect(bossDrawX, bossDrawY, B.width, B.height);
      ctx.restore();
    }

    // 手裡劍
    gameState.bossProjectiles.forEach((b,i)=>{
      b.x -= b.speed;
      ctx.drawImage(kunaiImg, b.x, b.y, b.width, b.height);

      const fontSize = Math.floor(Math.min(48, b.height * 0.5));
      const textX = b.x + b.width + 16;
      const textY = b.y + b.height / 2;
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(textX - 12, textY - 28, 56, 56, 12);
      } else {
        ctx.rect(textX - 12, textY - 28, 56, 56);
      }
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font      = `900 ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.letter, textX + 16, textY + 1);
      ctx.restore();

      if (collide(b, gameState.player)) {
        if (gameState.decoyCount > 0) {
          gameState.decoyCount -= 1;
        } else {
          gameState.health -= 20;
          gameState.bossHealthIntact = false;
          addPlayerHitEffect(gameState.player.x + gameState.player.baseWidth * 0.5, gameState.player.y + gameState.player.baseHeight * 0.5);
          triggerPlayerHitFlash();
          autoUseHealthIfNeeded();
        }
        gameState.bossProjectiles.splice(i, 1);
      }

    });
  }

  // 3-0. 投射物互撞特效
  if (Array.isArray(gameState.projectileClashEffects) && gameState.projectileClashEffects.length) {
    gameState.projectileClashEffects = gameState.projectileClashEffects.filter((fx) => fx.life > 0 && fx.alpha > 0.02);
    gameState.projectileClashEffects.forEach((fx) => {
      const progress = 1 - fx.life / fx.maxLife;
      const radius = fx.radius + progress * 24;

      ctx.save();
      ctx.globalAlpha = fx.alpha;
      const grad = ctx.createRadialGradient(fx.x, fx.y, 2, fx.x, fx.y, radius);
      grad.addColorStop(0, 'rgba(255,255,255,0.95)');
      grad.addColorStop(0.35, 'rgba(255,220,120,0.85)');
      grad.addColorStop(1, 'rgba(255,120,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      fx.life -= 1;
      fx.alpha *= 0.88;
    });
  }

  // 3-1. Boss 受擊特效
  if (Array.isArray(gameState.bossHitEffects) && gameState.bossHitEffects.length) {
    gameState.bossHitEffects = gameState.bossHitEffects.filter((fx) => fx.life > 0 && fx.alpha > 0.02);
    gameState.bossHitEffects.forEach((fx) => {
      const progress = 1 - fx.life / fx.maxLife;
      const radius = fx.radius + progress * 56;

      ctx.save();
      ctx.globalAlpha = fx.alpha;
      const grad = ctx.createRadialGradient(fx.x, fx.y, 2, fx.x, fx.y, radius);
      grad.addColorStop(0, 'rgba(255,255,255,0.95)');
      grad.addColorStop(0.35, 'rgba(255,234,0,0.85)');
      grad.addColorStop(1, 'rgba(255,140,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#fff6a8';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, radius * 0.72, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i + progress * 0.5;
        const sparkX = fx.x + Math.cos(angle) * (radius * 0.6);
        const sparkY = fx.y + Math.sin(angle) * (radius * 0.6);
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      fx.life -= 1;
      fx.alpha *= 0.9;
    });
  }

  if (Array.isArray(gameState.playerHitEffects) && gameState.playerHitEffects.length) {
    gameState.playerHitEffects = gameState.playerHitEffects.filter((fx) => fx.life > 0 && fx.alpha > 0.02);
    gameState.playerHitEffects.forEach((fx) => {
      const progress = 1 - fx.life / fx.maxLife;
      const radius = fx.radius + progress * 42;

      ctx.save();
      ctx.globalAlpha = fx.alpha;
      const grad = ctx.createRadialGradient(fx.x, fx.y, 2, fx.x, fx.y, radius);
      grad.addColorStop(0, 'rgba(255,255,255,0.92)');
      grad.addColorStop(0.28, 'rgba(255,120,120,0.82)');
      grad.addColorStop(1, 'rgba(255,40,40,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 180, 180, 0.95)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, radius * 0.68, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      fx.life -= 1;
      fx.alpha *= 0.89;
    });
  }

  // 3-2. 連擊獲得道具提示
  if (gameState.itemGainToast && gameState.itemGainToast.until > Date.now()) {
    const toast = gameState.itemGainToast;
    ctx.save();
    ctx.globalAlpha = Math.max(0.35, (toast.until - Date.now()) / 1800);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
    const boxW = Math.min(420, canvas.width * 0.76);
    const boxH = 110;
    const boxX = (canvas.width - boxW) / 2;
    const boxY = canvas.height * 0.14;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 20);
      ctx.fill();
    } else {
      ctx.fillRect(boxX, boxY, boxW, boxH);
    }
    ctx.strokeStyle = '#ffea00';
    ctx.lineWidth = 4;
    ctx.strokeRect(boxX + 2, boxY + 2, boxW - 4, boxH - 4);
    ctx.fillStyle = '#ffea00';
    ctx.font = '900 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('道具獲得！', canvas.width / 2, boxY + 26);
    ctx.font = '900 40px sans-serif';
    ctx.fillText(toast.icon || '🎁', canvas.width / 2 - 108, boxY + 70);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 30px sans-serif';
    ctx.fillText(`${toast.label}`, canvas.width / 2 + 10, boxY + 62);
    ctx.font = '900 18px sans-serif';
    const subText = toast.type === 'decoy' ? `分身護盾：${Math.min(toast.count, 2)}/2` : (toast.type === 'health-auto' ? '血量歸零，直接補滿血量' : `剩餘補血藥：${toast.count}/2`);
    ctx.fillText(subText, canvas.width / 2 + 10, boxY + 90);
    ctx.restore();
  } else if (gameState.itemGainToast && gameState.itemGainToast.until <= Date.now()) {
    gameState.itemGainToast = null;
  gameState.bossFlashUntil = 0;
  }


  // 4. 分身護盾（半透明殘像，最多 2 個）
  const activeClones = Math.min(gameState.decoyCount || 0, 2);
  if (activeClones > 0) {
    const P = gameState.player;
    let cloneImg;
    const cloneLvl = gameState.currentLevel;
    if (cloneLvl <= 10) cloneImg = playerImg0;
    else if (cloneLvl <= 20) cloneImg = playerImgMid;
    else cloneImg = playerImg1;

    const offsets = [{ x: -26, y: -10 }, { x: 22, y: 10 }];
    for (let i = 0; i < activeClones; i++) {
      const off = offsets[i];
      ctx.save();
      ctx.globalAlpha = 0.35 - i * 0.08;
      ctx.drawImage(cloneImg, P.x + off.x, P.y + off.y, P.baseWidth, P.baseHeight);
      ctx.strokeStyle = 'rgba(160, 255, 255, 0.75)';
      ctx.lineWidth = 3;
      ctx.strokeRect(P.x + off.x + 12, P.y + off.y + 12, P.baseWidth - 24, P.baseHeight - 24);
      ctx.restore();
    }
  }

  // 4. 玩家繪製（固定大小）
  const P   = gameState.player;
  let imgToDraw;
  const lvl = gameState.currentLevel;
  if (lvl <= 10)      imgToDraw = playerImg0;
  else if (lvl <= 20) imgToDraw = playerImgMid;
  else                imgToDraw = playerImg1;
  const playerFlashing = gameState.playerFlashUntil && gameState.playerFlashUntil > Date.now();
  if (playerFlashing) {
    ctx.save();
    ctx.shadowColor = 'rgba(255, 120, 120, 0.95)';
    ctx.shadowBlur = 28;
    ctx.globalAlpha = 0.88;
    ctx.drawImage(imgToDraw, P.x - 2, P.y - 2, P.baseWidth + 4, P.baseHeight + 4);
    ctx.restore();
  }
  ctx.drawImage(imgToDraw, P.x, P.y, P.baseWidth, P.baseHeight);
  if (playerFlashing) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#ff8a8a';
    ctx.fillRect(P.x, P.y, P.baseWidth, P.baseHeight);
    ctx.restore();
  }

  requestAnimationFrame(gameLoop);
}


// ─── 啟動遊戲 ───────────────────────────────────
export function startGame() {
  // ★ 讓畫布可聚焦並立刻 focus
  const canvas = document.getElementById('game-canvas');
  canvas.tabIndex = 0;
  canvas.focus();
  // 關鍵！註冊輸入處理（只註冊一次，避免重新開始後重複綁定）
  if (!gameState._inputInitialized) {
    setupInput(window.gameState);
    gameState._inputInitialized = true;
  }
  initEntities();
  gameState.currentLevel = 1;
  initLevel(1);
  gameState.showBossTutorialOnce = showBossTutorialOnce;
  gameState.showItemGainToast = showItemGainToast;
  spawnLoop(gameState);
  renderUI(gameState);
  requestAnimationFrame(gameLoop);
  // 圖鑑樣式的成就網格
  document.getElementById('ach-btn').onclick = () => {
    const unlocked = gameState.achievementsUnlocked || [];
    const gridEl = document.getElementById('ach-grid');
    gridEl.innerHTML = achievements.map(ach => {
      const isUnlocked = unlocked.includes(ach.id);
      return `
        <div class="ach-item${isUnlocked ? '' : ' locked'}">
          <img src="./img/${ach.trophy}-trophy.png" alt="${ach.trophy} 獎盃">
          <div class="ach-name">${ach.name}</div>
        </div>
      `;
    }).join('');
    document.getElementById('ach-overlay').style.display = 'flex';
    // 掛上每個成就格的點擊，彈出詳情
    document.querySelectorAll('#ach-grid .ach-item').forEach((item, idx) => {
      item.onclick = () => {
        const ach = achievements[idx];
        document.getElementById('ach-detail-title').textContent = ach.name;
        document.getElementById('ach-detail-desc').textContent  = ach.desc;
        document.getElementById('ach-detail-modal').style.display = 'flex';
      };
    });
  };
}

// 關閉成就列表按鈕：隱藏成就列表並顯示暫停選單
document.getElementById('ach-close').onclick = () => {
  document.getElementById('ach-overlay').style.display = 'none';
  if (gameState.overlayReturnTarget === 'level') {
    document.getElementById('level-overlay').style.display = 'flex';
  } else {
    document.getElementById('pause-overlay').style.display = 'flex';
  }
};
 // 關閉成就詳情
 document.getElementById('ach-detail-close').onclick = () => {
   document.getElementById('ach-detail-modal').style.display = 'none';
 };

function resetGameState({ keepPlayerId = true } = {}) {
  const currentPlayerId = gameState.player.id;

  gameState.currentLevel = 1;
  gameState.health = 100;
  gameState.bossHealthAtStart = null;
  gameState.bossHealthIntact = false;
  gameState.score = 0;
  gameState.hitCount = 0;
  gameState.paused = false;
  gameState.targets = [];
  gameState.playerProjectiles = [];
  gameState.bossActive = false;
  gameState.boss = null;
  gameState.bossProjectiles = [];
  gameState.bossProjectileIdCounter = 0;
  gameState.threshold = 100;
  gameState.bossHp = 5;
  gameState.bossWord = '';
  gameState.maxCombo = 0;
  gameState.combo = 0;
  gameState.decoyCount = 0;
  gameState.healthCount = 0;
  gameState.items = [];
  gameState.bossDefeatedCount = 0;
  gameState.bossHitEffects = [];
  gameState.playerHitEffects = [];
  gameState.projectileClashEffects = [];
  gameState.itemGainToast = null;
  gameState.bossFlashUntil = 0;
  gameState.playerFlashUntil = 0;
  gameState.overlayReturnTarget = 'pause';
  gameState.unlockedWords = [];
  gameState.achievementsUnlocked = [];
  gameState.noErrorPractice = true;
  gameState.gameOver = false;
  gameState.pauseUsed = false;
  gameState.pauseCount = 0;
  gameState.bossTutorialShown = false;
  gameState.endConfirmOpen = false;
  gameState.consecutiveBossHealthIntactCount = 0;
  gameState.consecutiveNoErrorPracticeCount = 0;
  const oldPracticeTimer = gameState.practiceTimer;
  gameState.practiceTimer = null;
  gameState.practiceEnd = null;
  gameState._remainingPractice = 0;
  gameState.player.id = keepPlayerId ? currentPlayerId : '';

  localStorage.setItem('unlockedWords', JSON.stringify([]));
  localStorage.setItem('achievementsUnlocked', JSON.stringify([]));

  if (typeof gameState.destroySpawnLoop === 'function') {
    gameState.destroySpawnLoop();
  } else if (oldPracticeTimer) {
    clearTimeout(oldPracticeTimer);
  }
  gameState._bossInterval = null;
  gameState._levelWatchInterval = null;
  gameState._spawnLoopActive = false;

  ['level-overlay','pause-overlay','vocab-overlay','ach-overlay','leaderboard-overlay','end-confirm-overlay']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = 'none';
        el.classList.remove('show');
      }
    });
}

function restartGameSamePlayer() {
  resetGameState({ keepPlayerId: true });
  gameoverBg.style.display = 'none';
  keyboardEl.style.display = 'flex';

  const gameContainer = document.getElementById('game-container');
  const loginOverlay = document.getElementById('login-overlay');
  if (loginOverlay) loginOverlay.style.display = 'none';
  if (gameContainer) gameContainer.style.display = 'block';

  startGame();
}

function returnToLoginScreen() {
  resetGameState({ keepPlayerId: false });
  gameoverBg.style.display = 'none';
  keyboardEl.style.display = 'none';

  const gameContainer = document.getElementById('game-container');
  const loginOverlay = document.getElementById('login-overlay');
  const playerIdInput = document.getElementById('player-id');
  const errorEl = document.getElementById('login-error');

  if (gameContainer) gameContainer.style.display = 'none';
  if (loginOverlay) loginOverlay.style.display = 'flex';
  if (playerIdInput) {
    playerIdInput.value = '';
    setTimeout(() => playerIdInput.focus(), 0);
  }
  if (errorEl) errorEl.textContent = '';
  localStorage.removeItem('currentPlayerId');
  window.__leaderboardPlayerId = '';
}

// 排行榜按鈕
const leaderboardRestartBtn = document.getElementById('leaderboard-restart');
if (leaderboardRestartBtn) {
  leaderboardRestartBtn.onclick = () => {
    document.getElementById('leaderboard-overlay').style.display = 'none';
    restartGameSamePlayer();
  };
}

document.getElementById('leaderboard-close').onclick = () => {
  document.getElementById('leaderboard-overlay').style.display = 'none';
  returnToLoginScreen();
};

function autoUseHealthIfNeeded() {
  if (gameState.health <= 0 && gameState.healthCount > 0) {
    gameState.healthCount -= 1;
    gameState.health = MAX_HEALTH;
    gameState.itemGainToast = {
      type: 'health-auto',
      count: gameState.healthCount,
      label: '補血藥自動發動',
      icon: '❤️',
      until: Date.now() + 1800
    };
    return true;
  }
  return false;
}


export function showLevelOverlay() {
  if (gameState.bossHealthIntact) {
    gameState.consecutiveBossHealthIntactCount += 1;
  } else {
    gameState.consecutiveBossHealthIntactCount = 0;
  }

  if (gameState.noErrorPractice) {
    gameState.consecutiveNoErrorPracticeCount += 1;
  } else {
    gameState.consecutiveNoErrorPracticeCount = 0;
  }

  checkAchievements();

  const ov   = document.getElementById('level-overlay');
  const txt  = document.getElementById('level-text');
  const btn  = document.getElementById('level-btn');

  const entry = vocabulary.find(v => v.level === gameState.currentLevel);
  let unlockText = '';
  if (entry && !gameState.unlockedWords.includes(entry.word)) {
    gameState.unlockedWords.push(entry.word);
    localStorage.setItem('unlockedWords', JSON.stringify(gameState.unlockedWords));
    showUnlockToast(entry);
    unlockText = `新解鎖：${entry.word}（${entry.definition}）`;
  }

  const progressParts = [];
  const prev = getPlayerRecords();
  if (gameState.score > prev.bestScore) progressParts.push('新高分');
  if (gameState.currentLevel > prev.bestLevel) progressParts.push('新關卡');
  if (gameState.maxCombo > prev.bestCombo) progressParts.push('連擊提升');
  
  const lines = [
    `🎉 恭喜通過第 ${gameState.currentLevel} 關！`,
    `稱號：${getLevelTitle(gameState.currentLevel)}`,
    `最佳連擊：${gameState.maxCombo}`,
  ];
  if (unlockText) lines.push(unlockText);
  lines.push(progressParts.length ? `進步：${progressParts.join('、')}` : '表現很棒，繼續挑戰！');
  buildProgressMessage();
  txt.innerHTML = lines.map((line, idx) => {
    if (idx === 0) return `<div class="level-line level-main">${line}</div>`;
    if (idx === 1) return `<div class="level-line level-badge">${line}</div>`;
    return `<div class="level-line level-sub">${line}</div>`;
  }).join('');
  gameState.overlayReturnTarget = 'level';
  ov.style.display = 'flex';

  btn.onclick = () => {
    ov.style.display       = 'none';
    const nextLevel        = gameState.currentLevel + 1;
    gameState.currentLevel = nextLevel;
    initLevel(nextLevel);
    gameState.spawnPractice();
    gameState.bossDefeatedCount++;
  };
}
document.getElementById('vocab-btn').onclick = function() {
  const unlocked = gameState.unlockedWords || [];
  const latestUnlocked = unlocked[unlocked.length - 1];

  const html = `
    <div class="vocab-legend">共 30 個單字｜已解鎖 ${unlocked.length} 個｜點選已解鎖單字可看詳細資訊</div>
    <div class="vocab-all-grid">
      ${vocabulary.map(v => {
        const got = unlocked.includes(v.word);
        const latestClass = got && latestUnlocked === v.word ? ' highlight-unlock' : '';
        return `
          <div class="vocab-cell compact${latestClass}" data-level="${v.level}" style="opacity:${got ? '1' : '0.52'};filter:${got ? 'none' : 'grayscale(1)'};">
            <div class="vocab-chip">L${v.level}</div>
            <div class="vocab-mini-category">${v.category || `第${v.level}關`}</div>
            ${got
              ? `<img src="${v.image}" alt="${v.word}" class="vocab-img"><div class="vocab-word">${v.word}</div>`
              : `<div class="vocab-blank">?</div><div class="vocab-word">???</div>`
            }
            <div class="vocab-meaning">${got ? v.definition : '尚未解鎖'}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  document.getElementById('vocab-ul').innerHTML = html;
  document.getElementById('vocab-overlay').style.display = 'flex';

  if (!document.getElementById('vocab-detail-modal')) {
    const modal = document.createElement('div');
    modal.id = 'vocab-detail-modal';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="vocab-detail-box">
        <div class="vocab-detail-content"></div>
        <button class="vocab-detail-close">關閉</button>
      </div>
    `;
    document.body.appendChild(modal);
    document.querySelector('.vocab-detail-close').onclick = () => {
      modal.style.display = 'none';
    };
  }

  document.querySelectorAll('.vocab-cell').forEach((cell) => {
    cell.onclick = function() {
      const level = Number(cell.dataset.level);
      const v = vocabulary.find(item => item.level === level);
      if (!v || !unlocked.includes(v.word)) return;

      document.querySelector('.vocab-detail-content').innerHTML = `
        <div style="font-size:1.3em;color:#ffea00;font-weight:bold;margin-bottom:6px;">
          第${v.level}關｜${v.category || ''}
        </div>
        <img src="${v.image}" alt="${v.word}" style="display:block;margin:0 auto 10px auto;width:88px;height:88px;background:#fff;border-radius:16px;">
        <div style="font-size:2em;font-weight:bold;text-align:center;letter-spacing:2px;margin-bottom:6px;">
          ${v.word} <span style="font-size:0.7em;color:#ffa500;">${v.partOfSpeech}</span>
        </div>
        <div style="text-align:center;font-size:1.2em;color:#fff;margin-bottom:6px;">${v.definition}</div>
        <div style="background:#333;padding:12px;border-radius:10px;text-align:center;">
          <span style="color:#83c7ff;">${v.example}</span><br>
          <span style="color:#ffe082;font-size:1em;">${v.exampleZh}</span>
        </div>
      `;
      document.getElementById('vocab-detail-modal').style.display = 'flex';
    };
  });
};
