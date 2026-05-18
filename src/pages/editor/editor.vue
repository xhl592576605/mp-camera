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
        <view class="action-btn action-btn-cancel" @tap="onToolCancel">
          <text class="action-icon">✕</text>
          <text class="action-label">取消</text>
        </view>
        <view class="action-btn action-btn-confirm" @tap="onToolConfirm">
          <text class="action-icon">✓</text>
          <text class="action-label">确认</text>
        </view>
      </view>
    </view>

    <!-- ===== 工具栏 + 子面板 ===== -->
    <view class="bottom-bar safe-area-bottom">
      <!-- 工具栏 -->
      <view class="tool-bar">
        <view
          v-for="tool in tools"
          :key="tool.key"
          :class="['tool-item', activeTool === tool.key ? 'is-active' : '']"
          @tap="onSelectTool(tool.key)"
        >
          <text class="tool-icon">{{ tool.icon }}</text>
          <text class="tool-label">{{ tool.label }}</text>
        </view>
      </view>

      <!-- 分割线 -->
      <view v-if="activeTool" class="panel-divider"></view>

      <!-- 画笔子面板 -->
      <view v-if="activeTool === 'draw'" class="sub-panel">
        <view class="panel-row">
          <text class="panel-section-label">颜色</text>
          <view class="color-list">
            <view
              v-for="c in drawColors"
              :key="c"
              :class="['color-swatch', drawColor === c ? 'is-selected' : '']"
              :style="{ backgroundColor: c }"
              @tap="drawColor = c"
            ></view>
          </view>
        </view>
        <view class="panel-row">
          <text class="panel-section-label">粗细</text>
          <view class="width-list">
            <view
              v-for="w in drawWidths"
              :key="w"
              :class="['width-swatch', drawWidth === w ? 'is-selected' : '']"
              @tap="drawWidth = w"
            >
              <view class="width-dot" :style="{ width: w * 2 + 'px', height: w * 2 + 'px' }"></view>
            </view>
          </view>
        </view>
      </view>

      <!-- 旋转子面板 -->
      <view v-if="activeTool === 'rotate'" class="sub-panel">
        <view class="panel-row" style="justify-content:center;">
          <view class="panel-btn" @tap="onRotate90('left')">
            <text class="panel-btn-icon">↺</text>
            <text class="panel-btn-text">90°</text>
          </view>
          <view class="rotate-value">
            <text class="rotate-number">{{ rotateAngle }}°</text>
          </view>
          <view class="panel-btn" @tap="onRotate90('right')">
            <text class="panel-btn-icon">↻</text>
            <text class="panel-btn-text">90°</text>
          </view>
        </view>
        <view class="panel-row">
          <slider
            class="rotate-slider"
            :min="-180" :max="180" :value="rotateAngle" :step="1"
            activeColor="#E63946" backgroundColor="rgba(255,255,255,0.1)"
            block-size="14"
            @change="onRotateSlider"
          />
        </view>
      </view>

      <!-- 裁剪子面板 -->
      <view v-if="activeTool === 'crop'" class="sub-panel">
        <view class="panel-row" style="justify-content:center;">
          <view
            v-for="r in cropRatios"
            :key="r.key"
            :class="['panel-btn', cropRatio === r.key ? 'is-selected' : '']"
            @tap="onSetCropRatio(r.key)"
          >
            <text class="panel-btn-text">{{ r.label }}</text>
          </view>
        </view>
      </view>

      <!-- 贴纸子面板 -->
      <view v-if="activeTool === 'sticker'" class="sub-panel">
        <scroll-view scroll-x class="sticker-scroll">
          <view class="sticker-list">
            <view
              v-for="(s, idx) in stickerList"
              :key="idx"
              class="sticker-item"
              @tap="onAddSticker(s)"
            >
              <text class="sticker-emoji">{{ s.emoji }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 文字子面板 -->
      <view v-if="activeTool === 'text'" class="sub-panel">
        <view class="panel-row">
          <input
            class="text-input"
            placeholder="输入文字..."
            placeholder-style="color: rgba(250,250,250,0.3);"
            :value="textInputContent"
            @input="onTextInput"
            @confirm="onTextAdd"
          />
          <view class="panel-btn panel-btn-primary" @tap="onTextAdd">
            <text class="panel-btn-text">添加</text>
          </view>
        </view>
        <view class="panel-row">
          <text class="panel-section-label">颜色</text>
          <view class="color-list">
            <view
              v-for="c in drawColors"
              :key="c"
              :class="['color-swatch', textColor === c ? 'is-selected' : '']"
              :style="{ backgroundColor: c }"
              @tap="onTextColorChange(c)"
            ></view>
          </view>
        </view>
        <view class="panel-row">
          <text class="panel-section-label">字号</text>
          <view class="size-list">
            <view
              v-for="s in textSizes"
              :key="s.value"
              :class="['panel-btn', textFontSize === s.value ? 'is-selected' : '']"
              @tap="onTextSizeChange(s.value)"
            >
              <text class="panel-btn-text">{{ s.label }}</text>
            </view>
          </view>
        </view>
      </view>
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
import { ref, computed, nextTick, getCurrentInstance } from 'vue'
import { onLoad, onReady } from '@dcloudio/uni-app'
import { initCanvas, loadImage, getImageInfo, canvasToTempFilePath } from '../../utils/canvas-helper.js'

const instance = getCurrentInstance().proxy

// ── 响应式状态 ──
const src = ref('')
const snapshots = ref([])
const currentIndex = ref(-1)
const activeTool = ref('')
const isEditing = ref(false)
const canvasWidth = ref(0)
const canvasHeight = ref(0)
const dpr = ref(1)

// ── 工具列表 ──
const tools = ref([
  { key: 'crop', icon: '⬚', label: '裁剪' },
  { key: 'rotate', icon: '↻', label: '旋转' },
  { key: 'sticker', icon: '★', label: '贴纸' },
  { key: 'text', icon: 'T', label: '文字' },
  { key: 'draw', icon: '✎', label: '画笔' },
])

// ── 画笔 ──
const isDrawing = ref(false)
const currentPath = ref([])
const drawColor = ref('#FFFFFF')
const drawWidth = ref(3)
const drawWidths = ref([2, 5, 10])
const drawColors = ref(['#FFFFFF', '#000000', '#E63946', '#FFD166', '#4ECDC4'])
const drawPaths = ref([])

// ── 旋转 ──
const rotateAngle = ref(0)

// ── 裁剪 ──
const cropRect = ref({ x: 0, y: 0, w: 0, h: 0 })
const cropRatio = ref('')
const cropRatios = ref([
  { key: '', label: '自由' },
  { key: '1:1', label: '1:1' },
  { key: '4:3', label: '4:3' },
  { key: '16:9', label: '16:9' },
])

// ── 贴纸 ──
const stickerElements = ref([])

// ── 文字 ──
const textElements = ref([])
const textInputContent = ref('')
const textColor = ref('#FFFFFF')
const textFontSize = ref(32)
const textSizes = ref([
  { value: 24, label: '小' },
  { value: 32, label: '中' },
  { value: 44, label: '大' },
])

// ── 选中状态 ──
const selectedId = ref(null)
const selectedType = ref('')

// ── 贴纸资源 ──
const stickerList = ref([
  { name: '星星', emoji: '⭐' },
  { name: '爱心', emoji: '❤️' },
  { name: '点赞', emoji: '👍' },
  { name: '火焰', emoji: '🔥' },
  { name: '庆祝', emoji: '🎉' },
  { name: '太阳', emoji: '☀️' },
  { name: '闪电', emoji: '⚡' },
  { name: '奖章', emoji: '🏅' },
  { name: '勾选', emoji: '✅' },
  { name: '皇冠', emoji: '👑' },
  { name: '钻石', emoji: '💎' },
  { name: '气泡', emoji: '💬' },
])

// ── 计算属性 ──
const canUndo = computed(() => currentIndex.value > 0)
const canRedo = computed(() => currentIndex.value < snapshots.value.length - 1)
const currentSnapshot = computed(() => snapshots.value[currentIndex.value] || null)

// ── 非响应式实例变量 ──
let canvasNode = null
let canvasCtx = null
let imageRect = null
let snapshotImage = null
let cropDragging = ''
let cropStartPos = null
let cropStartRect = null
let dragMode = ''
let dragStart = null

// ── 生命周期 ──
onLoad((options) => {
  src.value = decodeURIComponent(options.src || '')
})

onReady(() => {
  _initEditor()
})

// ═══════════════════════════════
//  生命周期
// ═══════════════════════════════

async function _initEditor() {
  if (!src.value) return
  try {
    const info = await getImageInfo(src.value)
    snapshots.value = [{ tempFilePath: src.value, width: info.width, height: info.height }]
    currentIndex.value = 0

    const result = await initCanvas(instance, '#editorCanvas')
    canvasNode = result.canvas
    canvasCtx = result.ctx
    canvasWidth.value = result.width
    canvasHeight.value = result.height
    dpr.value = result.dpr

    await _loadSnapshotImage()
    _drawCachedSnapshot()
  } catch (err) {
    console.error('Editor init failed:', err)
    uni.showToast({ title: '图片加载失败', icon: 'none' })
  }
}

function _syncCanvasSize() {
  return new Promise((resolve) => {
    if (!canvasNode) return resolve(false)
    const query = uni.createSelectorQuery().in(instance)
    query.select('#editorCanvas')
      .fields({ size: true })
      .exec((res) => {
        if (!res[0]) return resolve(false)
        const { width, height } = res[0]
        if (width < 1 || height < 1) return resolve(false)
        if (width === canvasWidth.value && height === canvasHeight.value) return resolve(false)
        const curDpr = (uni.getWindowInfo ? uni.getWindowInfo().pixelRatio : uni.getSystemInfoSync().pixelRatio) || 2
        canvasNode.width = width * curDpr
        canvasNode.height = height * curDpr
        canvasCtx.setTransform(1, 0, 0, 1, 0, 0)
        canvasCtx.scale(curDpr, curDpr)
        canvasWidth.value = width
        canvasHeight.value = height
        dpr.value = curDpr
        resolve(true)
      })
  })
}

// ═══════════════════════════════
//  快照管理
// ═══════════════════════════════

async function _loadSnapshotImage() {
  const snapshot = currentSnapshot.value
  if (!snapshot) return
  snapshotImage = await loadImage(canvasNode, snapshot.tempFilePath)
}

async function confirmEdit(newFilePath, width, height) {
  snapshots.value = snapshots.value.slice(0, currentIndex.value + 1)
  snapshots.value.push({ tempFilePath: newFilePath, width, height })
  currentIndex.value = snapshots.value.length - 1
  _clearToolState()
  await nextTick()
  await _syncCanvasSize()
  await _loadSnapshotImage()
  _drawCachedSnapshot()
}

function onUndo() {
  if (isEditing.value || !canUndo.value) return
  currentIndex.value--
  _loadSnapshotImage().then(() => _drawCachedSnapshot())
}

function onRedo() {
  if (isEditing.value || !canRedo.value) return
  currentIndex.value++
  _loadSnapshotImage().then(() => _drawCachedSnapshot())
}

// ═══════════════════════════════
//  渲染
// ═══════════════════════════════

function _drawCachedSnapshot() {
  if (!snapshotImage || !canvasCtx) return
  const ctx = canvasCtx
  const snapshot = currentSnapshot.value
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)
  const rect = _fitImage(snapshot.width, snapshot.height)
  imageRect = rect
  ctx.drawImage(snapshotImage, rect.x, rect.y, rect.w, rect.h)
}

function _renderPreview() {
  if (activeTool.value === 'rotate' && rotateAngle.value !== 0) {
    _renderRotateOverlay()
  } else {
    _drawCachedSnapshot()
    _renderToolOverlay()
  }
}

function _renderToolOverlay() {
  switch (activeTool.value) {
    case 'draw': _renderDrawOverlay(); break
    case 'rotate': break
    case 'crop': _renderCropOverlay(); break
    case 'sticker': _renderStickerOverlay(); break
    case 'text': _renderTextOverlay(); break
  }
}

function _fitImage(imgW, imgH) {
  const scale = Math.min(canvasWidth.value / imgW, canvasHeight.value / imgH)
  const w = imgW * scale
  const h = imgH * scale
  return { x: (canvasWidth.value - w) / 2, y: (canvasHeight.value - h) / 2, w, h }
}

// ═══════════════════════════════
//  顶部栏 / 保存
// ═══════════════════════════════

function onCancel() {
  uni.navigateBack()
}

function onSave() {
  const snapshot = currentSnapshot.value
  if (!snapshot) return
  uni.saveImageToPhotosAlbum({
    filePath: snapshot.tempFilePath,
    success: () => uni.showToast({ title: '已保存到相册', icon: 'success' }),
    fail: (err) => {
      if (err.errMsg && err.errMsg.includes('auth deny')) {
        uni.showToast({ title: '请授权访问相册', icon: 'none' })
      } else {
        uni.showToast({ title: '保存失败', icon: 'none' })
      }
    }
  })
}

// ═══════════════════════════════
//  工具管理
// ═══════════════════════════════

async function onSelectTool(key) {
  // 切换工具时自动合成当前贴纸/文字
  if (isEditing.value) {
    if (activeTool.value === 'sticker' && stickerElements.value.length > 0) {
      await _confirmSticker()
    } else if (activeTool.value === 'text' && textElements.value.length > 0) {
      await _confirmText()
    } else {
      _clearToolState()
    }
  }

  activeTool.value = key
  isEditing.value = true
  if (key === 'crop') {
    cropRatio.value = ''
    nextTick(() => _syncCanvasSize().then(() => _initCropRect()))
  } else if (key === 'rotate') {
    rotateAngle.value = 0
    nextTick(() => _syncCanvasSize().then(() => _drawCachedSnapshot()))
  } else if (key === 'draw') {
    drawPaths.value = []
    nextTick(() => _syncCanvasSize().then(() => _drawCachedSnapshot()))
  } else if (key === 'text') {
    nextTick(() => _syncCanvasSize().then(() => _drawCachedSnapshot()))
  } else {
    nextTick(() => _syncCanvasSize().then(() => _drawCachedSnapshot()))
  }
}

function onToolConfirm() {
  switch (activeTool.value) {
    case 'draw': _confirmDraw(); break
    case 'rotate': _confirmRotate(); break
    case 'crop': _confirmCrop(); break
    case 'sticker': _confirmSticker(); break
    case 'text': _confirmText(); break
  }
}

function onToolCancel() {
  _clearToolState()
  nextTick(() => _syncCanvasSize().then(() => _drawCachedSnapshot()))
}

function _clearToolState() {
  isEditing.value = false
  activeTool.value = ''
  isDrawing.value = false
  currentPath.value = []
  drawPaths.value = []
  rotateAngle.value = 0
  cropRect.value = { x: 0, y: 0, w: 0, h: 0 }
  cropDragging = ''
  stickerElements.value = []
  textElements.value = []
  selectedId.value = null
  selectedType.value = ''
  dragMode = ''
  dragStart = null
  textInputContent.value = ''
}

// ═══════════════════════════════
//  Canvas 触摸事件
// ═══════════════════════════════

function onCanvasTouchStart(e) {
  if (!isEditing.value) return
  const touch = e.touches[0]

  switch (activeTool.value) {
    case 'draw':
      isDrawing.value = true
      currentPath.value = [{ x: touch.x, y: touch.y }]
      break
    case 'sticker':
      _stickerTouchStart(touch, e)
      break
    case 'text':
      _textTouchStart(touch, e)
      break
    case 'crop':
      _cropTouchStart(touch)
      break
  }
}

function onCanvasTouchMove(e) {
  if (!isEditing.value) return
  const touch = e.touches[0]

  switch (activeTool.value) {
    case 'draw':
      if (!isDrawing.value) return
      currentPath.value.push({ x: touch.x, y: touch.y })
      _renderPreview()
      break
    case 'sticker':
      _stickerTouchMove(touch, e)
      break
    case 'text':
      _textTouchMove(touch, e)
      break
    case 'crop':
      _cropTouchMove(touch)
      break
  }
}

function onCanvasTouchEnd() {
  if (!isEditing.value) return
  switch (activeTool.value) {
    case 'draw':
      if (isDrawing.value && currentPath.value.length > 1) {
        drawPaths.value.push({
          points: [...currentPath.value],
          color: drawColor.value,
          width: drawWidth.value
        })
      }
      isDrawing.value = false
      currentPath.value = []
      _renderPreview()
      break
    case 'sticker':
      dragMode = ''
      dragStart = null
      break
    case 'text':
      dragMode = ''
      dragStart = null
      break
    case 'crop':
      cropDragging = ''
      break
  }
}

// ═══════════════════════════════
//  画笔工具
// ═══════════════════════════════

function _renderDrawOverlay() {
  const ctx = canvasCtx
  const drawStroke = (stroke) => {
    if (stroke.points.length < 2) return
    ctx.save()
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
    }
    ctx.stroke()
    ctx.restore()
  }

  drawPaths.value.forEach(drawStroke)
  if (currentPath.value.length > 1) {
    drawStroke({ points: currentPath.value, color: drawColor.value, width: drawWidth.value })
  }
}

async function _confirmDraw() {
  if (drawPaths.value.length === 0) {
    _clearToolState()
    _drawCachedSnapshot()
    return
  }
  uni.showLoading({ title: '处理中...' })
  try {
    const snapshot = currentSnapshot.value
    const ir = imageRect
    const scaleX = snapshot.width / ir.w
    const scaleY = snapshot.height / ir.h
    const scale = Math.max(scaleX, scaleY)

    const exportResult = await initCanvas(instance, '#exportCanvas')
    const canvas = exportResult.canvas
    const ctx = canvas.getContext('2d')
    canvas.width = snapshot.width
    canvas.height = snapshot.height

    const img = await loadImage(canvas, snapshot.tempFilePath)
    ctx.drawImage(img, 0, 0, snapshot.width, snapshot.height)

    drawPaths.value.forEach((stroke) => {
      if (stroke.points.length < 2) return
      ctx.save()
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.width * scale
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo((stroke.points[0].x - ir.x) * scaleX, (stroke.points[0].y - ir.y) * scaleY)
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo((stroke.points[i].x - ir.x) * scaleX, (stroke.points[i].y - ir.y) * scaleY)
      }
      ctx.stroke()
      ctx.restore()
    })

    const newFilePath = await canvasToTempFilePath(canvas)
    confirmEdit(newFilePath, snapshot.width, snapshot.height)
  } catch (err) {
    console.error('Confirm draw failed:', err)
    uni.showToast({ title: '处理失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

// ═══════════════════════════════
//  旋转工具
// ═══════════════════════════════

function onRotate90(direction) {
  const delta = direction === 'right' ? 90 : -90
  rotateAngle.value = ((rotateAngle.value + delta) % 360 + 360) % 360
  if (rotateAngle.value > 180) rotateAngle.value -= 360
  _renderPreview()
}

function onRotateSlider(e) {
  rotateAngle.value = e.detail.value
  _renderPreview()
}

function _renderRotateOverlay() {
  if (rotateAngle.value === 0 || !snapshotImage) return
  const ctx = canvasCtx
  const ir = imageRect
  const cx = canvasWidth.value / 2
  const cy = canvasHeight.value / 2

  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rotateAngle.value * Math.PI / 180)
  ctx.drawImage(snapshotImage, -ir.w / 2, -ir.h / 2, ir.w, ir.h)
  ctx.restore()
}

async function _confirmRotate() {
  if (rotateAngle.value === 0) {
    _clearToolState()
    _drawCachedSnapshot()
    return
  }
  uni.showLoading({ title: '处理中...' })
  try {
    const snapshot = currentSnapshot.value
    const rad = rotateAngle.value * Math.PI / 180
    const absCos = Math.abs(Math.cos(rad))
    const absSin = Math.abs(Math.sin(rad))
    const newW = Math.round(snapshot.width * absCos + snapshot.height * absSin)
    const newH = Math.round(snapshot.width * absSin + snapshot.height * absCos)

    const exportResult = await initCanvas(instance, '#exportCanvas')
    const canvas = exportResult.canvas
    const ctx = canvas.getContext('2d')
    canvas.width = newW
    canvas.height = newH

    const img = await loadImage(canvas, snapshot.tempFilePath)
    ctx.save()
    ctx.translate(newW / 2, newH / 2)
    ctx.rotate(rad)
    ctx.drawImage(img, -snapshot.width / 2, -snapshot.height / 2, snapshot.width, snapshot.height)
    ctx.restore()

    const newFilePath = await canvasToTempFilePath(canvas)
    confirmEdit(newFilePath, newW, newH)
  } catch (err) {
    console.error('Confirm rotate failed:', err)
    uni.showToast({ title: '处理失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

// ═══════════════════════════════
//  裁剪工具
// ═══════════════════════════════

function _initCropRect() {
  const ir = imageRect
  if (!ir) return
  let w, h
  if (cropRatio.value === '1:1') {
    const size = Math.min(ir.w, ir.h) * 0.8
    w = size; h = size
  } else if (cropRatio.value === '4:3') {
    w = ir.w * 0.8; h = w * 3 / 4
    if (h > ir.h * 0.8) { h = ir.h * 0.8; w = h * 4 / 3 }
  } else if (cropRatio.value === '16:9') {
    w = ir.w * 0.8; h = w * 9 / 16
    if (h > ir.h * 0.8) { h = ir.h * 0.8; w = h * 16 / 9 }
  } else {
    w = ir.w * 0.8; h = ir.h * 0.8
  }
  cropRect.value = { x: ir.x + (ir.w - w) / 2, y: ir.y + (ir.h - h) / 2, w, h }
  _renderPreview()
}

function onSetCropRatio(ratio) {
  cropRatio.value = ratio
  nextTick(() => _initCropRect())
}

function _renderCropOverlay() {
  const ctx = canvasCtx
  const ir = imageRect
  const cr = cropRect.value
  if (!ir || cr.w < 1) return

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.fillRect(ir.x, ir.y, ir.w, cr.y - ir.y)
  ctx.fillRect(ir.x, cr.y + cr.h, ir.w, ir.y + ir.h - cr.y - cr.h)
  ctx.fillRect(ir.x, cr.y, cr.x - ir.x, cr.h)
  ctx.fillRect(cr.x + cr.w, cr.y, ir.x + ir.w - cr.x - cr.w, cr.h)

  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 1
  ctx.strokeRect(cr.x, cr.y, cr.w, cr.h)

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
  ctx.lineWidth = 0.5
  for (let i = 1; i <= 2; i++) {
    ctx.beginPath()
    ctx.moveTo(cr.x + cr.w * i / 3, cr.y)
    ctx.lineTo(cr.x + cr.w * i / 3, cr.y + cr.h)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cr.x, cr.y + cr.h * i / 3)
    ctx.lineTo(cr.x + cr.w, cr.y + cr.h * i / 3)
    ctx.stroke()
  }

  const hl = 24
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  const corners = [
    { x: cr.x, y: cr.y, dx: 1, dy: 1 },
    { x: cr.x + cr.w, y: cr.y, dx: -1, dy: 1 },
    { x: cr.x, y: cr.y + cr.h, dx: 1, dy: -1 },
    { x: cr.x + cr.w, y: cr.y + cr.h, dx: -1, dy: -1 },
  ]
  corners.forEach(c => {
    ctx.beginPath()
    ctx.moveTo(c.x + c.dx * hl, c.y)
    ctx.lineTo(c.x, c.y)
    ctx.lineTo(c.x, c.y + c.dy * hl)
    ctx.stroke()
  })
  ctx.lineCap = 'butt'
}

function _cropTouchStart(touch) {
  const cr = cropRect.value
  const handleSize = 30

  const corners = [
    { key: 'tl', x: cr.x, y: cr.y },
    { key: 'tr', x: cr.x + cr.w, y: cr.y },
    { key: 'bl', x: cr.x, y: cr.y + cr.h },
    { key: 'br', x: cr.x + cr.w, y: cr.y + cr.h },
  ]
  for (const c of corners) {
    if (Math.abs(touch.x - c.x) < handleSize && Math.abs(touch.y - c.y) < handleSize) {
      cropDragging = c.key
      cropStartPos = { x: touch.x, y: touch.y }
      cropStartRect = { ...cr }
      return
    }
  }
  if (touch.x >= cr.x && touch.x <= cr.x + cr.w && touch.y >= cr.y && touch.y <= cr.y + cr.h) {
    cropDragging = 'move'
    cropStartPos = { x: touch.x, y: touch.y }
    cropStartRect = { ...cr }
  }
}

function _cropTouchMove(touch) {
  if (!cropDragging || !cropStartPos) return
  const dx = touch.x - cropStartPos.x
  const dy = touch.y - cropStartPos.y
  const sr = cropStartRect
  const ir = imageRect
  const minSize = 50
  let r = { ...sr }

  if (cropDragging === 'move') {
    r.x = Math.max(ir.x, Math.min(sr.x + dx, ir.x + ir.w - sr.w))
    r.y = Math.max(ir.y, Math.min(sr.y + dy, ir.y + ir.h - sr.h))
  } else if (cropDragging === 'br') {
    r.w = Math.max(minSize, Math.min(sr.w + dx, ir.x + ir.w - sr.x))
    r.h = Math.max(minSize, Math.min(sr.h + dy, ir.y + ir.h - sr.y))
    if (cropRatio.value) {
      const ratio = _parseRatio(cropRatio.value)
      r.h = r.w / ratio
      if (sr.y + r.h > ir.y + ir.h) { r.h = ir.y + ir.h - sr.y; r.w = r.h * ratio }
    }
  } else if (cropDragging === 'tl') {
    r.x = Math.max(ir.x, sr.x + dx)
    r.y = Math.max(ir.y, sr.y + dy)
    r.w = Math.max(minSize, sr.x + sr.w - r.x)
    r.h = Math.max(minSize, sr.y + sr.h - r.y)
  } else if (cropDragging === 'tr') {
    r.w = Math.max(minSize, Math.min(sr.w + dx, ir.x + ir.w - sr.x))
    r.y = Math.max(ir.y, sr.y + dy)
    r.h = Math.max(minSize, sr.y + sr.h - r.y)
  } else if (cropDragging === 'bl') {
    r.x = Math.max(ir.x, sr.x + dx)
    r.w = Math.max(minSize, sr.x + sr.w - r.x)
    r.h = Math.max(minSize, Math.min(sr.h + dy, ir.y + ir.h - sr.y))
  }

  cropRect.value = r
  _renderPreview()
}

function _parseRatio(ratio) {
  if (!ratio) return 0
  const [w, h] = ratio.split(':').map(Number)
  return w / h
}

async function _confirmCrop() {
  const cr = cropRect.value
  const ir = imageRect
  if (!ir || cr.w < 10 || cr.h < 10) return
  uni.showLoading({ title: '处理中...' })
  try {
    const snapshot = currentSnapshot.value
    const scaleX = snapshot.width / ir.w
    const scaleY = snapshot.height / ir.h
    const cropX = Math.round((cr.x - ir.x) * scaleX)
    const cropY = Math.round((cr.y - ir.y) * scaleY)
    const cropW = Math.round(cr.w * scaleX)
    const cropH = Math.round(cr.h * scaleY)

    const exportResult = await initCanvas(instance, '#exportCanvas')
    const canvas = exportResult.canvas
    const ctx = canvas.getContext('2d')
    canvas.width = cropW
    canvas.height = cropH

    const img = await loadImage(canvas, snapshot.tempFilePath)
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)

    const newFilePath = await canvasToTempFilePath(canvas)
    confirmEdit(newFilePath, cropW, cropH)
  } catch (err) {
    console.error('Confirm crop failed:', err)
    uni.showToast({ title: '处理失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

// ═══════════════════════════════
//  贴纸工具
// ═══════════════════════════════

function onAddSticker(sticker) {
  const ir = imageRect
  if (!ir) return
  const id = Date.now()
  stickerElements.value.push({
    id,
    emoji: sticker.emoji,
    x: ir.x + ir.w / 2,
    y: ir.y + ir.h / 2,
    fontSize: 48,
    rotation: 0,
  })
  selectedId.value = id
  selectedType.value = 'sticker'
  _renderPreview()
}

function _getStickerBounds(el) {
  const halfSize = el.fontSize * 0.75
  return { halfW: halfSize, halfH: halfSize }
}

function _drawSelectionFrame(ctx, halfW, halfH) {
  const pad = 12
  const fw = halfW + pad
  const fh = halfH + pad

  ctx.strokeStyle = '#4cd964'
  ctx.lineWidth = 1.5
  ctx.setLineDash([5, 5])
  ctx.strokeRect(-fw, -fh, fw * 2, fh * 2)
  ctx.setLineDash([])

  // 旋转手柄连接线
  const rotateOffset = 30
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, -fh)
  ctx.lineTo(0, -fh - rotateOffset)
  ctx.stroke()

  // 旋转手柄
  ctx.fillStyle = '#007AFF'
  ctx.beginPath()
  ctx.arc(0, -fh - rotateOffset, 10, 0, Math.PI * 2)
  ctx.fill()

  // 四角缩放手柄
  const corners = [
    { x: -fw, y: -fh }, { x: fw, y: -fh },
    { x: -fw, y: fh },  { x: fw, y: fh },
  ]
  ctx.fillStyle = '#fff'
  corners.forEach(c => {
    ctx.beginPath()
    ctx.arc(c.x, c.y, 5, 0, Math.PI * 2)
    ctx.fill()
  })
}

function _getDeleteBtnWorldPos(el, halfW, halfH) {
  const pad = 12
  const fw = halfW + pad
  const fh = halfH + pad
  // 本地坐标：右上角偏上
  const localX = fw
  const localY = -fh - 16
  // 旋转到世界坐标
  const cos = Math.cos(el.rotation)
  const sin = Math.sin(el.rotation)
  return {
    x: el.x + localX * cos - localY * sin,
    y: el.y + localX * sin + localY * cos
  }
}

function _drawDeleteBtn(ctx, wx, wy) {
  ctx.save()
  ctx.fillStyle = '#E63946'
  ctx.beginPath()
  ctx.arc(wx, wy, 11, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = '13px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('×', wx, wy)
  ctx.restore()
}

function _renderStickerOverlay() {
  const ctx = canvasCtx
  let deleteBtnPos = null

  stickerElements.value.forEach(el => {
    ctx.save()
    ctx.translate(el.x, el.y)
    ctx.rotate(el.rotation)

    ctx.font = `${el.fontSize}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(el.emoji, 0, 0)

    if (selectedId.value === el.id && selectedType.value === 'sticker') {
      const { halfW, halfH } = _getStickerBounds(el)
      _drawSelectionFrame(ctx, halfW, halfH)
      // 计算删除按钮的世界坐标（ctx.restore 之后再绘制）
      deleteBtnPos = _getDeleteBtnWorldPos(el, halfW, halfH)
    }

    ctx.restore()
  })

  // 删除按钮不跟随旋转，在世界坐标下绘制
  if (deleteBtnPos) {
    _drawDeleteBtn(ctx, deleteBtnPos.x, deleteBtnPos.y)
  }
}

function _hitToLocal(tx, ty, el) {
  const dx = tx - el.x
  const dy = ty - el.y
  const cos = Math.cos(-el.rotation)
  const sin = Math.sin(-el.rotation)
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos }
}

function _dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
}

function _stickerTouchStart(touch, e) {
  const tx = touch.x
  const ty = touch.y

  // 如果有选中元素，先检测手柄
  if (selectedId.value && selectedType.value === 'sticker') {
    const el = stickerElements.value.find(s => s.id === selectedId.value)
    if (el) {
      const { halfW, halfH } = _getStickerBounds(el)
      const pad = 12
      const fw = halfW + pad
      const fh = halfH + pad
      const local = _hitToLocal(tx, ty, el)

      // 删除按钮（世界坐标）
      const dp = _getDeleteBtnWorldPos(el, halfW, halfH)
      if (_dist(tx, ty, dp.x, dp.y) <= 14) {
        stickerElements.value = stickerElements.value.filter(s => s.id !== el.id)
        selectedId.value = null
        _renderPreview()
        return
      }

      // 旋转手柄
      if (_dist(local.x, local.y, 0, -fh - 30) <= 14) {
        dragMode = 'rotate'
        dragStart = { angle: Math.atan2(ty - el.y, tx - el.x), snapshot: { ...el } }
        return
      }

      // 四角缩放手柄
      const corners = [
        { x: -fw, y: -fh }, { x: fw, y: -fh },
        { x: -fw, y: fh },  { x: fw, y: fh },
      ]
      for (const c of corners) {
        if (_dist(local.x, local.y, c.x, c.y) <= 12) {
          dragMode = 'scale'
          const centerDist = _dist(tx, ty, el.x, el.y)
          dragStart = { centerDist, snapshot: { ...el } }
          return
        }
      }

      // 选中框内拖动
      if (Math.abs(local.x) <= fw && Math.abs(local.y) <= fh) {
        dragMode = 'move'
        dragStart = { x: tx, y: ty, sx: el.x, sy: el.y }
        return
      }
    }
  }

  // 检测是否点击了某个贴纸（从后往前，上层优先）
  for (let i = stickerElements.value.length - 1; i >= 0; i--) {
    const el = stickerElements.value[i]
    const { halfW, halfH } = _getStickerBounds(el)
    const pad = 12
    const local = _hitToLocal(tx, ty, el)
    if (Math.abs(local.x) <= halfW + pad && Math.abs(local.y) <= halfH + pad) {
      selectedId.value = el.id
      selectedType.value = 'sticker'
      dragMode = 'move'
      dragStart = { x: tx, y: ty, sx: el.x, sy: el.y }
      _renderPreview()
      return
    }
  }

  // 空白区域，取消选中
  if (selectedId.value && selectedType.value === 'sticker') {
    selectedId.value = null
    selectedType.value = ''
    _renderPreview()
  }
}

function _stickerTouchMove(touch, e) {
  if (!selectedId.value || selectedType.value !== 'sticker' || !dragStart) return
  const el = stickerElements.value.find(s => s.id === selectedId.value)
  if (!el) return

  const tx = touch.x
  const ty = touch.y

  if (dragMode === 'move') {
    el.x = dragStart.sx + (tx - dragStart.x)
    el.y = dragStart.sy + (ty - dragStart.y)
  } else if (dragMode === 'scale') {
    const curDist = _dist(tx, ty, el.x, el.y)
    const scale = curDist / dragStart.centerDist
    el.fontSize = Math.max(20, Math.round(dragStart.snapshot.fontSize * scale))
  } else if (dragMode === 'rotate') {
    const curAngle = Math.atan2(ty - el.y, tx - el.x)
    el.rotation = dragStart.snapshot.rotation + (curAngle - dragStart.angle)
  }

  _renderPreview()
}

async function _confirmSticker() {
  if (stickerElements.value.length === 0) {
    _clearToolState()
    _drawCachedSnapshot()
    return
  }
  uni.showLoading({ title: '处理中...' })
  try {
    const snapshot = currentSnapshot.value
    const ir = imageRect
    const scaleX = snapshot.width / ir.w
    const scaleY = snapshot.height / ir.h
    const scale = Math.max(scaleX, scaleY)

    const exportResult = await initCanvas(instance, '#exportCanvas')
    const canvas = exportResult.canvas
    const ctx = canvas.getContext('2d')
    canvas.width = snapshot.width
    canvas.height = snapshot.height

    const img = await loadImage(canvas, snapshot.tempFilePath)
    ctx.drawImage(img, 0, 0, snapshot.width, snapshot.height)

    stickerElements.value.forEach(s => {
      ctx.save()
      ctx.translate((s.x - ir.x) * scaleX, (s.y - ir.y) * scaleY)
      ctx.rotate(s.rotation)
      ctx.font = `${s.fontSize * scale}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(s.emoji, 0, 0)
      ctx.restore()
    })

    const newFilePath = await canvasToTempFilePath(canvas)
    stickerElements.value = []
    selectedId.value = null
    selectedType.value = ''
    confirmEdit(newFilePath, snapshot.width, snapshot.height)
  } catch (err) {
    console.error('Confirm sticker failed:', err)
    uni.showToast({ title: '处理失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

// ═══════════════════════════════
//  文字工具
// ═══════════════════════════════

function onTextInput(e) {
  textInputContent.value = e.detail.value
}

function onTextAdd() {
  if (!textInputContent.value.trim()) {
    uni.showToast({ title: '请输入文字', icon: 'none' })
    return
  }
  const ir = imageRect
  if (!ir) return

  // 如果当前选中了文字元素，更新它
  if (selectedId.value && selectedType.value === 'text') {
    const el = textElements.value.find(t => t.id === selectedId.value)
    if (el) {
      el.content = textInputContent.value.trim()
      el.color = textColor.value
      el.fontSize = textFontSize.value
      _renderPreview()
      return
    }
  }

  // 否则添加新文字元素
  const id = Date.now()
  textElements.value.push({
    id,
    content: textInputContent.value.trim(),
    x: ir.x + ir.w / 2,
    y: ir.y + ir.h / 2,
    fontSize: textFontSize.value,
    color: textColor.value,
    rotation: 0,
  })
  selectedId.value = id
  selectedType.value = 'text'
  _renderPreview()
}

function onTextColorChange(c) {
  textColor.value = c
  if (selectedId.value && selectedType.value === 'text') {
    const el = textElements.value.find(t => t.id === selectedId.value)
    if (el) { el.color = c; _renderPreview() }
  }
}

function onTextSizeChange(s) {
  textFontSize.value = s
  if (selectedId.value && selectedType.value === 'text') {
    const el = textElements.value.find(t => t.id === selectedId.value)
    if (el) { el.fontSize = s; _renderPreview() }
  }
}

function _getTextBounds(el) {
  const ctx = canvasCtx
  ctx.font = `bold ${el.fontSize}px -apple-system, "PingFang SC", sans-serif`
  const textW = ctx.measureText(el.content).width
  return { halfW: textW / 2 + 12, halfH: el.fontSize * 0.7 }
}

function _renderTextOverlay() {
  const ctx = canvasCtx
  let deleteBtnPos = null

  textElements.value.forEach(el => {
    ctx.save()
    ctx.translate(el.x, el.y)
    ctx.rotate(el.rotation)

    ctx.font = `bold ${el.fontSize}px -apple-system, "PingFang SC", sans-serif`
    ctx.fillStyle = el.color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(el.content, 0, 0)

    if (selectedId.value === el.id && selectedType.value === 'text') {
      const { halfW, halfH } = _getTextBounds(el)
      _drawSelectionFrame(ctx, halfW, halfH)
      deleteBtnPos = _getDeleteBtnWorldPos(el, halfW, halfH)
    }

    ctx.restore()
  })

  if (deleteBtnPos) {
    _drawDeleteBtn(ctx, deleteBtnPos.x, deleteBtnPos.y)
  }
}

function _textTouchStart(touch, e) {
  const tx = touch.x
  const ty = touch.y

  if (selectedId.value && selectedType.value === 'text') {
    const el = textElements.value.find(t => t.id === selectedId.value)
    if (el) {
      const { halfW, halfH } = _getTextBounds(el)
      const pad = 12
      const fw = halfW + pad
      const fh = halfH + pad
      const local = _hitToLocal(tx, ty, el)

      const dp = _getDeleteBtnWorldPos(el, halfW, halfH)
      if (_dist(tx, ty, dp.x, dp.y) <= 14) {
        textElements.value = textElements.value.filter(t => t.id !== el.id)
        selectedId.value = null
        _renderPreview()
        return
      }

      if (_dist(local.x, local.y, 0, -fh - 30) <= 14) {
        dragMode = 'rotate'
        dragStart = { angle: Math.atan2(ty - el.y, tx - el.x), snapshot: { ...el } }
        return
      }

      const corners = [
        { x: -fw, y: -fh }, { x: fw, y: -fh },
        { x: -fw, y: fh },  { x: fw, y: fh },
      ]
      for (const c of corners) {
        if (_dist(local.x, local.y, c.x, c.y) <= 12) {
          dragMode = 'scale'
          const centerDist = _dist(tx, ty, el.x, el.y)
          dragStart = { centerDist, snapshot: { ...el } }
          return
        }
      }

      if (Math.abs(local.x) <= fw && Math.abs(local.y) <= fh) {
        dragMode = 'move'
        dragStart = { x: tx, y: ty, sx: el.x, sy: el.y }
        return
      }
    }
  }

  for (let i = textElements.value.length - 1; i >= 0; i--) {
    const el = textElements.value[i]
    const { halfW, halfH } = _getTextBounds(el)
    const pad = 12
    const local = _hitToLocal(tx, ty, el)
    if (Math.abs(local.x) <= halfW + pad && Math.abs(local.y) <= halfH + pad) {
      selectedId.value = el.id
      selectedType.value = 'text'
      dragMode = 'move'
      dragStart = { x: tx, y: ty, sx: el.x, sy: el.y }
      textInputContent.value = el.content
      textColor.value = el.color
      textFontSize.value = el.fontSize
      _renderPreview()
      return
    }
  }

  if (selectedId.value && selectedType.value === 'text') {
    selectedId.value = null
    selectedType.value = ''
    _renderPreview()
  }
}

function _textTouchMove(touch, e) {
  if (!selectedId.value || selectedType.value !== 'text' || !dragStart) return
  const el = textElements.value.find(t => t.id === selectedId.value)
  if (!el) return

  const tx = touch.x
  const ty = touch.y

  if (dragMode === 'move') {
    el.x = dragStart.sx + (tx - dragStart.x)
    el.y = dragStart.sy + (ty - dragStart.y)
  } else if (dragMode === 'scale') {
    const curDist = _dist(tx, ty, el.x, el.y)
    const scale = curDist / dragStart.centerDist
    el.fontSize = Math.max(14, Math.round(dragStart.snapshot.fontSize * scale))
  } else if (dragMode === 'rotate') {
    const curAngle = Math.atan2(ty - el.y, tx - el.x)
    el.rotation = dragStart.snapshot.rotation + (curAngle - dragStart.angle)
  }

  _renderPreview()
}

async function _confirmText() {
  if (textElements.value.length === 0) {
    _clearToolState()
    _drawCachedSnapshot()
    return
  }
  uni.showLoading({ title: '处理中...' })
  try {
    const snapshot = currentSnapshot.value
    const ir = imageRect
    const scaleX = snapshot.width / ir.w
    const scaleY = snapshot.height / ir.h
    const scale = Math.max(scaleX, scaleY)

    const exportResult = await initCanvas(instance, '#exportCanvas')
    const canvas = exportResult.canvas
    const ctx = canvas.getContext('2d')
    canvas.width = snapshot.width
    canvas.height = snapshot.height

    const img = await loadImage(canvas, snapshot.tempFilePath)
    ctx.drawImage(img, 0, 0, snapshot.width, snapshot.height)

    textElements.value.forEach(t => {
      ctx.save()
      ctx.translate((t.x - ir.x) * scaleX, (t.y - ir.y) * scaleY)
      ctx.rotate(t.rotation)
      ctx.font = `bold ${t.fontSize * scale}px -apple-system, "PingFang SC", sans-serif`
      ctx.fillStyle = t.color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(t.content, 0, 0)
      ctx.restore()
    })

    const newFilePath = await canvasToTempFilePath(canvas)
    textElements.value = []
    selectedId.value = null
    selectedType.value = ''
    confirmEdit(newFilePath, snapshot.width, snapshot.height)
  } catch (err) {
    console.error('Confirm text failed:', err)
    uni.showToast({ title: '处理失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}
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
  background-color: var(--e-surface-light);
}

.tool-icon {
  font-size: 40rpx;
  color: var(--e-text-dim);
  transition: color 150ms ease;
}

.tool-item.is-active .tool-icon {
  color: var(--e-accent);
}

.tool-label {
  font-size: 20rpx;
  color: var(--e-text-dim);
  transition: color 150ms ease;
}

.tool-item.is-active .tool-label {
  color: var(--e-text);
}

/* ── 面板分割线 ── */

.panel-divider {
  height: 1rpx;
  background: var(--e-border);
  margin: 0 32rpx;
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
  color: var(--e-text-dim);
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
  background: var(--e-surface-light);
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
  background: var(--e-accent);
}

.panel-btn-primary .panel-btn-text {
  color: #fff;
  font-weight: 600;
}

.panel-btn-icon {
  font-size: 30rpx;
  color: var(--e-text);
}

.panel-btn-text {
  font-size: 24rpx;
  color: var(--e-text);
}

/* ── 旋转面板 ── */

.rotate-value {
  min-width: 120rpx;
  text-align: center;
}

.rotate-number {
  font-family: var(--e-font-mono);
  font-size: 28rpx;
  color: var(--e-text);
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
  border-color: var(--e-text);
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
  border-color: var(--e-text);
}

.width-dot {
  background: var(--e-text);
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
  background: var(--e-surface-light);
  border-radius: var(--radius-md);
  flex-shrink: 0;
  transition: transform 150ms ease, background-color 150ms ease;
}

.sticker-item:active {
  transform: scale(0.9);
  background: var(--e-surface-hover);
}

.sticker-emoji {
  font-size: 40rpx;
}

/* ── 文字面板 ── */

.text-input {
  flex: 1;
  height: 68rpx;
  background: var(--e-surface-light);
  border-radius: var(--radius-md);
  padding: 0 24rpx;
  color: var(--e-text);
  font-size: 26rpx;
  border: 1rpx solid var(--e-border);
  box-sizing: border-box;
}

/* ── 尺寸选择 ── */

.size-list {
  display: flex;
  flex-direction: row;
  gap: 12rpx;
}
</style>
