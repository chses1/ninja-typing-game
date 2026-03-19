// js/input.js

import { showLevelOverlay, checkAchievements } from './main.js';
import { animateCombo } from './ui.js';

// 延遲在 DOMContentLoaded 再抓取 Overlay 元素
let pauseOverlay, vocabOverlay, achOverlay;
window.addEventListener('DOMContentLoaded', () => {
  pauseOverlay = document.getElementById('pause-overlay');
  vocabOverlay = document.getElementById('vocab-overlay');
  achOverlay   = document.getElementById('ach-overlay');

 // 暫停選單：呼叫成就紀錄
 document.getElementById('pause-ach-btn').onclick = () => {
  pauseOverlay.style.display = 'none';
  stopPauseTips(); // ✅
  document.getElementById('ach-btn').click();
};

document.getElementById('pause-vocab-btn').onclick = () => {
  pauseOverlay.style.display = 'none';
  stopPauseTips(); // ✅
  document.getElementById('vocab-btn').click();
};


  document.getElementById('pause-resume-btn').onclick = () => hidePauseMenu();

  // 圖鑑/成就關閉後回暫停選單
  document.getElementById('vocab-overlay-close-btn').onclick = () => {
    vocabOverlay.style.display = 'none';
    pauseOverlay.style.display = 'flex';
  };
  document.getElementById('ach-close').onclick = () => {
  achOverlay.style.display = 'none';
  // 若你要從暫停選單回來：
  if (pauseOverlay) pauseOverlay.style.display = 'flex';
};
});

// ✅ 暫停提示輪播（全域）
let pauseTipTimer = null;
let pauseTipIndex = 0;

const PAUSE_TIPS = [
  '💥 爆擊：連擊（Combo）越高，輸入越穩，分數累積越快！請盡量不要按錯字母。',
  '🎯 練習階段：打中標靶 +10 分。維持連擊可以更快累積高分與道具。',
  '🧿 分身符：Boss 手裡劍打到你時，如果你有分身符會優先消耗 1 張並免扣血。',
  '🧪 補血道具：有補血數量時，點一下角色即可補血（每次回 30%）。',
  '🧠 Boss 攻略：先「攔截」第一枚手裡劍（打出同字母）→ 再依序輸入 Boss 單字攻擊弱點。',
  '📌 計分重點：穩定不失誤 > 亂按。保持連擊才能拿到更多道具與更高分。',
  '🔥 進階技巧：先練「看字母→立即按」的反射；Boss 戰時專心看第一枚手裡劍字母最重要。'
];

function startPauseTips() {
  const tipEl = document.getElementById('pause-tip');
  if (!tipEl) return;

  // 避免重複啟動
  if (pauseTipTimer) clearInterval(pauseTipTimer);

  // 每次暫停都從不同提示開始（更像「輪流出現」）
  pauseTipIndex = Math.floor(Math.random() * PAUSE_TIPS.length);

  const renderTip = () => {
    tipEl.classList.remove('fade');
    tipEl.textContent = PAUSE_TIPS[pauseTipIndex];
    // 重新觸發動畫
    void tipEl.offsetWidth;
    tipEl.classList.add('fade');

    pauseTipIndex = (pauseTipIndex + 1) % PAUSE_TIPS.length;
  };

  renderTip();
  pauseTipTimer = setInterval(renderTip, 4500); // 4.5 秒換一次
}

function stopPauseTips() {
  if (pauseTipTimer) {
    clearInterval(pauseTipTimer);
    pauseTipTimer = null;
  }
}


export function setupInput(gameState) {
  let isUpper = true;

  function flashKey(letter, ok) {
    const btn = document.querySelector(`.vk-key[data-key="${letter.toUpperCase()}"]`);
    if (!btn) return;
    btn.classList.remove('key-correct', 'key-wrong');
    void btn.offsetWidth;
    btn.classList.add(ok ? 'key-correct' : 'key-wrong');
    setTimeout(() => btn.classList.remove('key-correct', 'key-wrong'), 220);
  }

  function showMidMessage(text, type = 'good') {
    let el = document.getElementById('mid-message');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mid-message';
      document.body.appendChild(el);
    }
    el.className = `mid-message show ${type}`;
    el.textContent = text;
    clearTimeout(showMidMessage._timer);
    showMidMessage._timer = setTimeout(() => {
      el.classList.remove('show');
    }, 900);
  }

  // 處理所有鍵入
  function handleKey(raw) {
    const L = raw.toUpperCase();
    if (!/^[A-Z]$/.test(L)) return;
        // 一、練習階段：擊中任一尚未 hit 的標靶
    if (!gameState.bossActive) {
      const T = gameState.targets.find(t => !t.hit);
      if (T) {
        if (T.letter === L) {
          // 正確輸入
          flashKey(L, true);
          T.hit = true;
          T.justHit = true;
          showMidMessage('好球！', 'good');
          gameState.hitCount++; // 更新命中次數
          // Combo 增加
          gameState.combo++;
          if (gameState.combo > gameState.maxCombo) gameState.maxCombo = gameState.combo;
          // ↓ 在 combo++ 後貼上：累積道具邏輯 ↓
          if (gameState.combo % 20 === 0 && gameState.decoyCount < 5) {
          gameState.decoyCount += 1;
          }
          if (gameState.combo % 30 === 0 && gameState.healthCount < 5) {
          gameState.healthCount += 1;
          }
          // 顯示 Combo 動畫
          animateCombo(gameState.combo);
          // 發射飛鏢 + 加分
          gameState.playerProjectiles.push({
            x: gameState.player.x + gameState.player.width,
            y: T.y + T.height/2 - 75,
            width:150, height:150, speed:20
          });
          gameState.score += 10;
          if (gameState.onScoreChange) gameState.onScoreChange();
          // 全部命中且時間沒到，下一組
          const allHit = gameState.targets.every(t => t.hit);
          if (allHit && Date.now() < gameState.practiceEnd) {
            gameState.spawnPractice();
          }
        } else {
          // 錯誤輸入，中斷連擊
          flashKey(L, false);
          showMidMessage('再試一次！', 'warn');
          gameState.combo = 0;
          gameState.noErrorPractice = false; // 標記練習階段失誤
        }
      }
      return;
    }

// 二 + 三、頭目戰：依序處理 deflect 再處理弱點攻擊
if (gameState.bossActive) {
  // 2-1. Deflect 第一枚手裡劍（隨時都可攔截）
  const firstKunai = gameState.bossProjectiles[0];
  if (firstKunai && !firstKunai.hit) {
    console.log('[Deflect] 按下', L, '手裡劍字母是', firstKunai.letter);
    if (L === firstKunai.letter) {
      flashKey(L, true);
      showMidMessage('擋得漂亮！', 'good');
      firstKunai.hit = true;
      console.log('[Deflect] 已移除手裡劍並推送反彈飛鏢');
      // 立即移除已 deflect 的手裡劍
      gameState.bossProjectiles.splice(0, 1);
      gameState.playerProjectiles.push({
        x: gameState.player.x + gameState.player.width,
        y: firstKunai.y + firstKunai.height/2 - 75,
        width: 150, height: 150, speed: 20,
        isDeflect: true
      });
      return;  // 只在成功 deflect 時才中斷
    }
  }
  
  // 2-2. 若不是 deflect，才去做弱點攻擊
  const word     = gameState.boss.word;
  const progress = gameState.bossInputProgress || 0;
  if (progress < word.length && L === word[progress]) {
    flashKey(L, true);
    showMidMessage('命中弱點！', 'good');
    gameState.playerProjectiles.push({
      x: gameState.player.x + gameState.player.width,
      y: (gameState.boss.hitSlotPositions && gameState.boss.hitSlotPositions[progress] !== undefined)
           ? gameState.boss.y + gameState.boss.hitSlotPositions[progress] - 75
           : gameState.boss.y + gameState.boss.height/2 - 75,
      width: 150, height: 150, speed: 20,
      weakIndex: progress,
      isAttack: true
    });
    gameState.bossInputProgress = progress + 1;
    return;  // 成功攻擊弱點時中斷
  }
  
  flashKey(L, false);
  showMidMessage('看準再按！', 'warn');
  return;
}
  }

  // 虛擬鍵盤
  const vk = document.getElementById('virtual-keyboard');
  if (!vk) return;
  vk.addEventListener('click', e => {
    const btn = e.target.closest('.vk-key');
    if (!btn) return;
    const key = btn.dataset.key;
    if (key === 'Shift') {
      isUpper = !isUpper;
      vk.querySelectorAll('.vk-key').forEach(b => {
        const k = b.dataset.key;
        if (/^[A-Z]$/.test(k)) b.textContent = isUpper ? k : k.toLowerCase();
      });
      return;
    }
    if (key === 'Pause') { showPauseMenu(); return; }
    if (key === 'End') {
    // 一、先關掉暫停選單
    hidePauseMenu();
    // 二、標記血量歸零→下一幀 gameLoop 會上傳分數並顯示排行榜
    gameState.health = 0;
    return;
    }
    handleKey(isUpper ? key : key.toLowerCase());
  });

  // 實體鍵盤
  window.addEventListener('keydown', e => {
      // ✅ 如果登入畫面還在，就「完全不要處理遊戲鍵盤」
  const loginOverlay = document.getElementById('login-overlay');
const loginVisible = loginOverlay && window.getComputedStyle(loginOverlay).display !== 'none';
if (loginVisible) {
  return; // ✅ 登入畫面：完全不處理，讓 input 正常輸入
}

// ✅ 另外保險：如果目前正在輸入框，就不要攔截（避免未來你加更多表單時出事）
const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
if (tag === 'input' || tag === 'textarea' || (e.target && e.target.isContentEditable)) {
  return;
}

    // Debug 快捷鍵：Ctrl+G 跳關
    if (e.ctrlKey && e.key.toUpperCase() === 'G') {
      const lvl = parseInt(prompt('跳到第幾關？請輸入數字'), 10);
      if (!isNaN(lvl) && lvl >= 1 && typeof window.initLevel === 'function') {
        gameState.currentLevel = lvl;
        window.initLevel(lvl);
        window.renderUI(gameState);
        gameState.targets = [];
        gameState.playerProjectiles = [];
        if (typeof window.spawnLoop === 'function') {
          window.spawnLoop(gameState);
        }
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    if (/^[a-zA-Z]$/.test(e.key)) {
      handleKey(e.key);
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  });
}

// 暫停選單控制
function showPauseMenu() {
  if (!pauseOverlay) pauseOverlay = document.getElementById('pause-overlay');
  if (!pauseOverlay) return;

  pauseOverlay.style.display = 'flex';
    // ✅ 暫停成就：第一次暫停 + 暫停次數累計
  if (window.gameState) {
    window.gameState.pauseUsed = true;
    window.gameState.pauseCount = (window.gameState.pauseCount || 0) + 1;

    // ✅ 立刻檢查成就（不用等過關）
    checkAchievements(['ach09', 'ach19']);
  }

startPauseTips(); // ✅ 新增：開始輪播提示

  if (window.gameState && window.gameState.practiceTimer) {
    window.gameState.paused = true;
    window.gameState._remainingPractice = window.gameState.practiceEnd - Date.now();
    clearTimeout(window.gameState.practiceTimer);
  }
}

function hidePauseMenu() {
  if (!pauseOverlay) pauseOverlay = document.getElementById('pause-overlay');
  if (!pauseOverlay) return;

  pauseOverlay.style.display = 'none';
stopPauseTips(); // ✅ 新增：停止輪播提示

  if (window.gameState && window.gameState._remainingPractice > 0) {
    window.gameState.paused = false;
    window.gameState.practiceTimer = setTimeout(
      window.gameState.startBoss,
      window.gameState._remainingPractice
    );
    window.gameState.practiceEnd = Date.now() + window.gameState._remainingPractice;
    window.gameState._remainingPractice = 0;
  }
}
