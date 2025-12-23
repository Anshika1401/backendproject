// utils/progressUtil.js

export function calculatePercentage(score, total) {
  if (!total || total === 0) return 0;
  return Number(((score / total) * 100).toFixed(2));
}
