import { ref } from 'vue'

export function useTextPlugin(context) {
  const elements = ref([])
  const input = ref('')
  const color = ref('#FFFFFF')
  const fontSize = ref(32)
  const sizes = [
    { value: 24, label: '小' },
    { value: 32, label: '中' },
    { value: 44, label: '大' },
  ]

  return {
    key: 'text',
    requiresConfirm: true,
    supportsLivePreview: true,
    activate() {},
    deactivate() {},
    reset() {
      elements.value = []
      input.value = ''
    },
    onTouchStart(event) {
      context.handleTextTouchStart?.(elements.value, event)
    },
    onTouchMove(event) {
      context.handleTextTouchMove?.(elements.value, event)
    },
    onTouchEnd() {
      context.finishElementGesture?.()
    },
    renderPreview() {
      context.renderTextPreview?.(elements.value)
    },
    async commit() {
      if (elements.value.length === 0) return null
      return context.exportText?.(elements.value)
    },
    getPanelProps() {
      return {
        textInputContent: input.value,
        textColor: color.value,
        textFontSize: fontSize.value,
        textSizes: sizes,
        drawColors: ['#FFFFFF', '#000000', '#E63946', '#FFD166', '#4ECDC4'],
        elements: elements.value,
      }
    },
    getPanelActions() {
      return {
        setInput(value) {
          input.value = value
        },
        setColor(value) {
          color.value = value
        },
        setFontSize(value) {
          fontSize.value = value
        },
        addText() {
          if (!input.value.trim()) return
          const imageRect = context.getImageRect?.()
          const id = Date.now()
          elements.value.push({
            id,
            content: input.value.trim(),
            x: imageRect.x + imageRect.w / 2,
            y: imageRect.y + imageRect.h / 2,
            fontSize: fontSize.value,
            color: color.value,
            rotation: 0,
          })
          context.setSelection?.({ id, type: 'text' })
          context.requestRender?.()
        },
      }
    },
  }
}
