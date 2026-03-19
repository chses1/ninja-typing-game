// js/achievements.js

export const achievements = [
  // 🥉 Bronze
  { id: 'ach01', name: '新手下忍',      desc: '成功通過第一關',                 trophy: 'bronze', check: gs => gs.currentLevel >= 1 },
  { id: 'ach02', name: '初次命中',      desc: '累積命中 20 次標靶',             trophy: 'bronze', check: gs => gs.hitCount >= 20 },
  { id: 'ach03', name: '分數起飛',      desc: '累積分數達到 300 分',            trophy: 'bronze', check: gs => gs.score >= 300 },
  { id: 'ach04', name: '連擊小高手',    desc: '單場最高連擊達到 8',             trophy: 'bronze', check: gs => gs.maxCombo >= 8 },
  { id: 'ach05', name: '過 3 關',       desc: '通過 3 關',                      trophy: 'bronze', check: gs => gs.currentLevel >= 3 },
  { id: 'ach06', name: '初次擊敗 Boss', desc: '成功擊敗 1 次 Boss 關卡',         trophy: 'bronze', check: gs => gs.bossDefeatedCount >= 1 },
  { id: 'ach07', name: '健康不減',      desc: '頭目戰期間血量未減少',            trophy: 'bronze', check: gs => gs.bossHealthIntact },
  { id: 'ach08', name: '無失誤練習',    desc: '練習階段成功維持無失誤',          trophy: 'bronze', check: gs => gs.noErrorPractice },
  { id: 'ach09', name: '第一次按暫停',  desc: '遊戲中首次使用暫停功能',          trophy: 'bronze', check: gs => gs.pauseUsed === true },
  { id: 'ach10', name: '收集學徒',      desc: '學習單字累積到 5 個',             trophy: 'bronze', check: gs => gs.unlockedWords.length >= 5 },

  // 🥈 Silver
  { id: 'ach11', name: '升級中忍',      desc: '成功通過第十關',                 trophy: 'silver', check: gs => gs.currentLevel >= 10 },
  { id: 'ach12', name: '命中 150 目標', desc: '累積命中 150 次標靶',            trophy: 'silver', check: gs => gs.hitCount >= 150 },
  { id: 'ach13', name: '獲得 3000 分',  desc: '累積分數達到 3000 分',           trophy: 'silver', check: gs => gs.score >= 3000 },
  { id: 'ach14', name: '連擊 20 次',    desc: '單場最高連擊達到 20',            trophy: 'silver', check: gs => gs.maxCombo >= 20 },
  { id: 'ach15', name: '過 10 關',      desc: '通過 10 關',                     trophy: 'silver', check: gs => gs.currentLevel >= 10 },
  { id: 'ach16', name: '擊敗 5 隻 Boss',desc: '總共擊敗 5 次 Boss',             trophy: 'silver', check: gs => gs.bossDefeatedCount >= 5 },
  { id: 'ach17', name: '健康不減三次',  desc: '連續三場頭目戰期間血量未減少',    trophy: 'silver', check: gs => gs.consecutiveBossHealthIntactCount >= 3 },
  { id: 'ach18', name: '無失誤練習 3 次',desc: '練習階段連續 3 次無失誤',       trophy: 'silver', check: gs => gs.consecutiveNoErrorPracticeCount >= 3 },
  { id: 'ach19', name: '使用 5 次暫停', desc: '遊戲中使用暫停達 5 次',          trophy: 'silver', check: gs => gs.pauseCount >= 5 },
  { id: 'ach20', name: '收集進階',      desc: '學習單字累積到 15 個',            trophy: 'silver', check: gs => gs.unlockedWords.length >= 15 },

  // 🏆 Gold
  { id: 'ach21', name: '上級忍者',      desc: '成功通過第二十關',               trophy: 'gold', check: gs => gs.currentLevel >= 20 },
  { id: 'ach22', name: '命中 500 目標', desc: '累積命中 500 次標靶',            trophy: 'gold', check: gs => gs.hitCount >= 500 },
  { id: 'ach23', name: '獲得 12000 分', desc: '累積分數達到 12000 分',          trophy: 'gold', check: gs => gs.score >= 12000 },
  { id: 'ach24', name: '連擊 50 次',    desc: '單場最高連擊達到 50',            trophy: 'gold', check: gs => gs.maxCombo >= 50 },
  { id: 'ach25', name: '過 25 關',      desc: '通過 25 關',                     trophy: 'gold', check: gs => gs.currentLevel >= 25 },
  { id: 'ach26', name: '擊敗 12 隻 Boss',desc: '總共擊敗 12 次 Boss',           trophy: 'gold', check: gs => gs.bossDefeatedCount >= 12 },
  { id: 'ach27', name: '健康不減六次',  desc: '連續六場頭目戰期間血量未減少',    trophy: 'gold', check: gs => gs.consecutiveBossHealthIntactCount >= 6 },
  { id: 'ach28', name: '無失誤練習 6 次',desc: '練習階段連續 6 次無失誤',       trophy: 'gold', check: gs => gs.consecutiveNoErrorPracticeCount >= 6 },
  { id: 'ach29', name: '大師試煉',      desc: '成功通過第二十九關',             trophy: 'gold', check: gs => gs.currentLevel >= 29 },
  { id: 'ach30', name: '忍者大師',      desc: '學習單字累積到全部 30 個',        trophy: 'gold', check: gs => gs.unlockedWords.length >= 30 },
];
