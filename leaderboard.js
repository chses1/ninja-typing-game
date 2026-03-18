// js/leaderboard.js
const API_BASE = 'https://ninja-typing-game.onrender.com';

function getClassPrefix(playerId) {
  if (!playerId) return '';
  const id = String(playerId).trim();
  if (id.length < 3) return '';
  return id.slice(0, 3);
}

function renderLeaderboardTable(data) {
  const tbody = document.getElementById('leaderboard-table-body');
  if (!tbody) return;

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
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="padding:8px;border-bottom:1px solid #555;">${idx + 1}</td>
      <td style="padding:8px;border-bottom:1px solid #555;">${item.playerId}</td>
      <td style="padding:8px;border-bottom:1px solid #555;">${item.highestLevel}</td>
      <td style="padding:8px;border-bottom:1px solid #555;">${item.highestScore}</td>
      <td style="padding:8px;border-bottom:1px solid #555;">${item.vocabCount}</td>
      <td style="padding:8px;border-bottom:1px solid #555;">${item.bronzeCount}/${item.silverCount}/${item.goldCount}</td>
      <td style="padding:8px;border-bottom:1px solid #555;">${item.totalScore}</td>
    `;
    tbody.appendChild(tr);
  });
}

function setActiveTab(tabName, allData, classData, classPrefix) {
  const allBtn = document.getElementById('leaderboard-tab-all');
  const classBtn = document.getElementById('leaderboard-tab-class');
  const subtitle = document.getElementById('leaderboard-subtitle');

  if (!allBtn || !classBtn || !subtitle) return;

  const showClass = tabName === 'class';
  allBtn.classList.toggle('active', !showClass);
  classBtn.classList.toggle('active', showClass);

  if (showClass) {
    subtitle.textContent = classPrefix
      ? `班級排行榜（${classPrefix}）`
      : '班級排行榜';
    renderLeaderboardTable(classData);
  } else {
    subtitle.textContent = '全部排行榜';
    renderLeaderboardTable(allData);
  }
}

/**
 * 取得排行榜並建立「全部 / 班級」分頁
 * @param {string} [playerId]
 */
export async function updateLeaderboard(playerId = '') {
  try {
    const actualPlayerId = playerId || window?.gameState?.player?.id || '';
    const classPrefix = getClassPrefix(actualPlayerId);

    const res = await fetch(`${API_BASE}/leaderboard`);
    const data = await res.json();

    if (!res.ok) {
      console.error('排行榜讀取失敗：', data.error || res.statusText);
      alert(`❌ 無法載入排行榜：${data.error || res.statusText}`);
      return;
    }

    const allData = Array.isArray(data) ? data : [];
    const classData = classPrefix
      ? allData.filter(item => String(item.playerId || '').startsWith(classPrefix))
      : [];

    const allBtn = document.getElementById('leaderboard-tab-all');
    const classBtn = document.getElementById('leaderboard-tab-class');

    if (classBtn) {
      classBtn.style.display = classPrefix ? 'inline-flex' : 'none';
      classBtn.textContent = classPrefix ? `${classPrefix}班級排行` : '班級排行';
    }

    if (allBtn) {
      allBtn.onclick = () => setActiveTab('all', allData, classData, classPrefix);
    }
    if (classBtn) {
      classBtn.onclick = () => setActiveTab('class', allData, classData, classPrefix);
    }

    if (classPrefix && classData.length > 0) {
      setActiveTab('class', allData, classData, classPrefix);
    } else {
      setActiveTab('all', allData, classData, classPrefix);
    }
  } catch (err) {
    console.error('排行榜載入失敗', err);
    alert('❌ 無法載入排行榜，請稍後再試');
  }
}

/** 上傳完整成績到排行榜（帶入金／銀／銅／圖鑑） */
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
    const res = await fetch(`${API_BASE}/leaderboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId,
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
