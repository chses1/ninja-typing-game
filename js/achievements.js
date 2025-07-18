// js/achievements.js

export const achievements = [
  // 🥉 Bronze (前 10 筆)
  { id: 'ach01', name: '新手下忍',      desc: '成功通過第一關',               trophy: 'bronze', check: gs => gs.currentLevel === 1 },
  { id: 'ach02', name: '命中 100 目標',     desc: '累積命中 100 次標靶',          trophy: 'bronze', check: gs => gs.hitCount >= 100 },
  { id: 'ach03', name: '獲得 1500 分',       desc: '累積分數達到 1500 分',          trophy: 'bronze', check: gs => gs.score >= 1500 },
  { id: 'ach04', name: '連擊 20 次',        desc: '單場最高連擊達到 20',          trophy: 'bronze', check: gs => gs.maxCombo >= 20 },
  { id: 'ach05', name: '過 5 關',          desc: '通過 5 關',                   trophy: 'bronze', check: gs => gs.currentLevel >= 5 },
  { id: 'ach06', name: '擊敗 7 隻 Boss',   desc: '成功擊敗七次 Boss 關卡',      trophy: 'bronze', check: gs => gs.bossDefeatedCount >= 7 },
{ id: 'ach07', name: '健康不減',         desc: '頭目戰期間血量未減少',        trophy: 'bronze', check: gs => gs.bossHealthIntact },
  { id: 'ach08', name: '無失誤練習',       desc: '30 秒練習內不失手',           trophy: 'bronze', check: gs => gs.noErrorPractice },
  { id: 'ach09', name: '第一次按暫停',     desc: '遊戲中首次使用暫停功能',      trophy: 'bronze', check: gs => gs.pauseUsed === true },
  { id: 'ach10', name: '中忍考試',    desc: '學習單字累積到 9 個',         trophy: 'bronze', check: gs => gs.unlockedWords.length >= 9 },

  // 🥈 Silver (中間 10 筆)
  { id: 'ach11', name: '升級中忍',     desc: '成功通過第十關',              trophy: 'silver', check: gs => gs.currentLevel >= 10 },
  { id: 'ach12', name: '命中 500 目標',     desc: '累積命中 500 次標靶',         trophy: 'silver', check: gs => gs.hitCount >= 500 },
  { id: 'ach13', name: '獲得 10000 分',      desc: '累積分數達到 10000 分',         trophy: 'silver', check: gs => gs.score >= 10000 },
  { id: 'ach14', name: '連擊 50 次',       desc: '單場最高連擊達到 50',         trophy: 'silver', check: gs => gs.maxCombo >= 50 },
  { id: 'ach15', name: '過 15 關',         desc: '通過 15 關',                  trophy: 'silver', check: gs => gs.currentLevel >= 15 },
  { id: 'ach16', name: '擊敗 18 隻 Boss',   desc: '總共擊敗 18 次 Boss',          trophy: 'silver', check: gs => gs.bossDefeatedCount >= 18 },
  { id: 'ach17', name: '健康不減五次',     desc: '連續五場頭目戰期間血量未減少',        trophy: 'silver', check: gs => gs.consecutiveBossHealthIntactCount >= 5 },
  { id: 'ach18', name: '無失誤練習 5 次',   desc: '練習階段連續 5 次無失誤',    trophy: 'silver', check: gs => gs.consecutiveNoErrorPracticeCount >= 5 },
  { id: 'ach19', name: '使用 10 次暫停',   desc: '遊戲中使用暫停達 10 次',      trophy: 'silver', check: gs => gs.pauseCount >= 10 },
  { id: 'ach20', name: '上忍考試',   desc: '學習單字累積到 19 個',        trophy: 'silver', check: gs => gs.unlockedWords.length >= 19 },

  // 🏆 Gold (後 10 筆)
  { id: 'ach21', name: '上級忍者',     desc: '成功通過第二十關',            trophy: 'gold', check: gs => gs.currentLevel >= 20 },
  { id: 'ach22', name: '命中 1000 目標',    desc: '累積命中 1000 次標靶',       trophy: 'gold', check: gs => gs.hitCount >= 1000 },
  { id: 'ach23', name: '獲得 25000 分',      desc: '累積分數達到 25000 分',         trophy: 'gold', check: gs => gs.score >= 25000 },
  { id: 'ach24', name: '連擊 100 次',       desc: '單場最高連擊達到 100',         trophy: 'gold', check: gs => gs.maxCombo >= 100 },
  { id: 'ach25', name: '過 25 關',         desc: '通過 25 關',                  trophy: 'gold', check: gs => gs.currentLevel >= 25 },
  { id: 'ach26', name: '擊敗 27 隻 Boss',   desc: '總共擊敗 27 次 Boss',          trophy: 'gold', check: gs => gs.bossDefeatedCount >= 27 },
  { id: 'ach27', name: '健康不減十次',     desc: '連續十場頭目戰期間血量未減少',        trophy: 'gold',   check: gs => gs.consecutiveBossHealthIntactCount >= 10 },
  { id: 'ach28', name: '無失誤練習 10 次',  desc: '練習階段連續 10 次無失誤',   trophy: 'gold',   check: gs => gs.consecutiveNoErrorPracticeCount >= 10 },
  { id: 'ach29', name: '大師試煉',   desc: '成功通過第二十九關',      trophy: 'gold', check: gs => gs.currentLevel >= 29 },
  { id: 'ach30', name: '忍者大師',     desc: '學習單字累積到全部 30 個',    trophy: 'gold', check: gs => gs.unlockedWords.length >= 30 },
];
