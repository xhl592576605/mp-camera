import { ref } from 'vue'

export function useCropPlugin(context) {
  const rect = ref({ x: 0, y: 0, w: 0, h: 0 })
  const ratio = ref('')
  let dragging = ''
  let startPos = null
  let startRect = null

  function initRect() {
    const imageRect = context.getImageRect?.()
    if (!imageRect) return
    let w, h
    if (ratio.value === '1:1') {
      const size = Math.min(imageRect.w, imageRect.h) * 0.8
      w = size; h = size
    } else if (ratio.value === '4:3') {
      w = imageRect.w * 0.8; h = w * 3 / 4
      if (h > imageRect.h * 0.8) { h = imageRect.h * 0.8; w = h * 4 / 3 }
    } else if (ratio.value === '16:9') {
      w = imageRect.w * 0.8; h = w * 9 / 16
      if (h > imageRect.h * 0.8) { h = imageRect.h * 0.8; w = h * 16 / 9 }
    } else {
      w = imageRect.w * 0.8; h = imageRect.h * 0.8
    }
    rect.value = {
      x: imageRect.x + (imageRect.w - w) / 2,
      y: imageRect.y + (imageRect.h - h) / 2,
      w, h,
    }
    context.requestRender?.()
  }

  return {
    key: 'crop',
    requiresConfirm: true,
    supportsLivePreview: true,
    activate() {
      ratio.value = ''
      initRect()
    },
    deactivate() {},
    reset() {
      dragging = ''
      startPos = null
      startRect = null
      rect.value = { x: 0, y: 0, w: 0, h: 0 }
      ratio.value = ''
    },
    onTouchStart(event) {
      const touch = event.touches?.[0] || event
      const cr = rect.value
      const imageRect = context.getImageRect?.()
      if (!imageRect) return

      const handleSize = 30
      const corners = [
        { key: 'tl', x: cr.x, y: cr.y },
        { key: 'tr', x: cr.x + cr.w, y: cr.y },
        { key: 'bl', x: cr.x, y: cr.y + cr.h },
        { key: 'br', x: cr.x + cr.w, y: cr.y + cr.h },
      ]
      for (const c of corners) {
        if (Math.abs(touch.x - c.x) < handleSize && Math.abs(touch.y - c.y) < handleSize) {
          dragging = c.key
          startPos = { x: touch.x, y: touch.y }
          startRect = { ...cr }
          return
        }
      }
      if (touch.x >= cr.x && touch.x <= cr.x + cr.w && touch.y >= cr.y && touch.y <= cr.y + cr.h) {
        dragging = 'move'
        startPos = { x: touch.x, y: touch.y }
        startRect = { ...cr }
      }
    },
    onTouchMove(event) {
      if (!dragging || !startPos) return
      const touch = event.touches?.[0] || event
      const imageRect = context.getImageRect?.()
      const dx = touch.x - startPos.x
      const dy = touch.y - startPos.y
      const sr = startRect
      const ir = imageRect
      const minSize = 50
      let r = { ...sr }

      if (dragging === 'move') {
        r.x = Math.max(ir.x, Math.min(sr.x + dx, ir.x + ir.w - sr.w))
        r.y = Math.max(ir.y, Math.min(sr.y + dy, ir.y + ir.h - sr.h))
      } else if (dragging === 'br') {
        r.w = Math.max(minSize, Math.min(sr.w + dx, ir.x + ir.w - sr.x))
        r.h = Math.max(minSize, Math.min(sr.h + dy, ir.y + ir.h - sr.y))
        if (ratio.value) {
          const parts = ratio.value.split(':').map(Number)
          const ratioVal = parts[0] / parts[1]
          r.h = r.w / ratioVal
          if (sr.y + r.h > ir.y + ir.h) { r.h = ir.y + ir.h - sr.y; r.w = r.h * ratioVal }
        }
      } else if (dragging === 'tl') {
        r.x = Math.max(ir.x, sr.x + dx)
        r.y = Math.max(ir.y, sr.y + dy)
        r.w = Math.max(minSize, sr.x + sr.w - r.x)
        r.h = Math.max(minSize, sr.y + sr.h - r.y)
      } else if (dragging === 'tr') {
        r.w = Math.max(minSize, Math.min(sr.w + dx, ir.x + ir.w - sr.x))
        r.y = Math.max(ir.y, sr.y + dy)
        r.h = Math.max(minSize, sr.y + sr.h - r.y)
      } else if (dragging === 'bl') {
        r.x = Math.max(ir.x, sr.x + dx)
        r.w = Math.max(minSize, sr.x + sr.w - r.x)
        r.h = Math.max(minSize, Math.min(sr.h + dy, ir.y + ir.h - sr.y))
      }

      rect.value = r
      context.requestRender?.()
    },
    onTouchEnd() {
      dragging = ''
      startPos = null
      startRect = null
    },
    renderPreview() {
      context.renderCropPreview?.(rect.value)
    },
    async commit() {
      return context.exportCrop?.(rect.value)
    },
    getPanelProps() {
      return {
        ratio: ratio.value,
        rect: rect.value,
        ratios: [
          { key: '', label: '自由' },
          { key: '1:1', label: '1:1' },
          { key: '4:3', label: '4:3' },
          { key: '16:9', label: '16:9' },
        ],
      }
    },
    getPanelActions() {
      return {
        setRatio(value) {
          ratio.value = value
          initRect()
        },
      }
    },
  }
}
