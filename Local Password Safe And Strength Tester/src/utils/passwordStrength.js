export function analyzePassword(pwd) {
  if (!pwd) {
    return { score: 0, level: 'empty', label: '请输入密码', details: {} }
  }

  const details = {
    length: pwd.length,
    hasLower: /[a-z]/.test(pwd),
    hasUpper: /[A-Z]/.test(pwd),
    hasDigit: /[0-9]/.test(pwd),
    hasSymbol: /[^A-Za-z0-9]/.test(pwd),
    onlyDigit: /^[0-9]+$/.test(pwd),
    onlyLower: /^[a-z]+$/.test(pwd),
    onlyUpper: /^[A-Z]+$/.test(pwd),
    onlyLetter: /^[A-Za-z]+$/.test(pwd)
  }

  let score = 0
  if (pwd.length >= 6) score += 10
  if (pwd.length >= 8) score += 10
  if (pwd.length >= 12) score += 10
  if (pwd.length >= 16) score += 10

  if (details.hasLower) score += 15
  if (details.hasUpper) score += 15
  if (details.hasDigit) score += 15
  if (details.hasSymbol) score += 25

  if (details.onlyDigit || details.onlyLetter || details.onlyLower || details.onlyUpper) {
    score = Math.min(score, 25)
  }

  score = Math.min(score, 100)

  let level, label
  if (score < 30) {
    level = 'weak'
    label = details.onlyDigit ? '纯数字密码！小偷最爱！' : '太弱啦！加点花样吧'
  } else if (score < 60) {
    level = 'medium'
    label = '一般般，再加点料？'
  } else if (score < 85) {
    level = 'strong'
    label = '不错！保镖开始注意你了'
  } else {
    level = 'beast'
    label = '固若金汤！保镖对你敬礼！'
  }

  return { score, level, label, details }
}
