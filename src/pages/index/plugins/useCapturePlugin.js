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
      context.flash.value = context.flash.value === 'torch' ? 'off' : 'torch'
    },
    onToggleCamera() {
      context.devicePosition.value = context.devicePosition.value === 'back' ? 'front' : 'back'
    },
  }
}
