<template>
  <view class="editor-page">
    <!-- ===== 顶部栏 ===== -->
    <view class="top-bar">
      <view class="top-close" @tap="onCancel">
        <text class="top-close-icon">✕</text>
      </view>
    </view>

    <!-- ===== Canvas 区域 ===== -->
    <view class="canvas-area">
      <canvas
        type="2d"
        id="editorCanvas"
        class="editor-canvas"
        @touchstart="onCanvasTouchStart"
        @touchmove="onCanvasTouchMove"
        @touchend="onCanvasTouchEnd"
      ></canvas>
    </view>

    <!-- ===== 操作栏 ===== -->
    <view class="action-bar">
      <view class="action-group" :class="{ 'is-hidden': isEditing && activeTool !== 'sticker' && activeTool !== 'text' }">
        <view class="action-btn" :style="{ opacity: canUndo ? 1 : 0.25 }" @tap="onUndo">
          <text class="action-icon">↩</text>
          <text class="action-label">撤销</text>
        </view>
        <view class="action-btn" :style="{ opacity: canRedo ? 1 : 0.25 }" @tap="onRedo">
          <text class="action-icon">↪</text>
          <text class="action-label">重做</text>
        </view>
        <view class="action-btn" @tap="onSave">
          <text class="action-icon">💾</text>
          <text class="action-label">保存</text>
        </view>
      </view>
      <view class="action-group" :class="{ 'is-hidden': !isEditing || activeTool === 'sticker' || activeTool === 'text' }">
        <view class="action-btn action-btn-cancel" @tap="onCancelTool">
          <text class="action-icon">✕</text>
          <text class="action-label">取消</text>
        </view>
        <view class="action-btn action-btn-confirm" @tap="onConfirmTool">
          <text class="action-icon">✓</text>
          <text class="action-label">确认</text>
        </view>
      </view>
    </view>

    <!-- ===== 工具栏 + 子面板 ===== -->
    <view class="bottom-bar safe-area-bottom">
      <EditorToolbar
        :items="toolbarItems"
        :active-tool="activeTool"
        @select="selectTool"
      />

      <view v-if="activeTool" class="panel-divider"></view>

      <!-- 旋转面板 -->
      <RotateToolPanel
        v-if="activeTool === 'rotate'"
        :angle="rotatePanelProps.angle"
        @rotateLeft="rotatePanelActions.rotateLeft"
        @rotateRight="rotatePanelActions.rotateRight"
        @changeAngle="rotatePanelActions.changeAngle"
      />

      <!-- 裁剪面板 -->
      <CropToolPanel
        v-if="activeTool === 'crop'"
        :ratio="cropPanelProps.ratio"
        :ratios="cropPanelProps.ratios"
        @setRatio="cropPanelActions.setRatio"
      />

      <!-- 画笔面板 -->
      <DrawToolPanel
        v-if="activeTool === 'draw'"
        :color="drawPanelProps.color"
        :width="drawPanelProps.width"
        :colors="drawPanelProps.colors"
        :widths="drawPanelProps.widths"
        @setColor="drawPanelActions.setColor"
        @setWidth="drawPanelActions.setWidth"
      />

      <!-- 贴纸面板 -->
      <StickerToolPanel
        v-if="activeTool === 'sticker'"
        :sticker-list="stickerPanelProps.stickerList"
        @addSticker="stickerPanelActions.addSticker"
      />

      <!-- 文字面板 -->
      <TextToolPanel
        v-if="activeTool === 'text'"
        :text-input-content="textPanelProps.textInputContent"
        :text-color="textPanelProps.textColor"
        :text-font-size="textPanelProps.textFontSize"
        :text-sizes="textPanelProps.textSizes"
        :draw-colors="textPanelProps.drawColors"
        @setInput="textPanelActions.setInput"
        @setColor="textPanelActions.setColor"
        @setFontSize="textPanelActions.setFontSize"
        @addText="textPanelActions.addText"
      />
    </view>

    <!-- 隐藏的导出 Canvas -->
    <canvas
      type="2d"
      id="exportCanvas"
      style="position:fixed;left:-9999px;top:-9999px;width:100px;height:100px;"
    ></canvas>
  </view>
</template>

<script setup>
import EditorToolbar from './components/EditorToolbar.vue'
import RotateToolPanel from './components/RotateToolPanel.vue'
import CropToolPanel from './components/CropToolPanel.vue'
import DrawToolPanel from './components/DrawToolPanel.vue'
import StickerToolPanel from './components/StickerToolPanel.vue'
import TextToolPanel from './components/TextToolPanel.vue'
import { useEditor } from './hooks/useEditor'

const editor = useEditor()

const {
  activeTool,
  isEditing,
  toolbarItems,
  canUndo,
  canRedo,
  selectTool,
  onConfirmTool,
  onCancelTool,
  onUndo,
  onRedo,
  onSave,
  onCancel,
  onCanvasTouchStart,
  onCanvasTouchMove,
  onCanvasTouchEnd,
} = editor

const rotatePanelProps = editor.getPluginPanelProps('rotate')
const rotatePanelActions = editor.getPluginPanelActions('rotate')
const cropPanelProps = editor.getPluginPanelProps('crop')
const cropPanelActions = editor.getPluginPanelActions('crop')
const drawPanelProps = editor.getPluginPanelProps('draw')
const drawPanelActions = editor.getPluginPanelActions('draw')
const stickerPanelProps = editor.getPluginPanelProps('sticker')
const stickerPanelActions = editor.getPluginPanelActions('sticker')
const textPanelProps = editor.getPluginPanelProps('text')
const textPanelActions = editor.getPluginPanelActions('text')
</script>

<style scoped>
/* ═══════════════════════════════════
   编辑器专用设计令牌
   ═══════════════════════════════════ */

.editor-page {
  --e-accent: #E63946;
  --e-surface: rgba(18, 18, 20, 0.92);
  --e-surface-light: rgba(255, 255, 255, 0.06);
  --e-surface-hover: rgba(255, 255, 255, 0.10);
  --e-border: rgba(255, 255, 255, 0.08);
  --e-text: #FAFAFA;
  --e-text-dim: rgba(250, 250, 250, 0.45);
  --e-success: #4cd964;
  --e-danger: #E63946;
  --e-font-mono: "SF Mono", "Menlo", "Courier New", monospace;

  width: 100vw;
  height: 100vh;
  background-color: #000;
  display: flex;
  flex-direction: column;
}

.safe-area-top { padding-top: env(safe-area-inset-top); }
.safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }

/* ── 顶部栏 ── */

.top-bar {
  flex-shrink: 0;
  padding-top: calc(env(safe-area-inset-top) + 100rpx);
  padding-left: 32rpx;
  padding-right: 32rpx;
  padding-bottom: 16rpx;
  background: linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%);
}

.top-close {
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
}

.top-close-icon {
  color: var(--e-text);
  font-size: 28rpx;
}

/* ── Canvas 区域 ── */

.canvas-area {
  flex: 1;
  overflow: hidden;
}

.editor-canvas {
  width: 100%;
  height: 100%;
}

/* ── 操作栏 ── */

.action-bar {
  flex-shrink: 0;
  position: relative;
  height: 100rpx;
  background: #000;
}

.action-group {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 48rpx;
  transition: opacity 200ms ease;
}

.action-group.is-hidden {
  opacity: 0;
  pointer-events: none;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
  padding: 8rpx 20rpx;
  transition: transform 100ms ease;
}

.action-btn:active {
  transform: scale(0.93);
}

.action-icon {
  font-size: 32rpx;
  color: var(--e-text);
}

.action-label {
  font-size: 20rpx;
  color: var(--e-text-dim);
  font-family: var(--e-font-mono);
}

.action-btn-confirm .action-icon {
  color: var(--e-accent);
  text-shadow: 0 0 16rpx rgba(230, 57, 70, 0.5);
  font-weight: bold;
  font-size: 36rpx;
}

.action-btn-confirm .action-label {
  color: var(--e-accent);
  font-weight: 600;
}

/* ── 底部栏 ── */

.bottom-bar {
  flex-shrink: 0;
  background: var(--e-surface);
}

.panel-divider {
  height: 1rpx;
  background: var(--e-border);
  margin: 0 32rpx;
}
</style>

<!-- 子组件共享样式（非 scoped，可穿透到子组件） -->
<style>
/* ── 工具栏 ── */

.tool-bar {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  padding: 16rpx 16rpx 12rpx;
}

.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 12rpx 24rpx;
  border-radius: var(--radius-md);
  transition: background-color 150ms ease;
}

.tool-item.is-active {
  background-color: rgba(255, 255, 255, 0.06);
}

.tool-icon {
  font-size: 40rpx;
  color: rgba(250, 250, 250, 0.45);
  transition: color 150ms ease;
}

.tool-item.is-active .tool-icon {
  color: #E63946;
}

.tool-label {
  font-size: 20rpx;
  color: rgba(250, 250, 250, 0.45);
  transition: color 150ms ease;
}

.tool-item.is-active .tool-label {
  color: #FAFAFA;
}

/* ── 子面板通用 ── */

.sub-panel {
  padding: 20rpx 32rpx 12rpx;
}

.panel-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 12rpx;
}

.panel-row:last-child {
  margin-bottom: 0;
}

.panel-section-label {
  font-size: 22rpx;
  color: rgba(250, 250, 250, 0.45);
  white-space: nowrap;
  min-width: 56rpx;
}

.panel-btn {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 28rpx;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.06);
  transition: background-color 150ms ease, transform 100ms ease;
}

.panel-btn:active {
  transform: scale(0.95);
}

.panel-btn.is-selected {
  background: rgba(230, 57, 70, 0.15);
  border: 1rpx solid rgba(230, 57, 70, 0.4);
}

.panel-btn-primary {
  background: #E63946;
}

.panel-btn-primary .panel-btn-text {
  color: #fff;
  font-weight: 600;
}

.panel-btn-icon {
  font-size: 30rpx;
  color: #FAFAFA;
}

.panel-btn-text {
  font-size: 24rpx;
  color: #FAFAFA;
}

/* ── 旋转面板 ── */

.rotate-value {
  min-width: 120rpx;
  text-align: center;
}

.rotate-number {
  font-family: "SF Mono", "Menlo", "Courier New", monospace;
  font-size: 28rpx;
  color: #FAFAFA;
  letter-spacing: 1rpx;
}

.rotate-slider {
  flex: 1;
  margin: 0 8rpx;
}

/* ── 颜色选择 ── */

.color-list {
  display: flex;
  flex-direction: row;
  gap: 16rpx;
}

.color-swatch {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  border: 3rpx solid transparent;
  transition: transform 200ms ease, border-color 200ms ease;
}

.color-swatch.is-selected {
  border-color: #FAFAFA;
  transform: scale(1.15);
}

/* ── 粗细选择 ── */

.width-list {
  display: flex;
  flex-direction: row;
  gap: 16rpx;
}

.width-swatch {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 2rpx solid transparent;
  transition: border-color 200ms ease;
}

.width-swatch.is-selected {
  border-color: #FAFAFA;
}

.width-dot {
  background: #FAFAFA;
  border-radius: 50%;
}

/* ── 贴纸面板 ── */

.sticker-scroll {
  width: 100%;
  white-space: nowrap;
}

.sticker-list {
  display: flex;
  flex-direction: row;
  gap: 12rpx;
  padding: 4rpx 0;
}

.sticker-item {
  width: 76rpx;
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-md);
  flex-shrink: 0;
  transition: transform 150ms ease, background-color 150ms ease;
}

.sticker-item:active {
  transform: scale(0.9);
  background: rgba(255, 255, 255, 0.10);
}

.sticker-emoji {
  font-size: 40rpx;
}

/* ── 文字面板 ── */

.text-input {
  flex: 1;
  height: 68rpx;
  background: rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-md);
  padding: 0 24rpx;
  color: #FAFAFA;
  font-size: 26rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.08);
  box-sizing: border-box;
}

/* ── 尺寸选择 ── */

.size-list {
  display: flex;
  flex-direction: row;
  gap: 12rpx;
}
</style>
