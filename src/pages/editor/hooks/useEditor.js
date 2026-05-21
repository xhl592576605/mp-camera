import { ref, computed, nextTick, getCurrentInstance } from "vue";
import { onReady, onLoad } from "@dcloudio/uni-app";
import {
  initCanvas,
  loadImage,
  getImageInfo,
  canvasToTempFilePath,
} from "@/utils/canvas-helper.js";
import { createEditorPluginRegistry } from "../plugins";

export function useEditor(options = {}) {
  const vm = getCurrentInstance();
  const instance = vm ? vm.proxy : null;
  const pluginDefs = options.plugins || createEditorPluginRegistry();

  const src = ref("");
  const activeTool = ref("");
  const isEditing = ref(false);
  const snapshots = ref([]);
  const currentIndex = ref(-1);
  const selectedId = ref(null);
  const selectedType = ref("");
  const canvasWidth = ref(0);
  const canvasHeight = ref(0);

  let canvasNode = null;
  let canvasCtx = null;
  let imageRect = null;
  let snapshotImage = null;

  async function exportPipeline({ width, height, drawOriginal, renderFn }) {
    uni.showLoading({ title: "处理中..." });
    try {
      const snapshot = currentSnapshot.value;
      const ir = imageRect;
      const exportWidth = width ?? snapshot.width;
      const exportHeight = height ?? snapshot.height;

      const exportResult = await initCanvas(instance, "#exportCanvas");
      const canvas = exportResult.canvas;
      const ctx = canvas.getContext("2d");
      canvas.width = exportWidth;
      canvas.height = exportHeight;

      if (drawOriginal !== false) {
        const img = await loadImage(canvas, snapshot.tempFilePath);
        ctx.drawImage(img, 0, 0, snapshot.width, snapshot.height);
      }

      await renderFn(ctx, {
        canvas,
        imageRect: ir,
        snapshotWidth: snapshot.width,
        snapshotHeight: snapshot.height,
        scaleX: snapshot.width / ir.w,
        scaleY: snapshot.height / ir.h,
        scale: Math.max(snapshot.width / ir.w, snapshot.height / ir.h),
      });

      const newFilePath = await canvasToTempFilePath(canvas);
      return {
        tempFilePath: newFilePath,
        width: exportWidth,
        height: exportHeight,
      };
    } catch (err) {
      console.error("Export failed:", err);
      uni.showToast({ title: "处理失败", icon: "none" });
      return null;
    } finally {
      uni.hideLoading();
    }
  }

  function buildPluginContext() {
    return {
      get ctx() {
        return canvasCtx;
      },
      canvasWidth,
      canvasHeight,
      getImageRect: () => imageRect,
      getActiveSnapshot: () => currentSnapshot.value,
      requestRender: () => renderPreview(),
      getSelection: () => ({ id: selectedId.value, type: selectedType.value }),
      setSelection: ({ id, type }) => {
        selectedId.value = id;
        selectedType.value = type;
      },
      exportPipeline,
      loadImage: (src) => loadImage(canvasNode, src),
    };
  }

  const pluginInstances = pluginDefs.map((item) => ({
    ...item,
    instance: item.create(buildPluginContext()),
  }));

  const toolbarItems = computed(() =>
    pluginInstances
      .filter((item) => item.visible !== false && item.enabled !== false)
      .sort((a, b) => a.order - b.order)
      .map((item) => ({
        key: item.key,
        label: item.label,
        icon: item.icon,
      }))
  );

  const currentPlugin = computed(
    () =>
      pluginInstances.find((item) => item.key === activeTool.value)?.instance ||
      null
  );

  const activePanelComponent = computed(
    () =>
      pluginInstances.find((item) => item.key === activeTool.value)
        ?.panelComponent || null
  );

  const activePanelProps = computed(
    () => currentPlugin.value?.getPanelProps?.() || {}
  );

  const activePanelActions = computed(
    () => currentPlugin.value?.getPanelActions?.() || {}
  );

  const currentSnapshot = computed(
    () => snapshots.value[currentIndex.value] || null
  );
  const canUndo = computed(() => currentIndex.value > 0);
  const canRedo = computed(
    () => currentIndex.value < snapshots.value.length - 1
  );

  if (options.autoInit !== false) {
    onLoad((options) => {
      src.value = decodeURIComponent(options.src || "");
    });

    onReady(() => {
      _initEditor();
    });
  }

  async function _initEditor() {
    if (!src.value) return;
    try {
      const info = await getImageInfo(src.value);
      snapshots.value = [
        { tempFilePath: src.value, width: info.width, height: info.height },
      ];
      currentIndex.value = 0;

      const result = await initCanvas(instance, "#editorCanvas");
      canvasNode = result.canvas;
      canvasCtx = result.ctx;
      canvasWidth.value = result.width;
      canvasHeight.value = result.height;

      await _loadSnapshotImage();
      _drawCachedSnapshot();
    } catch (err) {
      console.error("Editor init failed:", err);
      uni.showToast({ title: "图片加载失败", icon: "none" });
    }
  }

  function _syncCanvasSize() {
    return new Promise((resolve) => {
      if (!canvasNode) return resolve(false);
      const query = uni.createSelectorQuery().in(instance);
      query
        .select("#editorCanvas")
        .fields({ size: true })
        .exec((res) => {
          if (!res[0]) return resolve(false);
          const { width, height } = res[0];
          if (width < 1 || height < 1) return resolve(false);
          if (width === canvasWidth.value && height === canvasHeight.value)
            return resolve(false);
          const dpr =
            (uni.getWindowInfo
              ? uni.getWindowInfo().pixelRatio
              : uni.getSystemInfoSync().pixelRatio) || 2;
          canvasNode.width = width * dpr;
          canvasNode.height = height * dpr;
          canvasCtx.setTransform(1, 0, 0, 1, 0, 0);
          canvasCtx.scale(dpr, dpr);
          canvasWidth.value = width;
          canvasHeight.value = height;
          resolve(true);
        });
    });
  }

  async function _loadSnapshotImage() {
    const snapshot = currentSnapshot.value;
    if (!snapshot) return;
    snapshotImage = await loadImage(canvasNode, snapshot.tempFilePath);
  }

  function _drawCachedSnapshot() {
    if (!snapshotImage || !canvasCtx) return;
    const ctx = canvasCtx;
    const snapshot = currentSnapshot.value;
    ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);
    const rect = _fitImage(snapshot.width, snapshot.height);
    imageRect = rect;
    ctx.drawImage(snapshotImage, rect.x, rect.y, rect.w, rect.h);
  }

  function _fitImage(imgW, imgH) {
    const scale = Math.min(canvasWidth.value / imgW, canvasHeight.value / imgH);
    const w = imgW * scale;
    const h = imgH * scale;
    return {
      x: (canvasWidth.value - w) / 2,
      y: (canvasHeight.value - h) / 2,
      w,
      h,
    };
  }

  /** 重新渲染当前预览（渲染代理：对插件调用自动包裹 save/restore） */
  async function renderPreview() {
    try {
      if (!canvasCtx) return;
      const rotateProps =
        activeTool.value === "rotate"
          ? currentPlugin.value?.getPanelProps?.()
          : null;
      if (rotateProps && rotateProps.angle !== 0) {
        canvasCtx.save();
        await currentPlugin.value?.renderPreview?.();
        canvasCtx.restore();
      } else {
        _drawCachedSnapshot();
        if (activeTool.value !== "rotate" && currentPlugin.value) {
          canvasCtx.save();
          await currentPlugin.value.renderPreview?.();
          canvasCtx.restore();
        }
      }
    } catch (err) {
      console.error("renderPreview failed:", err);
    }
  }

  async function selectTool(key) {
    if (activeTool.value === key) return;

    if (isEditing.value && currentPlugin.value) {
      currentPlugin.value.reset?.();
      selectedId.value = null;
      selectedType.value = "";
    }

    currentPlugin.value?.deactivate?.();
    activeTool.value = key;
    isEditing.value = true;
    selectedId.value = null;
    selectedType.value = "";
    currentPlugin.value?.activate?.();

    nextTick(() => _syncCanvasSize().then(() => renderPreview()));
  }

  function clearToolState() {
    currentPlugin.value?.reset?.();
    activeTool.value = "";
    isEditing.value = false;
    selectedId.value = null;
    selectedType.value = "";
  }

  async function onConfirmTool() {
    const result = await currentPlugin.value?.commit?.();
    if (result) {
      snapshots.value = snapshots.value.slice(0, currentIndex.value + 1);
      snapshots.value.push(result);
      currentIndex.value = snapshots.value.length - 1;
      await _loadSnapshotImage();
    }
    clearToolState();
    nextTick(() => _syncCanvasSize().then(() => _drawCachedSnapshot()));
  }

  function onCancelTool() {
    clearToolState();
    nextTick(() => _syncCanvasSize().then(() => _drawCachedSnapshot()));
  }

  function onUndo() {
    if (isEditing.value || !canUndo.value) return;
    currentIndex.value -= 1;
    _loadSnapshotImage().then(() => _drawCachedSnapshot());
  }

  function onRedo() {
    if (isEditing.value || !canRedo.value) return;
    currentIndex.value += 1;
    _loadSnapshotImage().then(() => _drawCachedSnapshot());
  }

  function onSave() {
    const snapshot = currentSnapshot.value;
    if (!snapshot) return;
    uni.saveImageToPhotosAlbum({
      filePath: snapshot.tempFilePath,
      success: () => uni.showToast({ title: "已保存到相册", icon: "success" }),
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes("auth deny")) {
          uni.showToast({ title: "请授权访问相册", icon: "none" });
        } else {
          uni.showToast({ title: "保存失败", icon: "none" });
        }
      },
    });
  }

  function _remapOverlayPositions(oldRect) {
    const newRect = imageRect;
    if (!oldRect || !newRect || oldRect.w === 0) return;
    const scale = newRect.w / oldRect.w;

    const elements = currentPlugin.value?.getPanelProps?.()?.elements;
    if (!elements || elements.length === 0) return;

    elements.forEach((el) => {
      el.x = newRect.x + (el.x - oldRect.x) * scale;
      el.y = newRect.y + (el.y - oldRect.y) * scale;
      if (el.type === "image") {
        el.width *= scale;
        el.height *= scale;
      } else {
        el.fontSize *= scale;
      }
    });
  }

  function onStickerCollapseToggle() {
    const oldRect = imageRect ? { ...imageRect } : null;
    nextTick(() =>
      _syncCanvasSize().then(() => {
        _drawCachedSnapshot();
        _remapOverlayPositions(oldRect);
        currentPlugin.value?.renderPreview?.();
      })
    );
  }

  function onCancel() {
    uni.navigateBack();
  }

  function onCanvasTouchStart(event) {
    if (!isEditing.value) return;
    currentPlugin.value?.onTouchStart?.(event);
  }

  function onCanvasTouchMove(event) {
    if (!isEditing.value) return;
    currentPlugin.value?.onTouchMove?.(event);
  }

  function onCanvasTouchEnd(event) {
    if (!isEditing.value) return;
    currentPlugin.value?.onTouchEnd?.(event);
  }

  function getPluginPanelProps(key) {
    const plugin = pluginInstances.find((item) => item.key === key)?.instance;
    return plugin?.getPanelProps?.() || {};
  }

  function getPluginPanelActions(key) {
    const plugin = pluginInstances.find((item) => item.key === key)?.instance;
    return plugin?.getPanelActions?.() || {};
  }

  return {
    activeTool,
    isEditing,
    toolbarItems,
    activePanelComponent,
    activePanelProps,
    activePanelActions,
    canUndo,
    canRedo,
    snapshots,
    currentIndex,
    currentSnapshot,
    selectedId,
    selectedType,
    selectTool,
    clearToolState,
    onConfirmTool,
    onCancelTool,
    onUndo,
    onRedo,
    onSave,
    onStickerCollapseToggle,
    onCancel,
    onCanvasTouchStart,
    onCanvasTouchMove,
    onCanvasTouchEnd,
    getPluginPanelProps,
    getPluginPanelActions,
  };
}
