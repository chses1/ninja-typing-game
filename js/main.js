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
  unlockedWords: JSON.parse(localStorage.getItem('unlockedWords') || '[]'),
  noErrorPractice: false,    // 練習階段 30 秒內是否無失誤
  gameOver: false,            // ← 新增：遊戲是否已結束
    // ✅ 暫停成就用
  pauseUsed: false,
  pauseCount: 0,

  // ✅ 連續成就用（練習無失誤 / Boss 不掉血）
  consecutiveBossHealthIntactCount: 0,
  consecutiveNoErrorPracticeCount: 0,

};
window.gameState = gameState;

function getLevelTheme(level) {
  if (level <= 3) return '動物忍者訓練';
  if (level <= 6) return '校園裝備訓練';
  if (level <= 8) return '居家道具訓練';
  if (level <= 10) return '動作忍術訓練';
  if (level <= 20) return '地球防衛戰';
  return '終極忍者挑戰';
}

function getLevelClearTitle(gs) {
  const combo = gs.maxCombo || 0;
  const hp = gs.health || 0;
  if (gs.noErrorPractice && gs.bossHealthIntact) return '完美忍者！';
  if (combo >= 12) return '神速忍者！';
  if (combo >= 8) return '連擊高手！';
  if (hp >= 80) return '穩定高手！';
  return '勇敢學徒！';
}

function ensureBossTutorialOverlay() {
  if (document.getElementById('boss-tutorial-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'boss-tutorial-overlay';
  overlay.className = 'tutorial-overlay';
  overlay.style.display = 'none';
  overlay.innerHTML = `
    <div class="tutorial-box">
      <div class="tutorial-title">Boss 攻略！</div>
      <div class="tutorial-step"><span class="tutorial-step-num">1</span><span>先打掉飛來的字母</span></div>
      <div class="tutorial-step"><span class="tutorial-step-num">2</span><span>再照順序打 Boss 單字</span></div>
      <div class="tutorial-step"><span class="tutorial-step-num">3</span><span>打完就能過關</span></div>
      <button id="boss-tutorial-btn" class="tutorial-btn">我知道了，開始挑戰！</button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('boss-tutorial-btn').onclick = () => {
    overlay.style.display = 'none';
    localStorage.setItem('bossTutorialSeen', '1');
    if (typeof window.__startBossNow === 'function') window.__startBossNow();
  };
}

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

// ─── 主繪製迴圈 ───────────────────────────────────
function gameLoop() {
  if (gameState.paused) {
    requestAnimationFrame(gameLoop);
    return;
  }
  if (gameState.health <= 0 && !gameState.gameOver) {
    // 標記已進入遊戲結束，避免重複觸發
    gameState.gameOver = true;

    // 一、先顯示全螢幕背景
    gameoverBg.style.display = 'block';
    // 二、隱藏鍵盤（和其他暫時不需要的 UI）
    keyboardEl.style.display = 'none';

    // 這裡把成就解鎖清單傳進 countTrophies，算出銅／銀／金的數量
    const { bronzeCount, silverCount, goldCount } = countTrophies(gameState.achievementsUnlocked);
    // 圖鑑數就是 unlockedWords.length
    const vocabCount = gameState.unlockedWords.length;
    // 總成就數也可傳 trophyCount（供後端做取最大值判斷）
    const trophyCount = gameState.achievementsUnlocked.length;

    // 新增登入檢查與成績上傳流程
    if (!gameState.player.id) {
      alert('❌ 請先登入才能上傳成績');
      updateLeaderboard('').then(() => {
        document.getElementById('leaderboard-overlay').style.display = 'flex';
      });
    } else {
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
      .then(() => {
        updateLeaderboard(gameState.player.id).then(() => {
          document.getElementById('leaderboard-overlay').style.display = 'flex';
        });
      })
      .catch(err => {
        console.error('上傳失敗：', err);
        alert(`❌ 上傳失敗：${err.message || '請稍後再試'}`);
        updateLeaderboard(gameState.player.id).then(() => {
          document.getElementById('leaderboard-overlay').style.display = 'flex';
        });
      });
    }
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
        
      // c) 撞到頭目本體（只有攻擊飛鏢才會傷害 boss）
      if (gameState.bossActive && p.weakIndex !== undefined && collide(p, gameState.boss)) {
        gameState.playerProjectiles.splice(pi, 1);
        gameState.boss.hp--;
        gameState.boss.hitSlots[p.weakIndex] = true;
        if (gameState.onBossHealthChange) gameState.onBossHealthChange();
        if (gameState.boss.hp <= 0) {
          gameState.bossActive = false;
          showLevelOverlay();
        }
      }
    }

    // 飛鏢超出畫面就移除
    if (p.x > canvas.width) {
      gameState.playerProjectiles.splice(pi, 1);
    }
  });

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
    ctx.drawImage(enemyBossImg, B.x, B.y, B.width, B.height);

    // 手裡劍
    gameState.bossProjectiles.forEach((b,i)=>{
      b.x -= b.speed;
      ctx.drawImage(kunaiImg, b.x, b.y, b.width, b.height);
      // 手裡劍字母
      const fz = Math.floor(b.height * 0.8);
      ctx.fillStyle = 'white';
      ctx.font      = `bold ${fz}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.letter, b.x + b.width + 10, b.y + b.height/2);
      // 撞玩家
      if (collide(b, gameState.player)) {
        if (gameState.decoyCount > 0) {
          gameState.decoyCount -= 1;           // 有分身符，消耗即可
      // （可在此播放閃避動畫／音效）
        } else {
          gameState.health -= 20;              // 無分身符，正常扣血
          gameState.bossHealthIntact = false;  
        }
          gameState.bossProjectiles.splice(i, 1);
      }

    });
  }

  // 4. 玩家繪製（固定大小）
  const P   = gameState.player;
  let imgToDraw;
  const lvl = gameState.currentLevel;
  if (lvl <= 10)      imgToDraw = playerImg0;
  else if (lvl <= 20) imgToDraw = playerImgMid;
  else                imgToDraw = playerImg1;
  ctx.drawImage(imgToDraw, P.x, P.y, P.baseWidth, P.baseHeight);

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
  ensureBossTutorialOverlay();
  gameState.currentLevel = 1;
  initLevel(1);
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
  // 隱藏成就列表 overlay
  document.getElementById('ach-overlay').style.display = 'none';
  // 顯示暫停選單 overlay（保持遊戲暫停）
  document.getElementById('pause-overlay').style.display = 'flex';
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
  gameState.threshold = 100;
  gameState.bossHp = 5;
  gameState.bossWord = '';
  gameState.maxCombo = 0;
  gameState.combo = 0;
  gameState.decoyCount = 0;
  gameState.healthCount = 0;
  gameState.items = [];
  gameState.bossDefeatedCount = 0;
  gameState.unlockedWords = [];
  gameState.achievementsUnlocked = [];
  gameState.noErrorPractice = true;
  gameState.gameOver = false;
  gameState.pauseUsed = false;
  gameState.pauseCount = 0;
  gameState.consecutiveBossHealthIntactCount = 0;
  gameState.consecutiveNoErrorPracticeCount = 0;
  const oldPracticeTimer = gameState.practiceTimer;
  gameState.practiceTimer = null;
  gameState.practiceEnd = null;
  gameState._remainingPractice = 0;
  gameState.player.id = keepPlayerId ? currentPlayerId : '';

  localStorage.setItem('unlockedWords', JSON.stringify([]));
  localStorage.setItem('achievementsUnlocked', JSON.stringify([]));

  if (oldPracticeTimer) {
    clearTimeout(oldPracticeTimer);
  }

  ['level-overlay','pause-overlay','vocab-overlay','ach-overlay','leaderboard-overlay']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
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

// ↓ 在這裡貼上：點擊／觸控使用補血藥 ↓
function tryUseHealth(x, y) {
  const p = gameState.player;
  if (
    x >= p.x && x <= p.x + p.width &&
    y >= p.y && y <= p.y + p.height &&
    gameState.healthCount > 0
  ) {
    gameState.healthCount -= 1;
    gameState.health = Math.min(
      MAX_HEALTH,
      gameState.health + MAX_HEALTH * 0.3
    );
    // （可在此播放補血特效）
  }
}
canvas.addEventListener('mousedown',  e => {
  const r = canvas.getBoundingClientRect();
  tryUseHealth(e.clientX - r.left, e.clientY - r.top);
});
canvas.addEventListener('touchstart', e => {
  const r = canvas.getBoundingClientRect();
  const t = e.touches[0];
  tryUseHealth(t.clientX - r.left, t.clientY - r.top);
});

export function showLevelOverlay() {
  // ✅ 先更新「連續」計數，再檢查成就（不然 ach17/18/27/28 永遠不會過）
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

  // ✅ 再解鎖成就
  checkAchievements();

  const ov   = document.getElementById('level-overlay');
  const txt  = document.getElementById('level-text');
  const btn  = document.getElementById('level-btn');
  const badgeEl = document.getElementById('level-clear-badge');
  const statsEl = document.getElementById('level-clear-stats');

  const entry = vocabulary.find(v => v.level === gameState.currentLevel);
  if (entry && !gameState.unlockedWords.includes(entry.word)) {
    gameState.unlockedWords.push(entry.word);
    localStorage.setItem('unlockedWords', JSON.stringify(gameState.unlockedWords));
  }

  const clearTitle = getLevelClearTitle(gameState);
  const theme = getLevelTheme(gameState.currentLevel);
  if (badgeEl) badgeEl.textContent = clearTitle;
  if (statsEl && entry) {
    statsEl.innerHTML = `
      <div>本關主題：${theme}</div>
      <div>本關單字：${entry.word}（${entry.definition}）</div>
      <div>最佳連擊：${gameState.maxCombo}</div>
    `;
  }

  ov.style.display = 'flex';
  txt.textContent  = `🎉 恭喜通過第 ${gameState.currentLevel} 關！`;

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

  // 切割為三組
  const col1 = vocabulary.slice(0, 10);
  const col2 = vocabulary.slice(10, 20);
  const col3 = vocabulary.slice(20, 30);

  function renderCol(col) {
    return `
      <div class="vocab-col">
        ${col.map(v => {
          const got = unlocked.includes(v.word);
          return `
            <div class="vocab-cell" style="opacity:${got ? '1' : '0.5'};filter:${got ? 'none' : 'grayscale(1)'};">
              ${got
                ? `<img src="${v.image}" alt="${v.word}" class="vocab-img"><div class="vocab-word">${v.word}</div>`
                : `<div class="vocab-blank">?</div><div class="vocab-word">???</div>`
              }
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // 組合整個 HTML
  const html = `
    <div class="vocab-row">${renderCol(col1)}</div>
    <div class="vocab-row">${renderCol(col2)}</div>
    <div class="vocab-row">${renderCol(col3)}</div>
    <div style="margin-top:12px;padding:12px;background:#222;border-radius:10px;">
      <b>小提示：</b>點選已解鎖的單字可顯示詳細資訊！
    </div>
  `;

  document.getElementById('vocab-ul').innerHTML = html;
  document.getElementById('vocab-overlay').style.display = 'flex';

// 1. 加入彈窗元素（僅加一次）
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

// 2. 修改 click event 彈出自訂視窗
document.querySelectorAll('.vocab-cell').forEach((cell, idx) => {
  cell.onclick = function() {
    const v = vocabulary[idx];
    if (!unlocked.includes(v.word)) return;

        document.querySelector('.vocab-detail-content').innerHTML = `
      <div style="font-size:1.3em;color:#ffea00;font-weight:bold;margin-bottom:6px;">
        第${v.level}關
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
;

