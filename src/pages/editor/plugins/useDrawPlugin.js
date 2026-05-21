import { ref } from "vue";

/**
 * 画笔插件 — 自含渲染和导出
 * 通过 context.ctx 直接绘制预览，通过 context.exportPipeline overlay 模式导出。
 */
export function useDrawPlugin(context) {
  const isDrawing = ref(false);
  const currentPath = ref([]);
  const paths = ref([]);
  const color = ref("#FFFFFF");
  const width = ref(3);
  const colors = ["#FFFFFF", "#000000", "#E63946", "#FFD166", "#4ECDC4"];
  const widths = [2, 5, 10];

  function drawStroke(ctx, stroke) {
    if (stroke.points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  return {
    key: "draw",
    requiresConfirm: true,
    supportsLivePreview: true,
    activate() {
      isDrawing.value = false;
      currentPath.value = [];
      paths.value = [];
    },
    deactivate() {},
    reset() {
      isDrawing.value = false;
      currentPath.value = [];
      paths.value = [];
    },
    onTouchStart(event) {
      const touch = event.touches?.[0] || event;
      isDrawing.value = true;
      currentPath.value = [{ x: touch.x, y: touch.y }];
    },
    onTouchMove(event) {
      if (!isDrawing.value) return;
      const touch = event.touches?.[0] || event;
      currentPath.value.push({ x: touch.x, y: touch.y });
      context.requestRender?.();
    },
    onTouchEnd() {
      if (isDrawing.value && currentPath.value.length > 1) {
        paths.value.push({
          points: [...currentPath.value],
          color: color.value,
          width: width.value,
        });
      }
      isDrawing.value = false;
      currentPath.value = [];
      context.requestRender?.();
    },
    renderPreview() {
      const ctx = context.ctx;
      paths.value.forEach((stroke) => drawStroke(ctx, stroke));
      if (currentPath.value.length > 1) {
        drawStroke(ctx, {
          points: currentPath.value,
          color: color.value,
          width: width.value,
        });
      }
    },
    async commit() {
      if (paths.value.length === 0) return null;
      return context.exportPipeline({
        drawOriginal: true,
        renderFn(ctx, { scaleX, scaleY, imageRect: ir }) {
          paths.value.forEach((stroke) => {
            if (stroke.points.length < 2) return;
            ctx.save();
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.width * Math.max(scaleX, scaleY);
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.beginPath();
            ctx.moveTo(
              (stroke.points[0].x - ir.x) * scaleX,
              (stroke.points[0].y - ir.y) * scaleY
            );
            for (let i = 1; i < stroke.points.length; i++) {
              ctx.lineTo(
                (stroke.points[i].x - ir.x) * scaleX,
                (stroke.points[i].y - ir.y) * scaleY
              );
            }
            ctx.stroke();
            ctx.restore();
          });
        },
      });
    },
    getPanelProps() {
      return {
        color: color.value,
        width: width.value,
        colors,
        widths,
        paths: paths.value,
      };
    },
    getPanelActions() {
      return {
        setColor: (value) => {
          color.value = value;
          context.requestRender?.();
        },
        setWidth: (value) => {
          width.value = value;
          context.requestRender?.();
        },
      };
    },
  };
}
