/**
 * 颜色工具函数
 */

/**
 * 判断颜色是否偏浅（用于暗背景上的色块辨识）
 * 基于 ITU-R BT.601 感知亮度公式
 */
export function isLightColor(hex) {
  if (!hex || hex.charAt(0) !== "#") return false;
  const c = hex.replace("#", "");
  if (c.length < 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}
