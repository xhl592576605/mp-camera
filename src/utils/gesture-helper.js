/**
 * 共享的手势工具函数，供 sticker/text 插件的触摸交互和选择框渲染使用。
 */

/** 将全局触摸坐标反变换到元素的本地坐标系 */
export function hitToLocal(tx, ty, el) {
  const dx = tx - el.x;
  const dy = ty - el.y;
  const cos = Math.cos(-el.rotation);
  const sin = Math.sin(-el.rotation);
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
}

/** 两点之间的欧氏距离 */
export function distance(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

/** 判断本地坐标是否命中控制按钮 */
export function hitControl(local, x, y, radius = 16) {
  return distance(local.x, local.y, x, y) <= radius;
}

/** 根据元素半宽半高计算选择框和控制按钮的尺寸 */
export function getControlMetrics(halfW, halfH) {
  const pad = 14;
  const fw = halfW + pad;
  const fh = halfH + pad;
  const handleRadius = 13;
  return { fw, fh, handleRadius };
}

/** 在当前位置绘制选择框（白色边框 + 中心虚线 + 控制按钮） */
export function drawSelectionFrame(ctx, halfW, halfH, options = {}) {
  const { fw, fh } = getControlMetrics(halfW, halfH);
  const { showFlip = false } = options;

  ctx.save();
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 2;
  ctx.shadowColor = "rgba(0, 0, 0, 0.26)";
  ctx.shadowBlur = 10;
  ctx.strokeRect(-fw, -fh, fw * 2, fh * 2);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.34)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-fw, 0);
  ctx.lineTo(fw, 0);
  ctx.moveTo(0, -fh);
  ctx.lineTo(0, fh);
  ctx.stroke();

  if (showFlip) {
    drawControlButton(ctx, -fw, -fh, "flip");
  }
  drawControlButton(ctx, fw, -fh, "delete");
  drawControlButton(ctx, fw, fh, "transform");
  ctx.restore();
}

/** 绘制单个控制按钮（删除 × / 翻转 ⇔ / 旋转 ↻） */
export function drawControlButton(ctx, x, y, kind) {
  const isDelete = kind === "delete";

  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = isDelete ? "#FFFFFF" : "#FF5A66";
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = isDelete ? "#FF5A66" : "#FFFFFF";
  ctx.fillStyle = isDelete ? "#FF5A66" : "#FFFFFF";
  ctx.lineWidth = isDelete ? 2.8 : 2.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (kind === "delete") {
    ctx.beginPath();
    ctx.moveTo(-4.8, -4.8);
    ctx.lineTo(4.8, 4.8);
    ctx.moveTo(4.8, -4.8);
    ctx.lineTo(-4.8, 4.8);
    ctx.stroke();
  } else if (kind === "flip") {
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(0, 5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(-2, -4);
    ctx.lineTo(-2, 4);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(2, -4);
    ctx.lineTo(2, 4);
    ctx.closePath();
    ctx.fill();
  } else if (kind === "transform") {
    ctx.beginPath();
    ctx.arc(-0.6, 0.8, 5.6, Math.PI * 1.15, Math.PI * 0.15, false);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(4.8, -4.2);
    ctx.lineTo(7.0, 0.4);
    ctx.lineTo(2.4, -0.4);
    ctx.stroke();
  }

  ctx.restore();
}
