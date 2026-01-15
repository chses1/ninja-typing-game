// js/input.js

import { showLevelOverlay } from './main.js';
import { animateCombo } from './ui.js';

// 延遲在 DOMContentLoaded 再抓取 Overlay 元素
let pauseOverlay, vocabOverlay, achOverlay;
window.addEventListener('DOMContentLoaded', () => {
  pauseOverlay = document.getElementById('pause-overlay');
  vocabOverlay = document.getElementById('vocab-overlay');
  achOverlay   = document.getElementById('ach-overlay');

 // 暫停選單：呼叫成就紀錄
 document.getElementById('pause-ach-btn').onclick = () => {
   // 1. 關掉暫停選單
   pauseOverlay.style.display = 'none';
   // 2. 觸發「ach-btn」的 click 事件，顯示成就 Overlay
   document.getElementById('ach-btn').click();
 };  
  // 暫停選單：呼叫過關按鈕邏輯
  document.getElementById('pause-vocab-btn').onclick = () => {
    pauseOverlay.style.display = 'none';
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

export function setupInput(gameState) {
  let isUpper = true;

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
          T.hit = true;
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
  
  // Optional：若要讓「按錯字母」也有回饋，可以在這裡加個 else 來重置 combo、或做其他處理
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
