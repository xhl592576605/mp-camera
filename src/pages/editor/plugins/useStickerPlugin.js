import { ref } from 'vue'
import { STICKER_CATEGORIES } from '@/constants/stickerData'

export function useStickerPlugin(context) {
  const elements = ref([])

  return {
    key: 'sticker',
    requiresConfirm: true,
    supportsLivePreview: true,
    activate() {},
    deactivate() {},
    reset() {
      elements.value = []
    },
    onTouchStart(event) {
      context.handleStickerTouchStart?.(elements.value, event)
    },
    onTouchMove(event) {
      context.handleStickerTouchMove?.(elements.value, event)
    },
    onTouchEnd() {
      context.finishElementGesture?.()
    },
    renderPreview() {
      context.renderStickerPreview?.(elements.value)
    },
    async commit() {
      if (elements.value.length === 0) return null
      return context.exportSticker?.(elements.value)
    },
    getPanelProps() {
      return {
        categories: STICKER_CATEGORIES,
        elements: elements.value,
      }
    },
    getPanelActions() {
      return {
        addSticker(sticker) {
          const imageRect = context.getImageRect?.()
          const id = Date.now()

          if (sticker.src) {
            elements.value.push({
              id,
              type: 'image',
              src: sticker.src,
              x: imageRect.x + imageRect.w / 2,
              y: imageRect.y + imageRect.h / 2,
              width: 80,
              height: 80,
              flipX: false,
              rotation: 0,
            })
          } else {
            elements.value.push({
              id,
              type: 'emoji',
              emoji: sticker.emoji,
              x: imageRect.x + imageRect.w / 2,
              y: imageRect.y + imageRect.h / 2,
              fontSize: 48,
              flipX: false,
              rotation: 0,
            })
          }

          context.setSelection?.({ id, type: 'sticker' })
          context.requestRender?.()
        },
      }
    },
  }
}
