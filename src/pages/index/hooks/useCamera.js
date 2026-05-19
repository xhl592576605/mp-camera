import { ref, getCurrentInstance } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { reverseGeocode } from '@/utils/location'
import { createCameraPluginRegistry } from '../plugins'

const MAX_RECORD_MS = 15000

export function useCamera(options = {}) {
  const vm = getCurrentInstance()
  const instance = vm ? vm.proxy : null
  const pluginDefs = options.plugins || createCameraPluginRegistry()

  const flash = ref('off')
  const devicePosition = ref('back')
  const isRecording = ref(false)
  const watermarkEnabled = ref(true)
  const currentZoom = ref(1)
  const maxZoom = ref(1)
  const watermarkText = ref('')
  const currentTime = ref('')
  const currentDate = ref('')
  const currentWeekday = ref('')
  const currentLocation = ref('')
  const showWatermarkModal = ref(false)

  let ctx = null
  let _timer = null
  let _longPressTimer = null
  let _progressTimer = null
  let _displayCtx = null
  let _displayW = 0
  let _displayH = 0
  let _ringCanvas = null
  let _ringCtx = null
  let _ringDisplaySize = 0
  let _recordStartMs = 0
  let _inputValue = ''

  const pluginMap = new Map(
    pluginDefs.map(item => [item.key, item.create({
      flash,
      devicePosition,
      isRecording,
      startRecord: () => _startRecording(),
      stopRecord: () => _stopRecording(),
      takePhoto: () => _takePhoto(),
      handlePickedMedia: (file) => _handlePickedMedia(file),
      renderWatermarkPreview: () => _redrawDisplayCanvas(),
    })])
  )

  if (options.autoInit !== false) {
    onLoad(() => {
      ctx = uni.createCameraContext()
      _updateTime()
      _timer = setInterval(() => { _updateTime() }, 1000)
      _updateLocation()
      setTimeout(() => { _initDisplayCanvas() }, 100)
    })

    onUnload(() => {
      if (_timer) clearInterval(_timer)
      _clearTimers()
    })
  }

  function _updateTime() {
    const now = new Date()
    const pad = n => String(n).padStart(2, '0')
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    currentTime.value = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    currentDate.value = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`
    currentWeekday.value = weekdays[now.getDay()]
    _redrawDisplayCanvas()
  }

  function _updateLocation() {
    uni.getLocation({
      type: 'gcj02',
      success: (res) => {
        reverseGeocode(res.latitude, res.longitude).then((addr) => {
          currentLocation.value = addr
          _redrawDisplayCanvas()
        })
      },
      fail: () => {
        currentLocation.value = ''
        _redrawDisplayCanvas()
      },
    })
  }

  function _initDisplayCanvas() {
    if (!instance) return
    const query = uni.createSelectorQuery().in(instance)
    query.select('#displayCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return
        const canvas = res[0].node
        const dpr = (uni.getWindowInfo ? uni.getWindowInfo().pixelRatio : uni.getSystemInfoSync().pixelRatio) || 2
        canvas.width = res[0].width * dpr
        canvas.height = res[0].height * dpr
        const ctx2d = canvas.getContext('2d')
        ctx2d.scale(dpr, dpr)
        _displayCtx = ctx2d
        _displayW = res[0].width
        _displayH = res[0].height
        _redrawDisplayCanvas()
      })
  }

  function _redrawDisplayCanvas() {
    if (!_displayCtx) return
    const ctx2d = _displayCtx
    ctx2d.clearRect(0, 0, _displayW, _displayH)
    if (!watermarkEnabled.value) return
    const scale = _displayW / 750
    const padLeft = 32 * scale
    const padBottom = 80 * scale
    const wmH = _calcWatermarkHeight(scale)
    ctx2d.save()
    ctx2d.translate(padLeft, _displayH - wmH - padBottom)
    _drawWatermark(ctx2d, scale)
    ctx2d.restore()
  }

  function _calcWatermarkHeight(scale) {
    const rowGap = 5 * scale
    const badgeH = 22 * scale * 1.5 + 4 * scale * 2
    const timeH = 24 * scale * 1.5 + 2 * scale * 2
    let h = Math.max(badgeH, timeH) + rowGap
    h += 18 * scale * 1.5 + rowGap
    if (currentLocation.value) h += 18 * scale * 1.5 + rowGap
    if (watermarkText.value) h += 5 * scale * 2 + 20 * scale * 1.5
    return h
  }

  function _drawWatermark(ctx2d, scale) {
    let curY = 0
    const x = 0
    const rowGap = 5 * scale
    const innerGap = 10 * scale

    const badgeFontSize = 22 * scale
    ctx2d.font = `bold ${badgeFontSize}px -apple-system, sans-serif`
    const badgeTextWidth = ctx2d.measureText('打卡').width
    const badgePadX = 14 * scale
    const badgePadY = 4 * scale
    const badgeW = badgeTextWidth + badgePadX * 2
    const badgeH = badgeFontSize * 1.5 + badgePadY * 2
    const badgeR = 8 * scale

    ctx2d.fillStyle = '#FFD700'
    _roundRect(ctx2d, x, curY, badgeW, badgeH, badgeR)
    ctx2d.fill()
    ctx2d.fillStyle = '#FFFFFF'
    ctx2d.textBaseline = 'middle'
    ctx2d.fillText('打卡', x + badgePadX, curY + badgeH / 2)

    const timeFontSize = 24 * scale
    const timeText = currentTime.value
    ctx2d.font = `500 ${timeFontSize}px "SF Mono", Menlo, monospace`
    const timeTextWidth = ctx2d.measureText(timeText).width
    const timePadX = 14 * scale
    const timePadY = 2 * scale
    const timeW = timeTextWidth + timePadX * 2
    const timeH = timeFontSize * 1.5 + timePadY * 2
    const timeR = 4 * scale
    const timeX = x + badgeW + innerGap

    ctx2d.fillStyle = '#FFFFFF'
    _roundRect(ctx2d, timeX, curY, timeW, timeH, timeR)
    ctx2d.fill()
    ctx2d.fillStyle = '#000000'
    ctx2d.textBaseline = 'middle'
    ctx2d.fillText(timeText, timeX + timePadX, curY + timeH / 2)

    curY += Math.max(badgeH, timeH) + rowGap

    const dateFontSize = 18 * scale
    ctx2d.fillStyle = '#999999'
    ctx2d.font = `${dateFontSize}px -apple-system, sans-serif`
    ctx2d.textBaseline = 'top'
    ctx2d.fillText(`${currentDate.value} ${currentWeekday.value}`, x, curY)
    curY += dateFontSize * 1.5 + rowGap

    if (currentLocation.value) {
      const locFontSize = 18 * scale
      ctx2d.fillStyle = '#999999'
      ctx2d.font = `${locFontSize}px -apple-system, sans-serif`
      ctx2d.textBaseline = 'top'
      ctx2d.fillText(currentLocation.value, x, curY)
      curY += locFontSize * 1.5 + rowGap
    }

    if (watermarkText.value) {
      const customFontSize = 20 * scale
      const lineGap = 5 * scale
      curY += lineGap
      ctx2d.strokeStyle = 'rgba(255, 255, 255, 0.15)'
      ctx2d.lineWidth = 1 * scale
      ctx2d.beginPath()
      ctx2d.moveTo(x, curY)
      ctx2d.lineTo(x + 300 * scale, curY)
      ctx2d.stroke()
      curY += lineGap

      ctx2d.fillStyle = '#FFFFFF'
      ctx2d.font = `${customFontSize}px -apple-system, sans-serif`
      ctx2d.textBaseline = 'top'
      ctx2d.fillText(watermarkText.value, x, curY)
    }
  }

  function _roundRect(ctx2d, x, y, w, h, r) {
    ctx2d.beginPath()
    ctx2d.moveTo(x + r, y)
    ctx2d.lineTo(x + w - r, y)
    ctx2d.arcTo(x + w, y, x + w, y + r, r)
    ctx2d.lineTo(x + w, y + h - r)
    ctx2d.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx2d.lineTo(x + r, y + h)
    ctx2d.arcTo(x, y + h, x, y + h - r, r)
    ctx2d.lineTo(x, y + r)
    ctx2d.arcTo(x, y, x + r, y, r)
    ctx2d.closePath()
  }

  function _takePhoto() {
    if (!ctx) return
    ctx.takePhoto({
      quality: 'high',
      success: (res) => {
        _composeWatermark(res.tempImagePath)
      },
      fail: () => {
        uni.showToast({ title: '拍照失败', icon: 'none' })
      },
    })
  }

  function _startRecording() {
    if (!ctx) return
    isRecording.value = true
    _recordStartMs = Date.now()
    _ringCtx = null
    ctx.startRecord({
      fail: () => {
        isRecording.value = false
        uni.showToast({ title: '录像启动失败', icon: 'none' })
      },
    })
    setTimeout(() => { _initProgressCanvas() }, 50)
    _progressTimer = setInterval(() => {
      const elapsed = Date.now() - _recordStartMs
      const ratio = Math.min(elapsed / MAX_RECORD_MS, 1)
      const deg = Math.round(ratio * 360)
      _drawProgressRing(deg)
      if (ratio >= 1) { _stopRecording() }
    }, 100)
  }

  function _stopRecording() {
    if (!ctx) return
    _clearTimers()
    _ringCtx = null
    ctx.stopRecord({
      success: (res) => {
        isRecording.value = false
        uni.navigateTo({
          url: `/pages/preview/preview?type=video&thumbSrc=${encodeURIComponent(res.tempThumbPath)}&src=${encodeURIComponent(res.tempVideoPath)}`,
        })
      },
      fail: () => {
        isRecording.value = false
        uni.showToast({ title: '录像停止失败', icon: 'none' })
      },
    })
  }

  function _initProgressCanvas() {
    if (!instance) return
    const query = uni.createSelectorQuery().in(instance)
    query.select('#progressCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return
        const canvas = res[0].node
        const dpr = (uni.getWindowInfo ? uni.getWindowInfo().pixelRatio : uni.getSystemInfoSync().pixelRatio) || 2
        canvas.width = res[0].width * dpr
        canvas.height = res[0].height * dpr
        _ringCanvas = canvas
        _ringCtx = canvas.getContext('2d')
        _ringCtx.scale(dpr, dpr)
        _ringDisplaySize = res[0].width
      })
  }

  function _drawProgressRing(deg) {
    if (!_ringCtx) return
    const ctx2d = _ringCtx
    const size = _ringDisplaySize || 76
    const center = size / 2
    const radius = center - 4

    ctx2d.clearRect(0, 0, size, size)
    ctx2d.beginPath()
    ctx2d.arc(center, center, radius, 0, Math.PI * 2)
    ctx2d.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx2d.lineWidth = 3
    ctx2d.stroke()

    if (deg > 0) {
      const startAngle = -Math.PI / 2
      const endAngle = startAngle + (deg / 360) * Math.PI * 2
      ctx2d.beginPath()
      ctx2d.arc(center, center, radius, startAngle, endAngle)
      ctx2d.strokeStyle = '#FF0000'
      ctx2d.lineWidth = 3
      ctx2d.lineCap = 'round'
      ctx2d.stroke()
    }
  }

  function _clearTimers() {
    if (_longPressTimer) { clearTimeout(_longPressTimer); _longPressTimer = null }
    if (_progressTimer) { clearInterval(_progressTimer); _progressTimer = null }
  }

  function _composeWatermark(imagePath) {
    uni.getImageInfo({
      src: imagePath,
      success: (info) => {
        _drawOnCanvas(imagePath, info.width, info.height)
      },
      fail: () => {
        uni.navigateTo({ url: `/pages/editor/editor?src=${encodeURIComponent(imagePath)}` })
      },
    })
  }

  function _drawOnCanvas(imagePath, cw, ch) {
    if (!instance) return
    const query = uni.createSelectorQuery().in(instance)
    query.select('#watermarkCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) {
          uni.navigateTo({ url: `/pages/editor/editor?src=${encodeURIComponent(imagePath)}` })
          return
        }
        const canvas = res[0].node
        const ctx2d = canvas.getContext('2d')
        canvas.width = cw
        canvas.height = ch

        const img = canvas.createImage()
        img.src = imagePath
        img.onload = () => {
          ctx2d.drawImage(img, 0, 0, cw, ch)
          if (watermarkEnabled.value) {
            const scale = cw / 750
            const padLeft = 32 * scale
            const padBottom = 80 * scale
            const wmH = _calcWatermarkHeight(scale)
            ctx2d.save()
            ctx2d.translate(padLeft, ch - wmH - padBottom)
            _drawWatermark(ctx2d, scale)
            ctx2d.restore()
          }
          uni.canvasToTempFilePath({
            canvas,
            success: (out) => {
              uni.navigateTo({ url: `/pages/editor/editor?src=${encodeURIComponent(out.tempFilePath)}` })
            },
            fail: () => {
              uni.navigateTo({ url: `/pages/editor/editor?src=${encodeURIComponent(imagePath)}` })
            },
          })
        }
        img.onerror = () => {
          uni.navigateTo({ url: `/pages/editor/editor?src=${encodeURIComponent(imagePath)}` })
        }
      })
  }

  function _handlePickedMedia(file) {
    if (file.fileType === 'video') {
      uni.navigateTo({ url: `/pages/preview/preview?type=video&src=${encodeURIComponent(file.tempFilePath)}` })
    } else {
      uni.navigateTo({ url: `/pages/editor/editor?src=${encodeURIComponent(file.tempFilePath)}` })
    }
  }

  function onShutterStart() {
    pluginMap.get('capture')?.onShutterStart?.()
  }

  function onShutterEnd() {
    pluginMap.get('capture')?.onShutterEnd?.()
  }

  function onChooseFromAlbum() {
    pluginMap.get('mediaPicker')?.onChooseFromAlbum?.()
  }

  function onToggleFlash() {
    pluginMap.get('capture')?.onToggleFlash?.()
  }

  function onToggleCamera() {
    pluginMap.get('capture')?.onToggleCamera?.()
  }

  function onShowWatermarkModal() {
    showWatermarkModal.value = true
  }

  function onHideWatermarkModal() {
    showWatermarkModal.value = false
  }

  function onWatermarkInput(e) {
    _inputValue = e.detail.value
  }

  function onClearWatermark() {
    _inputValue = ''
    watermarkText.value = ''
    showWatermarkModal.value = false
    _redrawDisplayCanvas()
  }

  function onConfirmWatermark() {
    watermarkText.value = _inputValue
    showWatermarkModal.value = false
    _redrawDisplayCanvas()
  }

  function onCameraError() {
    uni.showToast({ title: '相机出错，请检查权限', icon: 'none' })
  }

  function onToggleWatermark() {
    watermarkEnabled.value = !watermarkEnabled.value
    _redrawDisplayCanvas()
  }

  function onZoomChange(level) {
    if (level === currentZoom.value) return
    currentZoom.value = level
    if (!ctx) return
    ctx.setZoom({
      zoom: level,
      fail: () => {
        uni.showToast({ title: '缩放不支持', icon: 'none' })
      },
    })
  }

  function onCameraInitDone(e) {
    if (e.detail && e.detail.maxZoom) {
      maxZoom.value = e.detail.maxZoom
    }
  }

  return {
    flash,
    devicePosition,
    isRecording,
    watermarkEnabled,
    currentZoom,
    maxZoom,
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
  }
}
