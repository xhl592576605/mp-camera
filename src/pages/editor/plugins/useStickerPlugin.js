import { ref } from 'vue'

const DEFAULT_STICKERS = [
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
]

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
        stickerList: DEFAULT_STICKERS,
        elements: elements.value,
      }
    },
    getPanelActions() {
      return {
        addSticker(sticker) {
          const imageRect = context.getImageRect?.()
          const id = Date.now()
          elements.value.push({
            id,
            emoji: sticker.emoji,
            x: imageRect.x + imageRect.w / 2,
            y: imageRect.y + imageRect.h / 2,
            fontSize: 48,
            flipX: false,
            rotation: 0,
          })
          context.setSelection?.({ id, type: 'sticker' })
          context.requestRender?.()
        },
      }
    },
  }
}
