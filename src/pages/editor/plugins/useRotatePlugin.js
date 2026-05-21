import { ref } from "vue";

/**
 * 旋转插件 — 自含渲染和导出
 * 通过 context.ctx 直接绘制预览，通过 context.exportPipeline 导出。
 */
export function useRotatePlugin(context) {
  const angle = ref(0);
  let cachedImage = null;

  function normalize(next) {
    let value = ((next % 360) + 360) % 360;
    if (value > 180) value -= 360;
    return value;
  }

  function updateAngle(next) {
    angle.value = normalize(next);
    context.requestRender?.();
  }

  function loadSnapshot() {
    const snapshot = context.getActiveSnapshot?.();
    if (!snapshot) return;
    context.loadImage?.(snapshot.tempFilePath).then((img) => {
      cachedImage = img;
      context.requestRender?.();
    });
  }

  return {
    key: "rotate",
    requiresConfirm: true,
    supportsLivePreview: true,
    activate() {
      angle.value = 0;
      cachedImage = null;
      loadSnapshot();
    },
    deactivate() {},
    reset() {
      angle.value = 0;
    },
    onTouchStart() {},
    onTouchMove() {},
    onTouchEnd() {},
    renderPreview() {
      if (angle.value === 0 || !cachedImage) return;
      const ctx = context.ctx;
      const ir = context.getImageRect?.();
      if (!ir) return;
      const cx = context.canvasWidth.value / 2;
      const cy = context.canvasHeight.value / 2;

      ctx.clearRect(
        0,
        0,
        context.canvasWidth.value,
        context.canvasHeight.value
      );
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((angle.value * Math.PI) / 180);
      ctx.drawImage(cachedImage, -ir.w / 2, -ir.h / 2, ir.w, ir.h);
      ctx.restore();
    },
    async commit() {
      if (angle.value === 0) return null;

      const snapshot = context.getActiveSnapshot?.();
      const rad = (angle.value * Math.PI) / 180;
      const absCos = Math.abs(Math.cos(rad));
      const absSin = Math.abs(Math.sin(rad));
      const newW = Math.round(
        snapshot.width * absCos + snapshot.height * absSin
      );
      const newH = Math.round(
        snapshot.width * absSin + snapshot.height * absCos
      );

      return context.exportPipeline({
        width: newW,
        height: newH,
        drawOriginal: false,
        async renderFn(ctx) {
          const img =
            cachedImage || (await context.loadImage?.(snapshot.tempFilePath));
          ctx.save();
          ctx.translate(newW / 2, newH / 2);
          ctx.rotate(rad);
          ctx.drawImage(
            img,
            -snapshot.width / 2,
            -snapshot.height / 2,
            snapshot.width,
            snapshot.height
          );
          ctx.restore();
        },
      });
    },
    getPanelProps() {
      return { angle: angle.value };
    },
    getPanelActions() {
      return {
        rotateLeft: () => updateAngle(angle.value - 90),
        rotateRight: () => updateAngle(angle.value + 90),
        changeAngle: (value) => updateAngle(Number(value)),
      };
    },
  };
}
