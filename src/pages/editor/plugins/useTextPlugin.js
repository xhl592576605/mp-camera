import { ref } from "vue";
import {
  hitToLocal,
  distance,
  hitControl,
  getControlMetrics,
  drawSelectionFrame,
} from "@/utils/gesture-helper";

/**
 * 文字插件 — 自含渲染、导出和触摸
 * 通过 context.ctx 直接绘制预览，通过 context.exportPipeline overlay 模式导出。
 * 手势状态（dragMode/dragStart）局部化到插件内部。
 */
export function useTextPlugin(context) {
  const elements = ref([]);
  const input = ref("");
  const color = ref("#FFFFFF");
  const fontSize = ref(32);
  const sizes = [
    { value: 24, label: "小" },
    { value: 32, label: "中" },
    { value: 44, label: "大" },
  ];
  let dragMode = "";
  let dragStart = null;

  function getTextBounds(el) {
    const ctx = context.ctx;
    ctx.font = `bold ${el.fontSize}px -apple-system, "PingFang SC", sans-serif`;
    const textW = ctx.measureText(el.content).width;
    return { halfW: textW / 2 + 12, halfH: el.fontSize * 0.7 };
  }

  return {
    key: "text",
    requiresConfirm: true,
    supportsLivePreview: true,
    activate() {},
    deactivate() {},
    reset() {
      elements.value = [];
      input.value = "";
      dragMode = "";
      dragStart = null;
    },
    onTouchStart(event) {
      const touch = event.touches?.[0] || event;
      const tx = touch.x;
      const ty = touch.y;
      const selection = context.getSelection?.();

      if (selection?.id && selection.type === "text") {
        const el = elements.value.find((t) => t.id === selection.id);
        if (el) {
          const { halfW, halfH } = getTextBounds(el);
          const { fw, fh, handleRadius } = getControlMetrics(halfW, halfH);
          const local = hitToLocal(tx, ty, el);

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
        const { halfW, halfH } = getTextBounds(el);
        const { fw, fh } = getControlMetrics(halfW, halfH);
        const local = hitToLocal(tx, ty, el);
        if (Math.abs(local.x) <= fw && Math.abs(local.y) <= fh) {
          context.setSelection?.({ id: el.id, type: "text" });
          dragMode = "move";
          dragStart = { x: tx, y: ty, sx: el.x, sy: el.y };
          context.requestRender?.();
          return;
        }
      }

      if (selection?.id && selection.type === "text") {
        context.setSelection?.({ id: null, type: "" });
        context.requestRender?.();
      }
    },
    onTouchMove(event) {
      const selection = context.getSelection?.();
      if (!selection?.id || selection.type !== "text" || !dragStart) return;
      const el = elements.value.find((t) => t.id === selection.id);
      if (!el) return;

      const touch = event.touches?.[0] || event;
      const tx = touch.x;
      const ty = touch.y;

      if (dragMode === "move") {
        el.x = dragStart.sx + (tx - dragStart.x);
        el.y = dragStart.sy + (ty - dragStart.y);
      } else if (dragMode === "transform") {
        const curDist = distance(tx, ty, el.x, el.y);
        const scale = curDist / dragStart.centerDist;
        const curAngle = Math.atan2(ty - el.y, tx - el.x);
        el.fontSize = Math.max(
          14,
          Math.round(dragStart.snapshot.fontSize * scale)
        );
        el.rotation =
          dragStart.snapshot.rotation + (curAngle - dragStart.angle);
      }

      context.requestRender?.();
    },
    onTouchEnd() {
      dragMode = "";
      dragStart = null;
    },
    renderPreview() {
      const ctx = context.ctx;
      const selection = context.getSelection?.();

      elements.value.forEach((el) => {
        ctx.save();
        ctx.translate(el.x, el.y);
        ctx.rotate(el.rotation);

        ctx.font = `bold ${el.fontSize}px -apple-system, "PingFang SC", sans-serif`;
        ctx.fillStyle = el.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(el.content, 0, 0);

        if (selection?.id === el.id && selection.type === "text") {
          const { halfW, halfH } = getTextBounds(el);
          drawSelectionFrame(ctx, halfW, halfH);
        }

        ctx.restore();
      });
    },
    async commit() {
      if (elements.value.length === 0) return null;
      const localElements = [...elements.value];
      return context.exportPipeline({
        drawOriginal: true,
        renderFn(ctx, { scaleX, scaleY, scale, imageRect: ir }) {
          localElements.forEach((t) => {
            ctx.save();
            ctx.translate((t.x - ir.x) * scaleX, (t.y - ir.y) * scaleY);
            ctx.rotate(t.rotation);
            ctx.font = `bold ${t.fontSize * scale}px -apple-system, "PingFang SC", sans-serif`;
            ctx.fillStyle = t.color;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(t.content, 0, 0);
            ctx.restore();
          });
        },
      });
    },
    getPanelProps() {
      const selection = context.getSelection?.();
      const activeElement =
        selection?.type === "text"
          ? elements.value.find((item) => item.id === selection.id)
          : null;

      return {
        textInputContent: input.value,
        textColor: activeElement?.color ?? color.value,
        textFontSize: activeElement?.fontSize ?? fontSize.value,
        textSizes: sizes,
        drawColors: ["#FFFFFF", "#000000", "#E63946", "#FFD166", "#4ECDC4"],
        elements: elements.value,
      };
    },
    getPanelActions() {
      return {
        setInput(value) {
          input.value = value;
        },
        setColor(value) {
          color.value = value;
          const selection = context.getSelection?.();
          if (selection?.type === "text" && selection.id) {
            const target = elements.value.find(
              (item) => item.id === selection.id
            );
            if (target) {
              target.color = value;
              context.requestRender?.();
            }
          }
        },
        setFontSize(value) {
          fontSize.value = Number(value);
          const selection = context.getSelection?.();
          if (selection?.type === "text" && selection.id) {
            const target = elements.value.find(
              (item) => item.id === selection.id
            );
            if (target) {
              target.fontSize = Number(value);
              context.requestRender?.();
            }
          }
        },
        addText() {
          if (!input.value.trim()) return;
          const imageRect = context.getImageRect?.();
          const id = Date.now();
          elements.value.push({
            id,
            content: input.value.trim(),
            x: imageRect.x + imageRect.w / 2,
            y: imageRect.y + imageRect.h / 2,
            fontSize: fontSize.value,
            color: color.value,
            rotation: 0,
          });
          context.setSelection?.({ id, type: "text" });
          context.requestRender?.();
        },
      };
    },
  };
}
