import { ref } from 'vue'

export function useDrawPlugin(context) {
  const isDrawing = ref(false)
  const currentPath = ref([])
  const paths = ref([])
  const color = ref('#FFFFFF')
  const width = ref(3)
  const colors = ['#FFFFFF', '#000000', '#E63946', '#FFD166', '#4ECDC4']
  const widths = [2, 5, 10]

  return {
    key: 'draw',
    requiresConfirm: true,
    supportsLivePreview: true,
    activate() {
      isDrawing.value = false
      currentPath.value = []
      paths.value = []
    },
    deactivate() {},
    reset() {
      isDrawing.value = false
      currentPath.value = []
      paths.value = []
    },
    onTouchStart(event) {
      const touch = event.touches?.[0] || event
      isDrawing.value = true
      currentPath.value = [{ x: touch.x, y: touch.y }]
    },
    onTouchMove(event) {
      if (!isDrawing.value) return
      const touch = event.touches?.[0] || event
      currentPath.value.push({ x: touch.x, y: touch.y })
      context.requestRender?.()
    },
    onTouchEnd() {
      if (isDrawing.value && currentPath.value.length > 1) {
        paths.value.push({
          points: [...currentPath.value],
          color: color.value,
          width: width.value,
        })
      }
      isDrawing.value = false
      currentPath.value = []
      context.requestRender?.()
    },
    renderPreview() {
      context.renderDrawPreview?.({
        paths: paths.value,
        currentPath: currentPath.value,
        color: color.value,
        width: width.value,
      })
    },
    async commit() {
      if (paths.value.length === 0) return null
      return context.exportDraw?.({
        paths: paths.value,
      })
    },
    getPanelProps() {
      return {
        color: color.value,
        width: width.value,
        colors,
        widths,
        paths: paths.value,
      }
    },
    getPanelActions() {
      return {
        setColor: (value) => {
          color.value = value
          context.requestRender?.()
        },
        setWidth: (value) => {
          width.value = value
          context.requestRender?.()
        },
      }
    },
  }
}
