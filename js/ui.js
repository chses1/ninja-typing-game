// js/ui.js

import { vocabulary } from './vocabulary.js';

export function animateCombo(count) {
  const el = document.getElementById('combo-display');
  if (!el) return;
  el.textContent = `連擊 x${count}`;
  el.classList.remove('combo-animation');
  void el.offsetWidth;
  el.classList.add('combo-animation');
}

function getShortInstructions(gameState) {
  if (gameState.bossActive) {
    return 'Boss 來了！先打飛來的字母，再照順序打單字！';
  }
  return '打掉紅色標靶！打對就得分，連擊越高越厲害！';
}

export function renderUI(gameState) {
  const timerEl     = document.getElementById('practice-timer');
  const instrEl     = document.getElementById('instructions');
  const healthWrap  = document.getElementById('icon-health-wrap');
  const decoyWrap   = document.getElementById('icon-decoy-wrap');

  function update() {
    const healthBar  = document.getElementById('health-bar');
    if (healthWrap && healthBar && !healthBar.contains(healthWrap)) {
      healthBar.appendChild(healthWrap);
    }
    if (decoyWrap && timerEl && !timerEl.contains(decoyWrap)) {
      timerEl.appendChild(decoyWrap);
    }

    const hpFill      = document.getElementById('health-fill');
    const scoreCenter = document.getElementById('score-center');
    const levelInfo   = document.getElementById('level-info');

    hpFill.style.width = Math.max(0, gameState.health) + '%';
    scoreCenter.textContent = `分數：${gameState.score}`;

    const lvl = gameState.currentLevel || 1;
    const entry = vocabulary.find(v => v.level === lvl);
    if (entry) {
      levelInfo.textContent = `第 ${lvl} 關：${entry.word}（${entry.definition}）`;
    }

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

    if (instrEl) instrEl.textContent = getShortInstructions(gameState);

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
