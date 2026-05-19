import CropToolPanel from '../components/CropToolPanel.vue'
import RotateToolPanel from '../components/RotateToolPanel.vue'
import StickerToolPanel from '../components/StickerToolPanel.vue'
import TextToolPanel from '../components/TextToolPanel.vue'
import DrawToolPanel from '../components/DrawToolPanel.vue'
import { useRotatePlugin } from './useRotatePlugin'
import { useCropPlugin } from './useCropPlugin'
import { useDrawPlugin } from './useDrawPlugin'
import { useStickerPlugin } from './useStickerPlugin'
import { useTextPlugin } from './useTextPlugin'

export function createEditorPluginRegistry() {
  return [
    {
      key: 'crop',
      label: '裁剪',
      icon: '⬚',
      order: 0,
      visible: true,
      enabled: true,
      panelComponent: CropToolPanel,
      create: (context) => useCropPlugin(context),
    },
    {
      key: 'rotate',
      label: '旋转',
      icon: '↻',
      order: 1,
      visible: true,
      enabled: true,
      panelComponent: RotateToolPanel,
      create: (context) => useRotatePlugin(context),
    },
    {
      key: 'sticker',
      label: '贴纸',
      icon: '★',
      order: 2,
      visible: true,
      enabled: true,
      panelComponent: StickerToolPanel,
      create: (context) => useStickerPlugin(context),
    },
    {
      key: 'text',
      label: '文字',
      icon: 'T',
      order: 3,
      visible: true,
      enabled: true,
      panelComponent: TextToolPanel,
      create: (context) => useTextPlugin(context),
    },
    {
      key: 'draw',
      label: '画笔',
      icon: '✎',
      order: 4,
      visible: true,
      enabled: true,
      panelComponent: DrawToolPanel,
      create: (context) => useDrawPlugin(context),
    },
  ]
}
