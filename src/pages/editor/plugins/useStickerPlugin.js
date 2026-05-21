import { ref } from "vue";
import { STICKER_CATEGORIES } from "@/constants/stickerData";
import {
  hitToLocal,
  distance,
  hitControl,
  getControlMetrics,
  drawSelectionFrame,
} from "@/utils/gesture-helper";

/**
 * 贴纸插件 — 自含渲染、导出和触摸
 * 通过 context.ctx 直接绘制预览，通过 context.exportPipeline overlay 模式导出。
 * 手势状态（dragMode/dragStart）和图片缓存局部化到插件内部。
 */
export function useStickerPlugin(context) {
  const elements = ref([]);
  let dragMode = "";
  let dragStart = null;
  const imageCache = new Map();

  function getStickerBounds(el) {
    if (el.type === "image")
      return { halfW: el.width / 2, halfH: el.height / 2 };
    const halfSize = el.fontSize * 0.75;
    return { halfW: halfSize, halfH: halfSize };
  }

  async function loadStickerImage(src) {
    if (imageCache.has(src)) return imageCache.get(src);
    const img = await context.loadImage?.(src);
    if (img) imageCache.set(src, img);
    return img;
  }

  function drawStickerGlyph(ctx, el, size) {
    ctx.save();
    if (el.flipX) ctx.scale(-1, 1);
    if (el.type === "image") {
      const cached = imageCache.get(el.src);
      if (cached) {
        const w = el.width || size;
        const h = el.height || size;
        ctx.drawImage(cached, -w / 2, -h / 2, w, h);
      }
    } else {
      ctx.font = `${size}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(el.emoji, 0, 0);
    }
    ctx.restore();
  }

  return {
    key: "sticker",
    requiresConfirm: true,
    supportsLivePreview: true,
    activate() {},
    deactivate() {},
    reset() {
      elements.value = [];
      imageCache.clear();
      dragMode = "";
      dragStart = null;
    },
    onTouchStart(event) {
      const touch = event.touches?.[0] || event;
      const tx = touch.x;
      const ty = touch.y;
      const selection = context.getSelection?.();

      if (selection?.id && selection.type === "sticker") {
        const el = elements.value.find((s) => s.id === selection.id);
        if (el) {
          const { halfW, halfH } = getStickerBounds(el);
          const { fw, fh, handleRadius } = getControlMetrics(halfW, halfH);
          const local = hitToLocal(tx, ty, el);

          if (hitControl(local, -fw, -fh, handleRadius + 3)) {
            el.flipX = !el.flipX;
            context.requestRender?.();
            return;
          }
          if (hitControl(local, fw, -fh, handleRadius + 3)) {
            const idx = elements.value.indexOf(el);
            if (idx >= 0) elements.value.splice(idx, 1);
            context.setSelection?.({ id: null, type: "" });
            context.requestRender?.();
            return;
          }
          if (hitControl(local, fw, fh, handleRadius + 4)) {
            dragMode = "transform";
            dragStart = {
              centerDist: distance(tx, ty, el.x, el.y),
              angle: Math.atan2(ty - el.y, tx - el.x),
              snapshot: { ...el },
            };
            return;
          }
          if (Math.abs(local.x) <= fw && Math.abs(local.y) <= fh) {
            dragMode = "move";
            dragStart = { x: tx, y: ty, sx: el.x, sy: el.y };
            return;
          }
        }
      }

      for (let i = elements.value.length - 1; i >= 0; i--) {
        const el = elements.value[i];
        const { halfW, halfH } = getStickerBounds(el);
        const { fw, fh } = getControlMetrics(halfW, halfH);
        const local = hitToLocal(tx, ty, el);
        if (Math.abs(local.x) <= fw && Math.abs(local.y) <= fh) {
          context.setSelection?.({ id: el.id, type: "sticker" });
          dragMode = "move";
          dragStart = { x: tx, y: ty, sx: el.x, sy: el.y };
          context.requestRender?.();
          return;
        }
      }

      if (selection?.id && selection.type === "sticker") {
        context.setSelection?.({ id: null, type: "" });
        context.requestRender?.();
      }
    },
    onTouchMove(event) {
      const selection = context.getSelection?.();
      if (!selection?.id || selection.type !== "sticker" || !dragStart) return;
      const el = elements.value.find((s) => s.id === selection.id);
      if (!el) return;

      const touch = event.touches?.[0] || event;
      const tx = touch.x;
      const ty = touch.y;

      if (dragMode === "move") {
        el.x = dragStart.sx + (tx - dragStart.x);
        el.y = dragStart.sy + (ty - dragStart.y);
      } else if (dragMode === "transform") {
        const curDist = distance(tx, ty, el.x, el.y);
        const scaleFactor = curDist / dragStart.centerDist;
        const curAngle = Math.atan2(ty - el.y, tx - el.x);
        if (el.type === "image") {
          el.width = Math.max(
            20,
            Math.round(dragStart.snapshot.width * scaleFactor)
          );
          el.height = Math.max(
            20,
            Math.round(dragStart.snapshot.height * scaleFactor)
          );
        } else {
          el.fontSize = Math.max(
            20,
            Math.round(dragStart.snapshot.fontSize * scaleFactor)
          );
        }
        el.rotation =
          dragStart.snapshot.rotation + (curAngle - dragStart.angle);
      }

      context.requestRender?.();
    },
    onTouchEnd() {
      dragMode = "";
      dragStart = null;
    },
    async renderPreview() {
      const ctx = context.ctx;
      const imageStickers = elements.value.filter(
        (el) => el.type === "image" && !imageCache.has(el.src)
      );
      if (imageStickers.length > 0) {
        await Promise.all(imageStickers.map((el) => loadStickerImage(el.src)));
      }

      const selection = context.getSelection?.();
      elements.value.forEach((el) => {
        ctx.save();
        ctx.translate(el.x, el.y);
        ctx.rotate(el.rotation);

        const size =
          el.type === "image" ? Math.max(el.width, el.height) : el.fontSize;
        drawStickerGlyph(ctx, el, size);

        if (selection?.id === el.id && selection.type === "sticker") {
          const { halfW, halfH } = getStickerBounds(el);
          drawSelectionFrame(ctx, halfW, halfH, { showFlip: true });
        }

        ctx.restore();
      });
    },
    async commit() {
      if (elements.value.length === 0) return null;
      const localElements = [...elements.value];
      return context.exportPipeline({
        drawOriginal: true,
        async renderFn(ctx, { scaleX, scaleY, scale, imageRect: ir }) {
          for (const s of localElements) {
            ctx.save();
            ctx.translate((s.x - ir.x) * scaleX, (s.y - ir.y) * scaleY);
            ctx.rotate(s.rotation);

            if (s.type === "image") {
              let stickerImg = imageCache.get(s.src);
              if (!stickerImg) {
                stickerImg = await context.loadImage?.(s.src);
              }
              if (stickerImg) {
                const w = s.width * scale;
                const h = s.height * scale;
                ctx.drawImage(stickerImg, -w / 2, -h / 2, w, h);
              }
            } else {
              ctx.font = `${s.fontSize * scale}px sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(s.emoji, 0, 0);
            }

            ctx.restore();
          }
        },
      });
    },
    getPanelProps() {
      return {
        categories: STICKER_CATEGORIES,
        elements: elements.value,
      };
    },
    getPanelActions() {
      return {
        addSticker(sticker) {
          const imageRect = context.getImageRect?.();
          const id = Date.now();

          if (sticker.src) {
            elements.value.push({
              id,
              type: "image",
              src: sticker.src,
              x: imageRect.x + imageRect.w / 2,
              y: imageRect.y + imageRect.h / 2,
              width: 80,
              height: 80,
              flipX: false,
              rotation: 0,
            });
          } else {
            elements.value.push({
              id,
              type: "emoji",
              emoji: sticker.emoji,
              x: imageRect.x + imageRect.w / 2,
              y: imageRect.y + imageRect.h / 2,
              fontSize: 48,
              flipX: false,
              rotation: 0,
            });
          }

          context.setSelection?.({ id, type: "sticker" });
          context.requestRender?.();
        },
      };
    },
  };
}
