// js/spawn.js
export function spawnLoop(gameState) {
  const canvas   = document.getElementById('game-canvas');
  const keyboard = document.getElementById('virtual-keyboard');
  const baseSize = canvas.height / 4;
  const MAX_BOSS_KUNAI = 3;

  if (typeof gameState.destroySpawnLoop === 'function') {
    gameState.destroySpawnLoop();
  }

  if (gameState.practiceTimer === undefined) {
    gameState.practiceTimer = null;
    gameState.practiceEnd   = null;
  }

  gameState._remainingPractice = Number(gameState._remainingPractice || 0);
  gameState._bossInterval = null;
  gameState._levelWatchInterval = null;
  gameState._spawnLoopActive = true;

  function clearPracticeTimer() {
    if (gameState.practiceTimer) {
      clearTimeout(gameState.practiceTimer);
      gameState.practiceTimer = null;
    }
  }

  function clearBossInterval() {
    if (gameState._bossInterval) {
      clearInterval(gameState._bossInterval);
      gameState._bossInterval = null;
    }
  }

  function clearLevelWatchInterval() {
    if (gameState._levelWatchInterval) {
      clearInterval(gameState._levelWatchInterval);
      gameState._levelWatchInterval = null;
    }
  }

  function getPracticeDuration(level) {
    if (level <= 3) return 15000;
    if (level <= 6) return 18000;
    if (level <= 10) return 20000;
    if (level <= 20) return 22000;
    return 25000;
  }

  function getBossKunaiSpeed(level) {
    const lv = Math.max(1, Math.min(30, Number(level) || 1));
    return 2.1 + (lv - 1) * 0.14;
  }

  function getBossKunaiInterval(level) {
    const lv = Math.max(1, Math.min(30, Number(level) || 1));
    return Math.max(950, 3600 - (lv - 1) * 85);
  }

  function schedulePracticeTimer(durationOverride = null) {
    clearPracticeTimer();
    const duration = durationOverride ?? getPracticeDuration(gameState.currentLevel || 1);
    gameState.practiceTimer = setTimeout(startBoss, duration);
    gameState.practiceEnd = Date.now() + duration;
    return duration;
  }

  function spawnPracticeGroup() {
    gameState.targets = [];
    gameState.playerProjectiles = [];

    const count = 5;
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const marginLeft = gameState.player.x + gameState.player.width + 20;
    const marginRight = 20;
    const availableW = canvas.width - marginLeft - marginRight;
    const maxTargetSz = baseSize * 0.8;
    const targetSize = Math.min(maxTargetSz, availableW / count * 0.8);
    const spacing = availableW / (count + 1);
    const py = gameState.player.y + (gameState.player.height / 2) - (targetSize / 2);

    for (let i = 0; i < count; i++) {
      const letter = letters[Math.floor(Math.random() * letters.length)];
      const x = marginLeft + spacing * (i + 1) - targetSize / 2;
      gameState.targets.push({ x, y: py, width: targetSize, height: targetSize, speed: 0, letter, hit: false });
    }
  }

  function spawnKunai() {
    if (!gameState.bossActive || !gameState.boss || gameState.paused) return;
    if (gameState.bossProjectiles.length >= MAX_BOSS_KUNAI) return;

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
      x: gameState.boss.x - size,
      y: chosenY,
      width: size,
      height: size,
      speed: getBossKunaiSpeed(gameState.currentLevel || 1),
      letter
    });
  }

  function startBossInterval() {
    clearBossInterval();
    if (!gameState.bossActive || gameState.paused || !gameState._spawnLoopActive) return;

    const interval = getBossKunaiInterval(gameState.currentLevel || 1);
    gameState._bossInterval = setInterval(() => {
      if (!gameState._spawnLoopActive || !gameState.bossActive || gameState.paused) return;
      spawnKunai();
    }, interval);
  }

  function startBoss() {
    if (!gameState._spawnLoopActive) return;

    gameState.bossActive = true;
    gameState.bossHealthAtStart = gameState.health;
    gameState.bossHealthIntact = true;
    clearPracticeTimer();
    clearBossInterval();
    gameState.practiceEnd = null;
    gameState.targets = [];
    gameState.bossProjectiles = [];

    const pw = gameState.player.width;
    const ph = gameState.player.height;
    gameState.boss = {
      x: canvas.width - pw,
      y: gameState.player.y,
      width: pw,
      height: ph,
      hp: gameState.bossWord.length,
      maxHp: gameState.bossWord.length,
      word: gameState.bossWord,
      hitSlots: Array(gameState.bossWord.length).fill(false)
    };
    gameState.bossInputProgress = 0;

    if (typeof gameState.showBossTutorialOnce === 'function') {
      gameState.showBossTutorialOnce();
    }

    spawnKunai();
    startBossInterval();
  }

  gameState.startBoss = startBoss;

  gameState.pauseSpawnSystems = () => {
    if (!gameState._spawnLoopActive) return;

    if (!gameState.bossActive && gameState.practiceTimer) {
      gameState._remainingPractice = Math.max(0, (gameState.practiceEnd || Date.now()) - Date.now());
      clearPracticeTimer();
      gameState.practiceEnd = null;
    }

    clearBossInterval();
  };

  gameState.resumeSpawnSystems = () => {
    if (!gameState._spawnLoopActive || gameState.gameOver) return;

    if (gameState.bossActive) {
      startBossInterval();
      return;
    }

    if (!gameState.practiceTimer) {
      const remaining = gameState._remainingPractice > 0
        ? gameState._remainingPractice
        : getPracticeDuration(gameState.currentLevel || 1);
      schedulePracticeTimer(remaining);
      gameState._remainingPractice = 0;
    }
  };

  gameState.destroySpawnLoop = () => {
    gameState._spawnLoopActive = false;
    clearPracticeTimer();
    clearBossInterval();
    clearLevelWatchInterval();
    gameState.practiceEnd = null;
    gameState._remainingPractice = 0;
  };

  gameState.spawnPractice = () => {
    if (!gameState._spawnLoopActive) return;

    if (!gameState.practiceTimer) {
      schedulePracticeTimer();
      gameState.noErrorPractice = true;
    }
    spawnPracticeGroup();
  };

  gameState.spawnPractice();

  let lastLevel = gameState.currentLevel;
  gameState._levelWatchInterval = setInterval(() => {
    if (!gameState._spawnLoopActive) return;
    if (!gameState.bossActive && gameState.currentLevel !== lastLevel) {
      lastLevel = gameState.currentLevel;
      clearPracticeTimer();
      gameState.practiceTimer = null;
      gameState.practiceEnd = null;
      gameState._remainingPractice = 0;
      gameState.spawnPractice();
    }
  }, 500);
}
