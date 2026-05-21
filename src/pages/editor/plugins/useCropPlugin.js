import { ref } from "vue";

/**
 * 裁剪插件 — 自含渲染和导出
 * 通过 context.ctx 直接绘制预览，通过 context.exportPipeline transform 模式导出。
 */
export function useCropPlugin(context) {
  const rect = ref({ x: 0, y: 0, w: 0, h: 0 });
  const ratio = ref("");
  let dragging = "";
  let startPos = null;
  let startRect = null;

  function initRect() {
    const imageRect = context.getImageRect?.();
    if (!imageRect) return;
    let w, h;
    if (ratio.value === "1:1") {
      const size = Math.min(imageRect.w, imageRect.h) * 0.8;
      w = size;
      h = size;
    } else if (ratio.value === "4:3") {
      w = imageRect.w * 0.8;
      h = (w * 3) / 4;
      if (h > imageRect.h * 0.8) {
        h = imageRect.h * 0.8;
        w = (h * 4) / 3;
      }
    } else if (ratio.value === "16:9") {
      w = imageRect.w * 0.8;
      h = (w * 9) / 16;
      if (h > imageRect.h * 0.8) {
        h = imageRect.h * 0.8;
        w = (h * 16) / 9;
      }
    } else {
      w = imageRect.w * 0.8;
      h = imageRect.h * 0.8;
    }
    rect.value = {
      x: imageRect.x + (imageRect.w - w) / 2,
      y: imageRect.y + (imageRect.h - h) / 2,
      w,
      h,
    };
    context.requestRender?.();
  }

  function renderCropOverlay() {
    const ctx = context.ctx;
    const ir = context.getImageRect?.();
    const cr = rect.value;
    if (!ir || cr.w < 1) return;

    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(ir.x, ir.y, ir.w, cr.y - ir.y);
    ctx.fillRect(ir.x, cr.y + cr.h, ir.w, ir.y + ir.h - cr.y - cr.h);
    ctx.fillRect(ir.x, cr.y, cr.x - ir.x, cr.h);
    ctx.fillRect(cr.x + cr.w, cr.y, ir.x + ir.w - cr.x - cr.w, cr.h);

    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1;
    ctx.strokeRect(cr.x, cr.y, cr.w, cr.h);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(cr.x + (cr.w * i) / 3, cr.y);
      ctx.lineTo(cr.x + (cr.w * i) / 3, cr.y + cr.h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cr.x, cr.y + (cr.h * i) / 3);
      ctx.lineTo(cr.x + cr.w, cr.y + (cr.h * i) / 3);
      ctx.stroke();
    }

    const hl = 24;
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    const corners = [
      { x: cr.x, y: cr.y, dx: 1, dy: 1 },
      { x: cr.x + cr.w, y: cr.y, dx: -1, dy: 1 },
      { x: cr.x, y: cr.y + cr.h, dx: 1, dy: -1 },
      { x: cr.x + cr.w, y: cr.y + cr.h, dx: -1, dy: -1 },
    ];
    corners.forEach((c) => {
      ctx.beginPath();
      ctx.moveTo(c.x + c.dx * hl, c.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(c.x, c.y + c.dy * hl);
      ctx.stroke();
    });
    ctx.lineCap = "butt";
  }

  return {
    key: "crop",
    requiresConfirm: true,
    supportsLivePreview: true,
    activate() {
      ratio.value = "";
      initRect();
    },
    deactivate() {},
    reset() {
      dragging = "";
      startPos = null;
      startRect = null;
      rect.value = { x: 0, y: 0, w: 0, h: 0 };
      ratio.value = "";
    },
    onTouchStart(event) {
      const touch = event.touches?.[0] || event;
      const cr = rect.value;
      const imageRect = context.getImageRect?.();
      if (!imageRect) return;

      const handleSize = 30;
      const corners = [
        { key: "tl", x: cr.x, y: cr.y },
        { key: "tr", x: cr.x + cr.w, y: cr.y },
        { key: "bl", x: cr.x, y: cr.y + cr.h },
        { key: "br", x: cr.x + cr.w, y: cr.y + cr.h },
      ];
      for (const c of corners) {
        if (
          Math.abs(touch.x - c.x) < handleSize &&
          Math.abs(touch.y - c.y) < handleSize
        ) {
          dragging = c.key;
          startPos = { x: touch.x, y: touch.y };
          startRect = { ...cr };
          return;
        }
      }
      if (
        touch.x >= cr.x &&
        touch.x <= cr.x + cr.w &&
        touch.y >= cr.y &&
        touch.y <= cr.y + cr.h
      ) {
        dragging = "move";
        startPos = { x: touch.x, y: touch.y };
        startRect = { ...cr };
      }
    },
    onTouchMove(event) {
      if (!dragging || !startPos) return;
      const touch = event.touches?.[0] || event;
      const imageRect = context.getImageRect?.();
      const dx = touch.x - startPos.x;
      const dy = touch.y - startPos.y;
      const sr = startRect;
      const ir = imageRect;
      const minSize = 50;
      let r = { ...sr };

      if (dragging === "move") {
        r.x = Math.max(ir.x, Math.min(sr.x + dx, ir.x + ir.w - sr.w));
        r.y = Math.max(ir.y, Math.min(sr.y + dy, ir.y + ir.h - sr.h));
      } else if (dragging === "br") {
        r.w = Math.max(minSize, Math.min(sr.w + dx, ir.x + ir.w - sr.x));
        r.h = Math.max(minSize, Math.min(sr.h + dy, ir.y + ir.h - sr.y));
        if (ratio.value) {
          const parts = ratio.value.split(":").map(Number);
          const ratioVal = parts[0] / parts[1];
          r.h = r.w / ratioVal;
          if (sr.y + r.h > ir.y + ir.h) {
            r.h = ir.y + ir.h - sr.y;
            r.w = r.h * ratioVal;
          }
        }
      } else if (dragging === "tl") {
        r.x = Math.max(ir.x, sr.x + dx);
        r.y = Math.max(ir.y, sr.y + dy);
        r.w = Math.max(minSize, sr.x + sr.w - r.x);
        r.h = Math.max(minSize, sr.y + sr.h - r.y);
      } else if (dragging === "tr") {
        r.w = Math.max(minSize, Math.min(sr.w + dx, ir.x + ir.w - sr.x));
        r.y = Math.max(ir.y, sr.y + dy);
        r.h = Math.max(minSize, sr.y + sr.h - r.y);
      } else if (dragging === "bl") {
        r.x = Math.max(ir.x, sr.x + dx);
        r.w = Math.max(minSize, sr.x + sr.w - r.x);
        r.h = Math.max(minSize, Math.min(sr.h + dy, ir.y + ir.h - sr.y));
      }

      rect.value = r;
      context.requestRender?.();
    },
    onTouchEnd() {
      dragging = "";
      startPos = null;
      startRect = null;
    },
    renderPreview() {
      renderCropOverlay();
    },
    async commit() {
      const cr = rect.value;
      const ir = context.getImageRect?.();
      if (!ir || cr.w < 10 || cr.h < 10) return null;
      const snapshot = context.getActiveSnapshot?.();
      const scaleX = snapshot.width / ir.w;
      const scaleY = snapshot.height / ir.h;
      const cropW = Math.round(cr.w * scaleX);
      const cropH = Math.round(cr.h * scaleY);

      return context.exportPipeline({
        width: cropW,
        height: cropH,
        drawOriginal: false,
        async renderFn(ctx, { canvas }) {
          const img = await context.loadImage?.(snapshot.tempFilePath);
          const cropX = Math.round((cr.x - ir.x) * scaleX);
          const cropY = Math.round((cr.y - ir.y) * scaleY);
          ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        },
      });
    },
    getPanelProps() {
      return {
        ratio: ratio.value,
        rect: rect.value,
        ratios: [
          { key: "", label: "自由" },
          { key: "1:1", label: "1:1" },
          { key: "4:3", label: "4:3" },
          { key: "16:9", label: "16:9" },
        ],
      };
    },
    getPanelActions() {
      return {
        setRatio(value) {
          ratio.value = value;
          initRect();
        },
      };
    },
  };
}
