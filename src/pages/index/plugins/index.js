import { useWatermarkPlugin } from './useWatermarkPlugin'
import { useCapturePlugin } from './useCapturePlugin'
import { useMediaPickerPlugin } from './useMediaPickerPlugin'

export function createCameraPluginRegistry() {
  return [
    { key: 'watermark', create: (context) => useWatermarkPlugin(context) },
    { key: 'capture', create: (context) => useCapturePlugin(context) },
    { key: 'mediaPicker', create: (context) => useMediaPickerPlugin(context) },
  ]
}
