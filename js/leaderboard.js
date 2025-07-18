// js/leaderboard.js
const API_BASE = 'http://localhost:3000'; // ← 改成你的域名
/** 取得排行榜（顯示在 UI 上） */
export async function updateLeaderboard() {
  try {
    // 1. 向後端請求排行榜資料
    const res = await fetch(`${API_BASE}/leaderboard`);
    const data = await res.json();
    console.log('排行榜資料', data);

    // 3. 把資料顯示在 table 裡（多一欄 totalScore）
    const tbody = document.getElementById('leaderboard-table-body');
    tbody.innerHTML = '';
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
  } catch (err) {
    console.error('排行榜載入失敗', err);
    alert('無法載入排行榜，請稍後再試');
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
    await fetch(`${API_BASE}/leaderboard`, {
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
  } catch (err) {
    console.error('分數上傳失敗', err);
    throw err;
  }
}