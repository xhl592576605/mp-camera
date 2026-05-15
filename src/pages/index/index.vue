<template>
  <!-- 相机取景底层 -->
  <camera
    id="camera"
    :device-position="devicePosition"
    :flash="flash"
    mode="normal"
    @error="onCameraError"
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

  <!-- 顶部功能栏 -->
  <view class="top-bar">
    <view class="top-bar-inner">
      <view class="top-btn" @tap="onToggleFlash">
        <view :class="['icon-flash', flash !== 'off' ? 'flash-active' : '']">
          {{ flash === 'off' ? '⚡' : flash === 'auto' ? '⚡A' : '⚡' }}
        </view>
      </view>
      <view class="top-btn" @tap="onToggleCamera">
        <view class="icon-switch">⇄</view>
      </view>
    </view>
  </view>

  <!-- 底部操作栏 -->
  <view class="bottom-bar safe-area-bottom">
    <view class="bottom-bar-inner">
      <!-- 从相册选择 -->
      <view class="action-btn" @tap="onChooseFromAlbum">
        <view class="action-icon">□</view>
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
      <!-- 自定义水印 -->
      <view class="action-btn" @tap="onShowWatermarkModal">
        <view class="action-icon">✦</view>
        <view class="action-label">自定义水印</view>
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
        @confirm="onWatermarkConfirm"
      />
      <view class="modal-actions">
        <view class="modal-btn modal-btn-secondary" @tap="onClearWatermark">清除</view>
        <view class="modal-btn modal-btn-primary" @tap="onConfirmWatermark">确认</view>
      </view>
    </view>
  </view>
</template>

<script>
import { reverseGeocode } from '../../utils/location.js'

const MAX_RECORD_MS = 15000
const LONG_PRESS_MS = 500

export default {
  data() {
    return {
      flash: 'off',
      devicePosition: 'back',
      isRecording: false,
      watermarkText: '',
      currentTime: '',
      currentDate: '',
      currentWeekday: '',
      currentLocation: '',
      showWatermarkModal: false,
    }
  },

  onLoad() {
    this.ctx = uni.createCameraContext()
    this._updateTime()
    this._timer = setInterval(() => {
      this._updateTime()
    }, 1000)
    this._updateLocation()
    setTimeout(() => {
      this._initDisplayCanvas()
    }, 100)
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer)
    this._clearTimers()
  },

  methods: {
    _updateTime() {
      const now = new Date()
      const pad = n => String(n).padStart(2, '0')
      const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
      this.currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
      this.currentDate = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`
      this.currentWeekday = weekdays[now.getDay()]
      this._redrawDisplayCanvas()
    },

    _updateLocation() {
      uni.getLocation({
        type: 'gcj02',
        success: (res) => {
          reverseGeocode(res.latitude, res.longitude).then((addr) => {
            this.currentLocation = addr
            this._redrawDisplayCanvas()
          })
        },
        fail: (err) => {
          if (err.errMsg && err.errMsg.includes('auth deny')) {
            uni.showModal({
              title: '位置权限',
              content: '需要获取您的位置信息用于水印显示，是否前往设置开启？',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  uni.openSetting({
                    success: (settingRes) => {
                      if (settingRes.authSetting['scope.userLocation']) {
                        this._updateLocation()
                      }
                    }
                  })
                }
              }
            })
          }
          this.currentLocation = ''
          this._redrawDisplayCanvas()
        }
      })
    },

    // --- displayCanvas ---

    _initDisplayCanvas() {
      const query = uni.createSelectorQuery().in(this)
      query.select('#displayCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0]) return
          const canvas = res[0].node
          const dpr = uni.getSystemInfoSync().pixelRatio || 2
          canvas.width = res[0].width * dpr
          canvas.height = res[0].height * dpr
          const ctx = canvas.getContext('2d')
          ctx.scale(dpr, dpr)
          this._displayCtx = ctx
          this._displayW = res[0].width
          this._displayH = res[0].height
          this._redrawDisplayCanvas()
        })
    },

    _redrawDisplayCanvas() {
      if (!this._displayCtx) return
      const ctx = this._displayCtx
      ctx.clearRect(0, 0, this._displayW, this._displayH)
      const scale = this._displayW / 750
      const padLeft = 32 * scale
      const padBottom = 80 * scale
      const wmH = this._calcWatermarkHeight(scale)
      ctx.save()
      ctx.translate(padLeft, this._displayH - wmH - padBottom)
      this._drawWatermark(ctx, scale)
      ctx.restore()
    },

    // --- 水印高度计算（用于从底部定位） ---

    _calcWatermarkHeight(scale) {
      const rowGap = 5 * scale
      const badgeH = 22 * scale * 1.5 + 4 * scale * 2
      const timeH = 24 * scale * 1.5 + 2 * scale * 2
      let h = Math.max(badgeH, timeH) + rowGap
      h += 18 * scale * 1.5 + rowGap
      if (this.currentLocation) h += 18 * scale * 1.5 + rowGap
      if (this.watermarkText) h += 5 * scale * 2 + 20 * scale * 1.5
      return h
    },

    // --- 统一水印绘制（从 0,0 开始，调用方通过 translate 定位） ---

    _drawWatermark(ctx, scale) {
      let curY = 0
      const x = 0
      const rowGap = 5 * scale
      const innerGap = 10 * scale

      // --- 打卡 Badge ---
      const badgeFontSize = 22 * scale
      ctx.font = `bold ${badgeFontSize}px -apple-system, sans-serif`
      const badgeTextWidth = ctx.measureText('打卡').width
      const badgePadX = 14 * scale
      const badgePadY = 4 * scale
      const badgeW = badgeTextWidth + badgePadX * 2
      const badgeH = badgeFontSize * 1.5 + badgePadY * 2
      const badgeR = 8 * scale

      ctx.fillStyle = '#FFD700'
      this._roundRect(ctx, x, curY, badgeW, badgeH, badgeR)
      ctx.fill()
      ctx.fillStyle = '#FFFFFF'
      ctx.textBaseline = 'middle'
      ctx.fillText('打卡', x + badgePadX, curY + badgeH / 2)

      // --- 时间 ---
      const timeFontSize = 24 * scale
      const timeText = this.currentTime
      ctx.font = `500 ${timeFontSize}px "SF Mono", Menlo, monospace`
      const timeTextWidth = ctx.measureText(timeText).width
      const timePadX = 14 * scale
      const timePadY = 2 * scale
      const timeW = timeTextWidth + timePadX * 2
      const timeH = timeFontSize * 1.5 + timePadY * 2
      const timeR = 4 * scale
      const timeX = x + badgeW + innerGap

      ctx.fillStyle = '#FFFFFF'
      this._roundRect(ctx, timeX, curY, timeW, timeH, timeR)
      ctx.fill()
      ctx.fillStyle = '#000000'
      ctx.textBaseline = 'middle'
      ctx.fillText(timeText, timeX + timePadX, curY + timeH / 2)

      curY += Math.max(badgeH, timeH) + rowGap

      // --- 日期 + 星期 ---
      const dateFontSize = 18 * scale
      ctx.fillStyle = '#999999'
      ctx.font = `${dateFontSize}px -apple-system, sans-serif`
      ctx.textBaseline = 'top'
      ctx.fillText(`${this.currentDate} ${this.currentWeekday}`, x, curY)
      curY += dateFontSize * 1.5 + rowGap

      // --- 位置 ---
      if (this.currentLocation) {
        const locFontSize = 18 * scale
        ctx.fillStyle = '#999999'
        ctx.font = `${locFontSize}px -apple-system, sans-serif`
        ctx.textBaseline = 'top'
        ctx.fillText(this.currentLocation, x, curY)
        curY += locFontSize * 1.5 + rowGap
      }

      // --- 自定义水印 ---
      if (this.watermarkText) {
        const customFontSize = 20 * scale
        const lineGap = 5 * scale
        curY += lineGap
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
        ctx.lineWidth = 1 * scale
        ctx.beginPath()
        ctx.moveTo(x, curY)
        ctx.lineTo(x + 300 * scale, curY)
        ctx.stroke()
        curY += lineGap

        ctx.fillStyle = '#FFFFFF'
        ctx.font = `${customFontSize}px -apple-system, sans-serif`
        ctx.textBaseline = 'top'
        ctx.fillText(this.watermarkText, x, curY)
      }
    },

    _roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + w - r, y)
      ctx.arcTo(x + w, y, x + w, y + r, r)
      ctx.lineTo(x + w, y + h - r)
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
      ctx.lineTo(x + r, y + h)
      ctx.arcTo(x, y + h, x, y + h - r, r)
      ctx.lineTo(x, y + r)
      ctx.arcTo(x, y, x + r, y, r)
      ctx.closePath()
    },

    onToggleFlash() {
      const order = ['off', 'auto', 'on']
      const idx = order.indexOf(this.flash)
      this.flash = order[(idx + 1) % order.length]
    },

    onToggleCamera() {
      this.devicePosition = this.devicePosition === 'back' ? 'front' : 'back'
    },

    onChooseFromAlbum() {
      uni.chooseMedia({
        count: 1,
        mediaType: ['image', 'video'],
        sourceType: ['album'],
        success: (res) => {
          const file = res.tempFiles[0]
          if (file.fileType === 'video') {
            uni.navigateTo({
              url: `/pages/preview/preview?type=video&src=${encodeURIComponent(file.tempFilePath)}`
            })
          } else {
            uni.navigateTo({
              url: `/pages/editor/editor?src=${encodeURIComponent(file.tempFilePath)}`
            })
          }
        }
      })
    },

    // --- 快门交互 ---

    onShutterStart() {
      this._longPressTimer = setTimeout(() => {
        this._startRecording()
      }, LONG_PRESS_MS)
    },

    onShutterEnd() {
      if (this._longPressTimer) {
        clearTimeout(this._longPressTimer)
        this._longPressTimer = null
      }
      if (this.isRecording) {
        this._stopRecording()
      } else {
        this._takePhoto()
      }
    },

    _takePhoto() {
      this.ctx.takePhoto({
        quality: 'high',
        success: (res) => {
          this._composeWatermark(res.tempImagePath)
        },
        fail: (err) => {
          console.error('takePhoto fail', err)
          uni.showToast({ title: '拍照失败', icon: 'none' })
        }
      })
    },

    _startRecording() {
      this.isRecording = true
      this.progressDeg = 0
      this._recordStartMs = Date.now()
      this._ringCtx = null
      this.ctx.startRecord({
        success: () => {
          console.log('startRecord success')
        },
        fail: (err) => {
          console.error('startRecord fail', err)
          this.isRecording = false
          uni.showToast({ title: '录像启动失败', icon: 'none' })
        }
      })
      setTimeout(() => {
        this._initProgressCanvas()
      }, 50)
      this._progressTimer = setInterval(() => {
        const elapsed = Date.now() - this._recordStartMs
        const ratio = Math.min(elapsed / MAX_RECORD_MS, 1)
        const deg = Math.round(ratio * 360)
        this._drawProgressRing(deg)
        if (ratio >= 1) {
          this._stopRecording()
        }
      }, 100)
    },

    _stopRecording() {
      this._clearTimers()
      this._ringCtx = null
      this.ctx.stopRecord({
        success: (res) => {
          this.isRecording = false
          uni.navigateTo({
            url: `/pages/preview/preview?type=video&thumbSrc=${encodeURIComponent(res.tempThumbPath)}&src=${encodeURIComponent(res.tempVideoPath)}`
          })
        },
        fail: (err) => {
          console.error('stopRecord fail', err)
          this.isRecording = false
          uni.showToast({ title: '录像停止失败', icon: 'none' })
        }
      })
    },

    _initProgressCanvas() {
      const query = uni.createSelectorQuery().in(this)
      query.select('#progressCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0]) return
          const canvas = res[0].node
          const dpr = uni.getSystemInfoSync().pixelRatio || 2
          canvas.width = res[0].width * dpr
          canvas.height = res[0].height * dpr
          this._ringCanvas = canvas
          this._ringCtx = canvas.getContext('2d')
          this._ringCtx.scale(dpr, dpr)
          this._ringDisplaySize = res[0].width
        })
    },

    _drawProgressRing(deg) {
      if (!this._ringCtx) return
      const ctx = this._ringCtx
      const size = this._ringDisplaySize || 76
      const center = size / 2
      const radius = center - 4

      ctx.clearRect(0, 0, size, size)
      ctx.beginPath()
      ctx.arc(center, center, radius, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.lineWidth = 3
      ctx.stroke()

      if (deg > 0) {
        const startAngle = -Math.PI / 2
        const endAngle = startAngle + (deg / 360) * Math.PI * 2
        ctx.beginPath()
        ctx.arc(center, center, radius, startAngle, endAngle)
        ctx.strokeStyle = '#FF0000'
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.stroke()
      }
    },

    _clearTimers() {
      if (this._longPressTimer) {
        clearTimeout(this._longPressTimer)
        this._longPressTimer = null
      }
      if (this._progressTimer) {
        clearInterval(this._progressTimer)
        this._progressTimer = null
      }
    },

    // --- 水印弹窗 ---

    onShowWatermarkModal() {
      this.showWatermarkModal = true
    },

    onHideWatermarkModal() {
      this.showWatermarkModal = false
    },

    onWatermarkInput(e) {
      this._inputValue = e.detail.value
    },

    onClearWatermark() {
      this._inputValue = ''
      this.watermarkText = ''
      this.showWatermarkModal = false
      this._redrawDisplayCanvas()
    },

    onConfirmWatermark() {
      this.watermarkText = this._inputValue
      this.showWatermarkModal = false
      this._redrawDisplayCanvas()
    },

    onWatermarkConfirm(e) {
      this.watermarkText = e.detail.value
      this.showWatermarkModal = false
      this._redrawDisplayCanvas()
    },

    // --- Canvas 水印合成 ---

    _composeWatermark(imagePath) {
      uni.getImageInfo({
        src: imagePath,
        success: (info) => {
          this._drawOnCanvas(imagePath, info.width, info.height)
        },
        fail: () => {
          this._navigateToPreview('image', imagePath)
        }
      })
    },

    _drawOnCanvas(imagePath, cw, ch) {
      const query = uni.createSelectorQuery().in(this)
      query.select('#watermarkCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0]) {
            this._navigateToPreview('image', imagePath)
            return
          }
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          canvas.width = cw
          canvas.height = ch

          const img = canvas.createImage()
          img.src = imagePath
          img.onload = () => {
            ctx.drawImage(img, 0, 0, cw, ch)
            const scale = cw / 750
            const padLeft = 32 * scale
            const padBottom = 80 * scale
            const wmH = this._calcWatermarkHeight(scale)
            ctx.save()
            ctx.translate(padLeft, ch - wmH - padBottom)
            this._drawWatermark(ctx, scale)
            ctx.restore()
            uni.canvasToTempFilePath({
              canvas,
              success: (out) => {
                this._navigateToPreview('image', out.tempFilePath)
              },
              fail: () => {
                this._navigateToPreview('image', imagePath)
              }
            })
          }
          img.onerror = () => {
            this._navigateToPreview('image', imagePath)
          }
        })
    },

    _navigateToPreview(type, src) {
      if (type === 'video') {
        uni.navigateTo({
          url: `/pages/preview/preview?type=video&src=${encodeURIComponent(src)}`
        })
      } else {
        uni.navigateTo({
          url: `/pages/editor/editor?src=${encodeURIComponent(src)}`
        })
      }
    },

    onCameraError(e) {
      console.error('camera error', e.detail)
      uni.showToast({ title: '相机出错，请检查权限', icon: 'none' })
    }
  }
}
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

.icon-flash {
  font-size: 44rpx;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1;
}

.flash-active {
  color: #FFD700;
}

.icon-switch {
  font-size: 40rpx;
  color: #FFFFFF;
  line-height: 1;
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
  font-size: 32rpx;
  color: #FFFFFF;
  line-height: 1;
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
</style>
