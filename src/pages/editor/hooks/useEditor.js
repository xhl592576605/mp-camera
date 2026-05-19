import { ref, computed, nextTick, getCurrentInstance } from 'vue'
import { onReady, onLoad } from '@dcloudio/uni-app'
import { initCanvas, loadImage, getImageInfo, canvasToTempFilePath } from '@/utils/canvas-helper.js'
import { createEditorPluginRegistry } from '../plugins'

export function useEditor(options = {}) {
  const vm = getCurrentInstance()
  const instance = vm ? vm.proxy : null
  const pluginDefs = options.plugins || createEditorPluginRegistry()
  const pluginInstances = pluginDefs.map(item => ({
    ...item,
    instance: item.create({
      requestRender: () => renderPreview(),
      getActiveSnapshot: () => currentSnapshot.value,
      getImageRect: () => imageRect,
      setEditing: (value) => { isEditing.value = value },
      setSelection: ({ id, type }) => {
        selectedId.value = id
        selectedType.value = type
      },
      renderRotatePreview: (angle) => _renderRotateOverlay(angle),
      renderCropPreview: (rect) => _renderCropOverlay(rect),
      renderDrawPreview: (payload) => _renderDrawOverlay(payload),
      renderStickerPreview: (elements) => _renderStickerOverlay(elements),
      renderTextPreview: (elements) => _renderTextOverlay(elements),
      exportRotate: (angle) => _exportRotate(angle),
      exportCrop: (rect) => _exportCrop(rect),
      exportDraw: (payload) => _exportDraw(payload),
      exportSticker: (elements) => _exportSticker(elements),
      exportText: (elements) => _exportText(elements),
      handleStickerTouchStart: (elements, event) => _stickerTouchStart(elements, event),
      handleStickerTouchMove: (elements, event) => _stickerTouchMove(elements, event),
      handleTextTouchStart: (elements, event) => _textTouchStart(elements, event),
      handleTextTouchMove: (elements, event) => _textTouchMove(elements, event),
      finishElementGesture: () => { dragMode = ''; dragStart = null },
    }),
  }))

  const src = ref('')
  const activeTool = ref('')
  const isEditing = ref(false)
  const snapshots = ref([])
  const currentIndex = ref(-1)
  const selectedId = ref(null)
  const selectedType = ref('')
  const canvasWidth = ref(0)
  const canvasHeight = ref(0)
  const dpr = ref(1)

  let canvasNode = null
  let canvasCtx = null
  let imageRect = null
  let snapshotImage = null
  let dragMode = ''
  let dragStart = null

  const toolbarItems = computed(() =>
    pluginInstances
      .filter(item => item.visible !== false && item.enabled !== false)
      .sort((a, b) => a.order - b.order)
      .map(item => ({
        key: item.key,
        label: item.label,
        icon: item.icon,
      }))
  )

  const currentPlugin = computed(() =>
    pluginInstances.find(item => item.key === activeTool.value)?.instance || null
  )

  const activePanelComponent = computed(() =>
    pluginInstances.find(item => item.key === activeTool.value)?.panelComponent || null
  )

  const activePanelProps = computed(() =>
    currentPlugin.value?.getPanelProps?.() || {}
  )

  const activePanelActions = computed(() =>
    currentPlugin.value?.getPanelActions?.() || {}
  )

  const currentSnapshot = computed(() => snapshots.value[currentIndex.value] || null)
  const canUndo = computed(() => currentIndex.value > 0)
  const canRedo = computed(() => currentIndex.value < snapshots.value.length - 1)

  if (options.autoInit !== false) {
    onLoad((options) => {
      src.value = decodeURIComponent(options.src || '')
    })

    onReady(() => {
      _initEditor()
    })
  }

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

  async function _loadSnapshotImage() {
    const snapshot = currentSnapshot.value
    if (!snapshot) return
    snapshotImage = await loadImage(canvasNode, snapshot.tempFilePath)
  }

  async function confirmEdit(newFilePath, width, height) {
    snapshots.value = snapshots.value.slice(0, currentIndex.value + 1)
    snapshots.value.push({ tempFilePath: newFilePath, width, height })
    currentIndex.value = snapshots.value.length - 1
    clearToolState()
    await nextTick()
    await _syncCanvasSize()
    await _loadSnapshotImage()
    _drawCachedSnapshot()
  }

  function _drawCachedSnapshot() {
    if (!snapshotImage || !canvasCtx) return
    const ctx = canvasCtx
    const snapshot = currentSnapshot.value
    ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)
    const rect = _fitImage(snapshot.width, snapshot.height)
    imageRect = rect
    ctx.drawImage(snapshotImage, rect.x, rect.y, rect.w, rect.h)
  }

  function _fitImage(imgW, imgH) {
    const scale = Math.min(canvasWidth.value / imgW, canvasHeight.value / imgH)
    const w = imgW * scale
    const h = imgH * scale
    return { x: (canvasWidth.value - w) / 2, y: (canvasHeight.value - h) / 2, w, h }
  }

  function renderPreview() {
    const rotateProps = activeTool.value === 'rotate' ? currentPlugin.value?.getPanelProps?.() : null
    if (rotateProps && rotateProps.angle !== 0) {
      currentPlugin.value?.renderPreview?.()
    } else {
      _drawCachedSnapshot()
      if (activeTool.value !== 'rotate') {
        currentPlugin.value?.renderPreview?.()
      }
    }
  }

  async function selectTool(key) {
    if (activeTool.value === key) return

    if (isEditing.value && currentPlugin.value) {
      const pluginState = currentPlugin.value.getPanelProps?.()
      if ((activeTool.value === 'sticker' || activeTool.value === 'text') && pluginState?.elements?.length > 0) {
        const result = await currentPlugin.value.commit?.()
        if (result) {
          snapshots.value = snapshots.value.slice(0, currentIndex.value + 1)
          snapshots.value.push(result)
          currentIndex.value = snapshots.value.length - 1
          await _loadSnapshotImage()
        }
      }
    }

    currentPlugin.value?.deactivate?.()
    activeTool.value = key
    isEditing.value = true
    selectedId.value = null
    selectedType.value = ''
    currentPlugin.value?.activate?.()

    nextTick(() => _syncCanvasSize().then(() => renderPreview()))
  }

  function clearToolState() {
    currentPlugin.value?.reset?.()
    activeTool.value = ''
    isEditing.value = false
    selectedId.value = null
    selectedType.value = ''
    dragMode = ''
    dragStart = null
  }

  async function onConfirmTool() {
    const result = await currentPlugin.value?.commit?.()
    if (result) {
      snapshots.value = snapshots.value.slice(0, currentIndex.value + 1)
      snapshots.value.push(result)
      currentIndex.value = snapshots.value.length - 1
      await _loadSnapshotImage()
    }
    clearToolState()
    _drawCachedSnapshot()
  }

  function onCancelTool() {
    clearToolState()
    nextTick(() => _syncCanvasSize().then(() => _drawCachedSnapshot()))
  }

  function onUndo() {
    if (isEditing.value || !canUndo.value) return
    currentIndex.value -= 1
    _loadSnapshotImage().then(() => _drawCachedSnapshot())
  }

  function onRedo() {
    if (isEditing.value || !canRedo.value) return
    currentIndex.value += 1
    _loadSnapshotImage().then(() => _drawCachedSnapshot())
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
      },
    })
  }

  function onCancel() {
    uni.navigateBack()
  }

  function onCanvasTouchStart(event) {
    if (!isEditing.value) return
    currentPlugin.value?.onTouchStart?.(event)
  }

  function onCanvasTouchMove(event) {
    if (!isEditing.value) return
    currentPlugin.value?.onTouchMove?.(event)
  }

  function onCanvasTouchEnd(event) {
    if (!isEditing.value) return
    currentPlugin.value?.onTouchEnd?.(event)
  }

  // ── 旋转渲染/导出 ──

  function _renderRotateOverlay(angle) {
    if (angle === 0 || !snapshotImage) return
    const ctx = canvasCtx
    const ir = imageRect
    const cx = canvasWidth.value / 2
    const cy = canvasHeight.value / 2

    ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angle * Math.PI / 180)
    ctx.drawImage(snapshotImage, -ir.w / 2, -ir.h / 2, ir.w, ir.h)
    ctx.restore()
  }

  async function _exportRotate(angle) {
    if (angle === 0) return null
    uni.showLoading({ title: '处理中...' })
    try {
      const snapshot = currentSnapshot.value
      const rad = angle * Math.PI / 180
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
      return { tempFilePath: newFilePath, width: newW, height: newH }
    } catch (err) {
      console.error('Confirm rotate failed:', err)
      uni.showToast({ title: '处理失败', icon: 'none' })
      return null
    } finally {
      uni.hideLoading()
    }
  }

  // ── 裁剪渲染/导出 ──

  function _renderCropOverlay(rect) {
    const ctx = canvasCtx
    const ir = imageRect
    const cr = rect
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

  async function _exportCrop(rect) {
    const cr = rect
    const ir = imageRect
    if (!ir || cr.w < 10 || cr.h < 10) return null
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
      return { tempFilePath: newFilePath, width: cropW, height: cropH }
    } catch (err) {
      console.error('Confirm crop failed:', err)
      uni.showToast({ title: '处理失败', icon: 'none' })
      return null
    } finally {
      uni.hideLoading()
    }
  }

  // ── 画笔渲染/导出 ──

  function _renderDrawOverlay(payload) {
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

    payload.paths.forEach(drawStroke)
    if (payload.currentPath.length > 1) {
      drawStroke({ points: payload.currentPath, color: payload.color, width: payload.width })
    }
  }

  async function _exportDraw(payload) {
    if (payload.paths.length === 0) return null
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

      payload.paths.forEach((stroke) => {
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
      return { tempFilePath: newFilePath, width: snapshot.width, height: snapshot.height }
    } catch (err) {
      console.error('Confirm draw failed:', err)
      uni.showToast({ title: '处理失败', icon: 'none' })
      return null
    } finally {
      uni.hideLoading()
    }
  }

  // ── 贴纸渲染/导出/手势 ──

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

    const rotateOffset = 30
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, -fh)
    ctx.lineTo(0, -fh - rotateOffset)
    ctx.stroke()

    ctx.fillStyle = '#007AFF'
    ctx.beginPath()
    ctx.arc(0, -fh - rotateOffset, 10, 0, Math.PI * 2)
    ctx.fill()

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
    const localX = fw
    const localY = -fh - 16
    const cos = Math.cos(el.rotation)
    const sin = Math.sin(el.rotation)
    return {
      x: el.x + localX * cos - localY * sin,
      y: el.y + localX * sin + localY * cos,
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

  function _renderStickerOverlay(elements) {
    const ctx = canvasCtx
    let deleteBtnPos = null

    elements.forEach(el => {
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
        deleteBtnPos = _getDeleteBtnWorldPos(el, halfW, halfH)
      }

      ctx.restore()
    })

    if (deleteBtnPos) {
      _drawDeleteBtn(ctx, deleteBtnPos.x, deleteBtnPos.y)
    }
  }

  async function _exportSticker(elements) {
    if (elements.length === 0) return null
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

      elements.forEach(s => {
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
      return { tempFilePath: newFilePath, width: snapshot.width, height: snapshot.height }
    } catch (err) {
      console.error('Confirm sticker failed:', err)
      uni.showToast({ title: '处理失败', icon: 'none' })
      return null
    } finally {
      uni.hideLoading()
    }
  }

  function _stickerTouchStart(elements, event) {
    const touch = event.touches?.[0] || event
    const tx = touch.x
    const ty = touch.y

    if (selectedId.value && selectedType.value === 'sticker') {
      const el = elements.find(s => s.id === selectedId.value)
      if (el) {
        const { halfW, halfH } = _getStickerBounds(el)
        const pad = 12
        const fw = halfW + pad
        const fh = halfH + pad
        const local = _hitToLocal(tx, ty, el)

        const dp = _getDeleteBtnWorldPos(el, halfW, halfH)
        if (_dist(tx, ty, dp.x, dp.y) <= 14) {
          const idx = elements.indexOf(el)
          if (idx >= 0) elements.splice(idx, 1)
          selectedId.value = null
          renderPreview()
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

    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i]
      const { halfW, halfH } = _getStickerBounds(el)
      const pad = 12
      const local = _hitToLocal(tx, ty, el)
      if (Math.abs(local.x) <= halfW + pad && Math.abs(local.y) <= halfH + pad) {
        selectedId.value = el.id
        selectedType.value = 'sticker'
        dragMode = 'move'
        dragStart = { x: tx, y: ty, sx: el.x, sy: el.y }
        renderPreview()
        return
      }
    }

    if (selectedId.value && selectedType.value === 'sticker') {
      selectedId.value = null
      selectedType.value = ''
      renderPreview()
    }
  }

  function _stickerTouchMove(elements, event) {
    if (!selectedId.value || selectedType.value !== 'sticker' || !dragStart) return
    const el = elements.find(s => s.id === selectedId.value)
    if (!el) return

    const touch = event.touches?.[0] || event
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

    renderPreview()
  }

  // ── 文字渲染/导出/手势 ──

  function _getTextBounds(el) {
    const ctx = canvasCtx
    ctx.font = `bold ${el.fontSize}px -apple-system, "PingFang SC", sans-serif`
    const textW = ctx.measureText(el.content).width
    return { halfW: textW / 2 + 12, halfH: el.fontSize * 0.7 }
  }

  function _renderTextOverlay(elements) {
    const ctx = canvasCtx
    let deleteBtnPos = null

    elements.forEach(el => {
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

  async function _exportText(elements) {
    if (elements.length === 0) return null
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

      elements.forEach(t => {
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
      return { tempFilePath: newFilePath, width: snapshot.width, height: snapshot.height }
    } catch (err) {
      console.error('Confirm text failed:', err)
      uni.showToast({ title: '处理失败', icon: 'none' })
      return null
    } finally {
      uni.hideLoading()
    }
  }

  function _textTouchStart(elements, event) {
    const touch = event.touches?.[0] || event
    const tx = touch.x
    const ty = touch.y

    if (selectedId.value && selectedType.value === 'text') {
      const el = elements.find(t => t.id === selectedId.value)
      if (el) {
        const { halfW, halfH } = _getTextBounds(el)
        const pad = 12
        const fw = halfW + pad
        const fh = halfH + pad
        const local = _hitToLocal(tx, ty, el)

        const dp = _getDeleteBtnWorldPos(el, halfW, halfH)
        if (_dist(tx, ty, dp.x, dp.y) <= 14) {
          const idx = elements.indexOf(el)
          if (idx >= 0) elements.splice(idx, 1)
          selectedId.value = null
          renderPreview()
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

    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i]
      const { halfW, halfH } = _getTextBounds(el)
      const pad = 12
      const local = _hitToLocal(tx, ty, el)
      if (Math.abs(local.x) <= halfW + pad && Math.abs(local.y) <= halfH + pad) {
        selectedId.value = el.id
        selectedType.value = 'text'
        dragMode = 'move'
        dragStart = { x: tx, y: ty, sx: el.x, sy: el.y }
        renderPreview()
        return
      }
    }

    if (selectedId.value && selectedType.value === 'text') {
      selectedId.value = null
      selectedType.value = ''
      renderPreview()
    }
  }

  function _textTouchMove(elements, event) {
    if (!selectedId.value || selectedType.value !== 'text' || !dragStart) return
    const el = elements.find(t => t.id === selectedId.value)
    if (!el) return

    const touch = event.touches?.[0] || event
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

    renderPreview()
  }

  function getPluginPanelProps(key) {
    const plugin = pluginInstances.find(item => item.key === key)?.instance
    return plugin?.getPanelProps?.() || {}
  }

  function getPluginPanelActions(key) {
    const plugin = pluginInstances.find(item => item.key === key)?.instance
    return plugin?.getPanelActions?.() || {}
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
    onCancel,
    onCanvasTouchStart,
    onCanvasTouchMove,
    onCanvasTouchEnd,
    getPluginPanelProps,
    getPluginPanelActions,
  }
}
