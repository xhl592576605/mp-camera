import { ref } from 'vue'

export function useRotatePlugin(context) {
  const angle = ref(0)

  function normalize(next) {
    let value = ((next % 360) + 360) % 360
    if (value > 180) value -= 360
    return value
  }

  function updateAngle(next) {
    angle.value = normalize(next)
    context.requestRender?.()
  }

  return {
    key: 'rotate',
    requiresConfirm: true,
    supportsLivePreview: true,
    activate() {
      angle.value = 0
    },
    deactivate() {},
    reset() {
      angle.value = 0
    },
    onTouchStart() {},
    onTouchMove() {},
    onTouchEnd() {},
    renderPreview() {
      context.renderRotatePreview?.(angle.value)
    },
    async commit() {
      if (angle.value === 0) return null
      return context.exportRotate?.(angle.value)
    },
    getPanelProps() {
      return { angle: angle.value }
    },
    getPanelActions() {
      return {
        rotateLeft: () => updateAngle(angle.value - 90),
        rotateRight: () => updateAngle(angle.value + 90),
        changeAngle: (value) => updateAngle(Number(value)),
      }
    },
  }
}
