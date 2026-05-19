<template>
  <!-- 相机取景底层 -->
  <camera
    id="camera"
    :device-position="devicePosition"
    :flash="flash"
    mode="normal"
    @error="onCameraError"
    @initdone="onCameraInitDone"
    style="width: 100vw; height: calc(100vh - 200rpx); position: fixed; top: 0; left: 0;"
  ></camera>

  <!-- 隐藏的 canvas，用于水印合成 -->
  <canvas
    type="2d"
    id="watermarkCanvas"
    style="position: fixed; left: -9999px; top: -9999px; width: 1080px; height: 1920px;"
  ></canvas>

  <!-- 实时水印 Canvas（可见，覆盖 camera 区域） -->
  <canvas
    type="2d"
    id="displayCanvas"
    class="display-canvas"
  ></canvas>

  <!-- 缩放按钮 -->
  <view class="zoom-bar">
    <view
      v-for="level in [1, 2, 3]"
      :key="level"
      :class="['zoom-btn', currentZoom === level ? 'zoom-active' : '']"
      @tap="onZoomChange(level)"
    >
      {{ level }}x
    </view>
  </view>

  <!-- 顶部功能栏 -->
  <view class="top-bar">
    <view class="top-bar-inner">
      <view class="top-btn" @tap="onToggleFlash">
        <view :class="['top-icon', 'flash-icon', flash !== 'off' ? 'top-icon--active' : '']">
          <text class="iconfont" style="font-size: var(--icon-size-md);">{{ ICON_GLYPHS.flash }}</text>
          <text v-if="flash === 'auto'" class="flash-badge flash-badge--auto">A</text>
          <text v-if="flash === 'off'" class="flash-badge flash-badge--off">×</text>
        </view>
      </view>
      <view class="top-btn" @tap="onToggleWatermark">
        <view :class="['top-icon', watermarkEnabled ? 'top-icon--active' : '']">
          <text class="iconfont" style="font-size: var(--icon-size-md);">{{ ICON_GLYPHS.watermark }}</text>
        </view>
      </view>
      <view v-if="watermarkEnabled" class="top-btn" @tap="onToggleCamera">
        <view class="top-icon">
          <text class="iconfont" style="font-size: var(--icon-size-md);">{{ ICON_GLYPHS.cameraFlip }}</text>
        </view>
      </view>
    </view>
  </view>

  <!-- 底部操作栏 -->
  <view class="bottom-bar safe-area-bottom">
    <view class="bottom-bar-inner">
      <!-- 从相册选择 -->
      <view class="action-btn" @tap="onChooseFromAlbum">
        <view class="action-icon"><text class="iconfont" style="font-size: var(--icon-size-md);">{{ ICON_GLYPHS.album }}</text></view>
        <view class="action-label">从相册选择</view>
      </view>
      <!-- 拍摄按钮 -->
      <view class="shutter-wrapper"
        @touchstart="onShutterStart"
        @touchend="onShutterEnd"
        @touchcancel="onShutterEnd"
      >
        <canvas type="2d" id="progressCanvas" v-if="isRecording"
          class="progress-canvas"
        ></canvas>
        <view :class="['shutter-btn', isRecording ? 'shutter-recording' : '']">
          <view :class="isRecording ? 'shutter-video-inner' : 'shutter-inner'"></view>
        </view>
      </view>
      <!-- 自定义水印（水印开启时） -->
      <view v-if="watermarkEnabled" class="action-btn" @tap="onShowWatermarkModal">
        <view class="action-icon"><text class="iconfont" style="font-size: var(--icon-size-md);">{{ ICON_GLYPHS.customWatermark }}</text></view>
        <view class="action-label">自定义水印</view>
      </view>
      <!-- 前后切换（水印关闭时） -->
      <view v-else class="action-btn" @tap="onToggleCamera">
        <view class="action-icon"><text class="iconfont" style="font-size: var(--icon-size-md);">{{ ICON_GLYPHS.cameraFlip }}</text></view>
        <view class="action-label">前后切换</view>
      </view>
    </view>
  </view>

  <!-- 自定义水印弹窗 -->
  <view v-if="showWatermarkModal" class="modal-mask" @tap="onHideWatermarkModal">
    <view class="modal-content" @tap.stop="">
      <view class="modal-title">自定义水印</view>
      <input
        class="modal-input"
        placeholder="输入水印文字"
        :value="watermarkText"
        @input="onWatermarkInput"
        @confirm="onConfirmWatermark"
      />
      <view class="modal-actions">
        <view class="modal-btn modal-btn-secondary" @tap="onClearWatermark">清除</view>
        <view class="modal-btn modal-btn-primary" @tap="onConfirmWatermark">确认</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { useCamera } from './hooks/useCamera'
import { ICON_GLYPHS } from '../../constants/iconGlyphs'

const {
  flash,
  devicePosition,
  isRecording,
  watermarkEnabled,
  currentZoom,
  watermarkText,
  currentTime,
  currentDate,
  currentWeekday,
  currentLocation,
  showWatermarkModal,
  onShutterStart,
  onShutterEnd,
  onChooseFromAlbum,
  onToggleFlash,
  onToggleCamera,
  onShowWatermarkModal,
  onHideWatermarkModal,
  onWatermarkInput,
  onClearWatermark,
  onConfirmWatermark,
  onCameraError,
  onToggleWatermark,
  onZoomChange,
  onCameraInitDone,
} = useCamera()
</script>

<style scoped>
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

/* 实时水印 Canvas（覆盖整个 camera 区域） */
.display-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: calc(100vh - 200rpx);
  z-index: 10;
  pointer-events: none;
}

/* 顶部功能栏 */
.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding-top: calc(env(safe-area-inset-top) + 100rpx);
}

.top-bar-inner {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 48rpx;
  padding: 16rpx 32rpx;
}

.top-btn {
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.top-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  transition: color 200ms ease;
}

.top-icon--active {
  color: #FFD700;
}

.top-icon-label {
  font-size: 18rpx;
  color: #FFD700;
  margin-top: 4rpx;
}

.flash-icon {
  position: relative;
}

.flash-badge {
  position: absolute;
  bottom: -2rpx;
  right: -8rpx;
  font-size: 18rpx;
  font-weight: 700;
  font-family: -apple-system, sans-serif;
  line-height: 1;
}

.flash-badge--auto {
  color: #FFD700;
}

.flash-badge--off {
  color: rgba(255, 255, 255, 0.5);
  font-size: 22rpx;
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  background-color: rgba(0, 0, 0, 0.9);
}

.bottom-bar-inner {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
  padding: 24rpx 40rpx 40rpx;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  width: 140rpx;
}

.action-icon {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  color: #FFFFFF;
}

.action-label {
  font-size: 20rpx;
  color: var(--color-text-secondary);
  letter-spacing: 0.5rpx;
}

/* 快门按钮 */
.shutter-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.shutter-btn {
  width: 120rpx;
  height: 120rpx;
  border-radius: var(--radius-full);
  border: 5rpx solid #FF0000;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
  background-color: transparent;
  transition: all 0.2s ease;
}

.shutter-inner {
  width: 100rpx;
  height: 100rpx;
  border-radius: var(--radius-full);
  background-color: #CC0000;
}

.shutter-video-inner {
  width: 44rpx;
  height: 44rpx;
  border-radius: var(--radius-sm);
  background-color: #CC0000;
}

.shutter-recording {
  border-color: #FF0000;
}

/* Canvas 进度环 */
.progress-canvas {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 152rpx;
  height: 152rpx;
  z-index: 1;
}

/* 自定义水印弹窗 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  width: 580rpx;
  background-color: #1C1C1E;
  border-radius: var(--radius-lg);
  padding: 40rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.08);
}

.modal-title {
  color: var(--color-text-primary);
  font-size: 34rpx;
  font-weight: 600;
  margin-bottom: 32rpx;
  text-align: center;
}

.modal-input {
  width: 100%;
  height: 80rpx;
  background-color: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-md);
  padding: 0 24rpx;
  color: var(--color-text-primary);
  font-size: 28rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.12);
  box-sizing: border-box;
}

.modal-actions {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-top: 32rpx;
  gap: 20rpx;
}

.modal-btn {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  font-size: 28rpx;
  font-weight: 500;
}

.modal-btn-secondary {
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--color-text-secondary);
}

.modal-btn-primary {
  background-color: var(--color-accent-red);
  color: var(--color-text-primary);
}

/* 缩放按钮 */
.zoom-bar {
  position: fixed;
  bottom: calc(200rpx + 48rpx);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 16rpx;
  z-index: 15;
}

.zoom-btn {
  height: 64rpx;
  min-width: 96rpx;
  padding: 0 28rpx;
  border-radius: 32rpx;
  background: rgba(0, 0, 0, 0.5);
  border: 2rpx solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(4px);
}

.zoom-active {
  background: rgba(255, 255, 255, 0.2);
  border-color: #FFD700;
  color: #FFD700;
}
</style>
