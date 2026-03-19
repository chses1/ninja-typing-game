// js/spawn.js
export function spawnLoop(gameState) {
  const canvas     = document.getElementById('game-canvas');
  const keyboard   = document.getElementById('virtual-keyboard');
  const kbHeight   = keyboard ? keyboard.offsetHeight : 0;
  const baseSize   = canvas.height / 4;
  let bossInterval = null;

  if (gameState.practiceTimer === undefined) {
    gameState.practiceTimer = null;
    gameState.practiceEnd   = null;
  }

  function getPracticeDuration(level) {
    if (level <= 3) return 15000;
    if (level <= 6) return 18000;
    if (level <= 10) return 20000;
    if (level <= 20) return 22000;
    return 25000;
  }

  function getBossKunaiSpeed(level) {
    if (level <= 3) return 2.2;
    if (level <= 6) return 2.6;
    if (level <= 10) return 3.0;
    if (level <= 20) return 3.4;
    return 3.8;
  }

  function getBossKunaiInterval(level) {
    if (level <= 3) return 3600;
    if (level <= 6) return 3300;
    if (level <= 10) return 3000;
    if (level <= 20) return 2700;
    return 2400;
  }

  function spawnPracticeGroup() {
    gameState.targets = [];
    gameState.playerProjectiles = [];

    const letters      = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const count        = 5;
    const marginLeft   = gameState.player.x + gameState.player.width + 20;
    const marginRight  = 20;
    const availableW   = canvas.width - marginLeft - marginRight;
    const maxTargetSz  = baseSize * 0.8;
    const targetSize   = Math.min(maxTargetSz, availableW / count * 0.8);
    const spacing      = availableW / (count + 1);
    const py           = gameState.player.y + (gameState.player.height / 2) - (targetSize / 2);

    for (let i = 0; i < count; i++) {
      const letter = letters[Math.floor(Math.random() * letters.length)];
      const x      = marginLeft + spacing * (i + 1) - targetSize / 2;
      gameState.targets.push({ x, y: py, width: targetSize, height: targetSize, speed: 0, letter, hit: false });
    }
  }

  function spawnKunai() {
    const avail = gameState.boss.word.split('');
    const letter = avail[Math.floor(Math.random() * avail.length)];
    const size = 150;
    const minY = gameState.boss.y + 8;
    const maxY = gameState.boss.y + Math.max(8, gameState.boss.height - size - 8);
    const minGap = size * 0.72;

    let chosenY = minY;
    let bestDistance = -1;
    for (let attempt = 0; attempt < 12; attempt++) {
      const candidateY = minY + Math.random() * Math.max(1, maxY - minY);
      const nearestDistance = gameState.bossProjectiles.reduce((min, projectile) => {
        return Math.min(min, Math.abs(candidateY - projectile.y));
      }, Infinity);

      if (nearestDistance >= minGap) {
        chosenY = candidateY;
        bestDistance = nearestDistance;
        break;
      }

      if (nearestDistance > bestDistance) {
        bestDistance = nearestDistance;
        chosenY = candidateY;
      }
    }

    gameState.bossProjectiles.push({
      x:      gameState.boss.x - size,
      y:      chosenY,
      width:  size,
      height: size,
      speed:  getBossKunaiSpeed(gameState.currentLevel || 1),
      letter
    });
  }

  function startBoss() {
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

    if (typeof gameState.showBossTutorialOnce === 'function') {
      gameState.showBossTutorialOnce();
    }

    spawnKunai();
    bossInterval = setInterval(() => {
      if (gameState.bossActive) spawnKunai();
    }, getBossKunaiInterval(gameState.currentLevel || 1));
  }
  gameState.startBoss = startBoss;

  gameState.spawnPractice = () => {
    if (!gameState.practiceTimer) {
      const duration = getPracticeDuration(gameState.currentLevel || 1);
      gameState.practiceTimer = setTimeout(startBoss, duration);
      gameState.practiceEnd   = Date.now() + duration;
      gameState.noErrorPractice = true;
    }
    spawnPracticeGroup();
  };

  gameState.spawnPractice();

  let lastLevel = gameState.currentLevel;
  setInterval(() => {
    if (!gameState.bossActive && gameState.currentLevel !== lastLevel) {
      lastLevel = gameState.currentLevel;
      clearTimeout(gameState.practiceTimer);
      gameState.practiceTimer = null;
      gameState.spawnPractice();
    }
  }, 500);
}
