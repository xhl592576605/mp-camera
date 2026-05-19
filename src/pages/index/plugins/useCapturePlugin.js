export function useCapturePlugin(context) {
  let longPressTimer = null

  return {
    onShutterStart() {
      longPressTimer = setTimeout(() => {
        context.startRecord?.()
      }, 500)
    },
    onShutterEnd() {
      if (longPressTimer) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }
      if (context.isRecording.value) {
        context.stopRecord?.()
      } else {
        context.takePhoto?.()
      }
    },
    onToggleFlash() {
      const order = ['off', 'auto', 'on']
      const idx = order.indexOf(context.flash.value)
      context.flash.value = order[(idx + 1) % order.length]
    },
    onToggleCamera() {
      context.devicePosition.value = context.devicePosition.value === 'back' ? 'front' : 'back'
    },
  }
}
