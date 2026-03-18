// js/leaderboard.js
const API_BASE = location.hostname.includes('github.io')
  ? 'https://ninja-typing-game.onrender.com'
  : '';

function getClassPrefix(playerId) {
  return String(playerId || '').trim().slice(0, 3);
}

function getRememberedPlayerId() {
  return String(
    window.__leaderboardPlayerId ||
    window.gameState?.player?.id ||
    localStorage.getItem('currentPlayerId') ||
    ''
  ).trim();
}

function normalizePlayerId(value) {
  return String(value ?? '').trim();
}

function getCellStyle(extra = '') {
  return `padding:8px;border-bottom:1px solid #555;${extra}`;
}

function applyCurrentPlayerHighlight(currentPlayerId) {
  const normalizedCurrent = normalizePlayerId(currentPlayerId);
  const rows = document.querySelectorAll('#leaderboard-table-body tr');

  rows.forEach(row => {
    row.classList.remove('current-player-row');
    const playerId = normalizePlayerId(row.dataset.playerId);
    if (normalizedCurrent && playerId === normalizedCurrent) {
      row.classList.add('current-player-row');
    }
  });
}

function renderLeaderboardTable(data, currentPlayerId = '') {
  const tbody = document.getElementById('leaderboard-table-body');
  if (!tbody) return;

  const normalizedCurrent = normalizePlayerId(currentPlayerId);
  tbody.innerHTML = '';

  if (!Array.isArray(data) || data.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td colspan="7" style="padding:16px;border-bottom:1px solid #555;text-align:center;color:#ccc;">
        目前沒有資料
      </td>
    `;
    tbody.appendChild(tr);
    return;
  }

  data.forEach((item, idx) => {
    const playerId = normalizePlayerId(item.playerId);
    const isCurrentPlayer = normalizedCurrent && playerId === normalizedCurrent;
    const tr = document.createElement('tr');
    tr.dataset.playerId = playerId;
    if (isCurrentPlayer) tr.classList.add('current-player-row');

    const textExtra = isCurrentPlayer ? 'color:#ffe600;font-weight:800;background:rgba(255,230,0,0.02);' : '';
    const rankLabel = isCurrentPlayer ? `${idx + 1} ★` : `${idx + 1}`;

    tr.innerHTML = `
      <td style="${getCellStyle(textExtra)}">${rankLabel}</td>
      <td style="${getCellStyle(textExtra)}">${playerId}</td>
      <td style="${getCellStyle(textExtra)}">${item.highestLevel ?? 0}</td>
      <td style="${getCellStyle(textExtra)}">${item.highestScore ?? 0}</td>
      <td style="${getCellStyle(textExtra)}">${item.vocabCount ?? 0}</td>
      <td style="${getCellStyle(textExtra)}">${item.bronzeCount ?? 0}/${item.silverCount ?? 0}/${item.goldCount ?? 0}</td>
      <td style="${getCellStyle(textExtra)}">${item.totalScore ?? 0}</td>
    `;
    tbody.appendChild(tr);
  });

  applyCurrentPlayerHighlight(normalizedCurrent);
}

function setTabButtonState(button, isActive) {
  if (!button) return;
  button.classList.toggle('active', isActive);
  button.style.background = isActive ? '#ffea00' : '#666';
  button.style.color = isActive ? '#222' : '#fff';
}

function setActiveTab(tabName, allData, classData, classPrefix, currentPlayerId) {
  const allBtn = document.getElementById('leaderboard-tab-all');
  const classBtn = document.getElementById('leaderboard-tab-class');
  const subtitle = document.getElementById('leaderboard-subtitle');

  if (!allBtn || !classBtn || !subtitle) return;

  const showClass = tabName === 'class';
  setTabButtonState(allBtn, !showClass);
  setTabButtonState(classBtn, showClass);

  if (showClass) {
    subtitle.textContent = classPrefix
      ? `目前顯示：${classPrefix} 班級排行榜（已高亮目前玩家）`
      : '目前顯示：班級排行榜';
    renderLeaderboardTable(classData, currentPlayerId);
  } else {
    subtitle.textContent = '目前顯示：全部排行榜（已高亮目前玩家）';
    renderLeaderboardTable(allData, currentPlayerId);
  }
}

export async function updateLeaderboard(playerId = '') {
  try {
    const actualPlayerId = normalizePlayerId(playerId || getRememberedPlayerId());
    const classPrefix = getClassPrefix(actualPlayerId);

    window.__leaderboardPlayerId = actualPlayerId || '';
    if (actualPlayerId) {
      localStorage.setItem('currentPlayerId', actualPlayerId);
    }

    const res = await fetch(`${API_BASE}/leaderboard`);
    const data = await res.json();

    if (!res.ok) {
      console.error('排行榜讀取失敗：', data.error || res.statusText);
      alert(`❌ 無法載入排行榜：${data.error || res.statusText}`);
      return;
    }

    const allData = Array.isArray(data) ? data : [];
    const classData = classPrefix
      ? allData.filter(item => normalizePlayerId(item.playerId).startsWith(classPrefix))
      : [];

    const allBtn = document.getElementById('leaderboard-tab-all');
    const classBtn = document.getElementById('leaderboard-tab-class');

    if (classBtn) {
      classBtn.style.display = 'inline-flex';
      classBtn.textContent = classPrefix ? `${classPrefix} 班排行` : '班級排行';
      classBtn.disabled = !classPrefix;
      classBtn.style.opacity = classPrefix ? '1' : '0.5';
      classBtn.style.cursor = classPrefix ? 'pointer' : 'not-allowed';
    }

    if (allBtn) {
      allBtn.onclick = () => setActiveTab('all', allData, classData, classPrefix, actualPlayerId);
    }
    if (classBtn) {
      classBtn.onclick = () => {
        if (!classPrefix) return;
        setActiveTab('class', allData, classData, classPrefix, actualPlayerId);
      };
    }

    if (classPrefix) {
      setActiveTab('class', allData, classData, classPrefix, actualPlayerId);
    } else {
      setActiveTab('all', allData, classData, classPrefix, actualPlayerId);
    }
  } catch (err) {
    console.error('排行榜載入失敗', err);
    alert('❌ 無法載入排行榜，請稍後再試');
  }
}

export async function submitScore(
  playerId,
  highestLevel,
  highestScore,
  vocabCount,
  trophyCount,
  bronzeCount,
  silverCount,
  goldCount
) {
  try {
    const normalizedPlayerId = normalizePlayerId(playerId);
    window.__leaderboardPlayerId = normalizedPlayerId;
    localStorage.setItem('currentPlayerId', normalizedPlayerId || '');

    const res = await fetch(`${API_BASE}/leaderboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: normalizedPlayerId,
        highestLevel,
        highestScore,
        vocabCount,
        trophyCount,
        bronzeCount,
        silverCount,
        goldCount
      })
    });
    const result = await res.json();

    if (!res.ok) {
      console.error('分數上傳失敗：', result.error || res.statusText);
      throw new Error(result.error || res.statusText);
    }
  } catch (err) {
    console.error('分數上傳失敗', err);
    throw err;
  }
}
