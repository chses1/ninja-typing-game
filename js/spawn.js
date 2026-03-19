// js/spawn.js
function getPracticeDuration(level) {
  if (level <= 3) return 15000;
  if (level <= 6) return 18000;
  if (level <= 10) return 20000;
  if (level <= 20) return 22000;
  return 25000;
}

export function spawnLoop(gameState) {
  const canvas     = document.getElementById('game-canvas');
  const keyboard   = document.getElementById('virtual-keyboard');
  const kbHeight   = keyboard ? keyboard.offsetHeight : 0;
  const baseSize   = canvas.height / 4;
  const ITEM_SIZE = 50;  
  let bossInterval = null;

  // 初始化練習計時器引用
  if (gameState.practiceTimer === undefined) {
    gameState.practiceTimer = null;
    gameState.practiceEnd   = null;
  }
  // ↓ 在這裡貼上：啟動道具生程式碼 ↓
  /*
  if (gameState.itemTimer === undefined) {
    gameState.itemTimer = setInterval(spawnItem, 20000);
  }
  */
  // ────────────────
  // 生成「一組 5 個靜止標靶」的方法（在玩家前方且縮小尺寸），
  // 同時清除先前的玩家飛鏢，防止殘留碰撞
  // ────────────────
  function spawnPracticeGroup() {
    gameState.targets = [];
    gameState.playerProjectiles = [];

    const letters      = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const count        = 5;
    const marginLeft   = gameState.player.x + gameState.player.width + 20; // 玩家前方 20px
    const marginRight  = 20;
    const availableW   = canvas.width - marginLeft - marginRight;
    // 縮小標靶尺寸，最多 baseSize * 0.8
    const maxTargetSz  = baseSize * 0.8;
    const targetSize   = Math.min(maxTargetSz, availableW / count * 0.8);
    // 水平間距
    const spacing      = availableW / (count + 1);
    // Y 對齊玩家中心
    const py           = gameState.player.y + (gameState.player.height / 2) - (targetSize / 2);

    for (let i = 0; i < count; i++) {
      const letter = letters[Math.floor(Math.random() * letters.length)];
      const x      = marginLeft + spacing * (i + 1) - targetSize / 2;
      gameState.targets.push({
        x,
        y:      py,
        width:  targetSize,
        height: targetSize,
        speed:  0,
        letter,
        hit:    false
      });
    }
  }

  // ────────────────
  // 進入頭目戰：初始化 boss 並開始投擲手裡劍
  // ────────────────
  function spawnKunai() {
    const avail = gameState.boss.word.split('');
    const letter = avail[Math.floor(Math.random() * avail.length)];
    gameState.bossProjectiles.push({
      x:      gameState.boss.x - 150,
      y:      gameState.boss.y + Math.random() * (gameState.boss.height - 150),
      width:  150,
      height: 150,
      speed:  gameState.currentLevel <= 2 ? 2.2 : gameState.currentLevel <= 5 ? 2.6 : 3,
      letter
    });
  }

  function reallyStartBoss() {
    gameState.bossActive = true;
    gameState.bossHealthAtStart = gameState.health;
    gameState.bossHealthIntact = true;
    clearTimeout(gameState.practiceTimer);
    clearInterval(bossInterval);
    gameState.targets = [];

    const pw = gameState.player.width;
    const ph = gameState.player.height;
    gameState.boss = {
      x:         canvas.width - pw,
      y:         gameState.player.y,
      width:     pw,
      height:    ph,
      hp:        gameState.bossWord.length,
      maxHp:     gameState.bossWord.length,
      word:      gameState.bossWord,
      hitSlots:  Array(gameState.bossWord.length).fill(false)
    };
    gameState.bossInputProgress = 0;
    spawnKunai();
    bossInterval = setInterval(() => {
      if (gameState.bossActive) spawnKunai();
    }, 3000);
    console.log('▶ startBoss reset, bossInputProgress=', gameState.bossInputProgress);
  }

  function startBoss() {
    const tutorialSeen = localStorage.getItem('bossTutorialSeen') === '1';
    if (!tutorialSeen && (gameState.currentLevel || 1) === 1) {
      const overlay = document.getElementById('boss-tutorial-overlay');
      window.__startBossNow = reallyStartBoss;
      if (overlay) {
        overlay.style.display = 'flex';
        return;
      }
    }
    reallyStartBoss();
  }

  gameState.startBoss = startBoss;

  // ────────────────
  // 練習階段：第一次呼叫啟動 30 秒倒數，之後只重生標靶組
  // ────────────────
  gameState.spawnPractice = () => {
    if (!gameState.practiceTimer) {
      const practiceDuration = getPracticeDuration(gameState.currentLevel || 1);
      gameState.practiceTimer = setTimeout(startBoss, practiceDuration);
      gameState.practiceEnd   = Date.now() + practiceDuration;
      // 只在第一次啟動練習時重置失誤旗標
      gameState.noErrorPractice = true;
    }
    spawnPracticeGroup();
  };

  // 啟動第一次練習
  gameState.spawnPractice();

  // ────────────────
  // 監聽關卡變化：當關卡改變時，重置並啟動新一輪練習
  // ────────────────
  let lastLevel = gameState.currentLevel;
  setInterval(() => {
    if (!gameState.bossActive && gameState.currentLevel !== lastLevel) {
      lastLevel = gameState.currentLevel;
      clearTimeout(gameState.practiceTimer);
      gameState.practiceTimer = null;
      gameState.spawnPractice();
    }
  }, 500);
  // ↓ 在這裡貼上：spawnItem 函式 ↓
  /*
function spawnItem() {
  const types = ['health', 'decoy'];
  const type  = types[Math.floor(Math.random() * types.length)];
  const size  = ITEM_SIZE;
  const x     = Math.random() * (canvas.width - size);
  const y     = Math.random() *
                ((canvas.height - kbHeight - size) * 0.5);
  gameState.items.push({ x, y, width: size, height: size, type });
}
*/
}
