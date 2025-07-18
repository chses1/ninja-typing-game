// js/ui.js


import { vocabulary } from './vocabulary.js';

// 新增：顯示 combo 動畫
export function animateCombo(count) {
  const el = document.getElementById('combo-display');
  if (!el) return;
  el.textContent = `連擊 x${count}`;
  // 移除再加上 class 以重新觸發動畫
  el.classList.remove('combo-animation');
  // 觸發 reflow
  void el.offsetWidth;
  el.classList.add('combo-animation');
}

export function renderUI(gameState) {
  const hpFill      = document.getElementById('health-fill');
  const timerEl     = document.getElementById('practice-timer');
  const scoreCenter = document.getElementById('score-center');
  const levelInfo   = document.getElementById('level-info');
  const instrEl     = document.getElementById('instructions');

  // 取得補血與分身符圖示容器
  const healthWrap = document.getElementById('icon-health-wrap');
  const decoyWrap  = document.getElementById('icon-decoy-wrap');

function update() {
  // ✅ 錨定：補血藥圖示必須是血條的子元素
  const healthBar  = document.getElementById('health-bar');
  if (healthWrap && healthBar && !healthBar.contains(healthWrap)) {
    healthBar.appendChild(healthWrap);
  }
  // ✅ 確保分身符圖示被加到倒數計時元素內，否則定位會亂
  if (decoyWrap && !timerEl.contains(decoyWrap)) {
    timerEl.appendChild(decoyWrap);
  }

  const hpFill      = document.getElementById('health-fill');
  const scoreCenter = document.getElementById('score-center');
  const levelInfo   = document.getElementById('level-info');

  // 血條寬度
  hpFill.style.width = Math.max(0, gameState.health) + '%';

  // 分數顯示
  scoreCenter.textContent = `分數：${gameState.score}`;

  // 單字顯示
  const lvl = gameState.currentLevel || 1;
  const entry = vocabulary.find(v => v.level === lvl);
  if (entry) {
    levelInfo.textContent = `第 ${lvl} 關：${entry.word}（${entry.definition}）`;
  }

  // 練習倒數秒數（含暫停邏輯）
  if (gameState.practiceEnd) {
    if (!gameState.paused) {
      const sec = Math.max(0, Math.ceil((gameState.practiceEnd - Date.now()) / 1000));
      update.prevSec = sec;
    }
    timerEl.textContent = `練習剩餘時間：${update.prevSec}s`;
  } else {
    timerEl.textContent = '';
    update.prevSec = null;
  }

  // ✅ 顯示道具數量與圖示
  const hasHealth  = gameState.healthCount > 0;
  const hasDecoy   = gameState.decoyCount > 0;

  if (healthWrap) healthWrap.style.display = hasHealth ? 'flex' : 'none';
  if (decoyWrap)  decoyWrap.style.display  = hasDecoy  ? 'flex' : 'none';

  const hc = document.getElementById('health-count');
  const dc = document.getElementById('decoy-count');
  if (hc) hc.textContent = gameState.healthCount;
  if (dc) dc.textContent = gameState.decoyCount;

  requestAnimationFrame(update);
}

  update();


}
