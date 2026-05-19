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
import { ICON_GLYPHS } from '../../../constants/iconGlyphs'

export function createEditorPluginRegistry() {
  return [
    {
      key: 'crop',
      label: '裁剪',
      icon: 'icon-crop',
      glyph: ICON_GLYPHS.crop,
      order: 0,
      visible: true,
      enabled: true,
      panelComponent: CropToolPanel,
      create: (context) => useCropPlugin(context),
    },
    {
      key: 'rotate',
      label: '旋转',
      icon: 'icon-rotate-right',
      glyph: ICON_GLYPHS.rotateRight,
      order: 1,
      visible: true,
      enabled: true,
      panelComponent: RotateToolPanel,
      create: (context) => useRotatePlugin(context),
    },
    {
      key: 'sticker',
      label: '贴纸',
      icon: 'icon-sticker',
      glyph: ICON_GLYPHS.sticker,
      order: 2,
      visible: true,
      enabled: true,
      panelComponent: StickerToolPanel,
      create: (context) => useStickerPlugin(context),
    },
    {
      key: 'text',
      label: '文字',
      icon: 'icon-text',
      glyph: ICON_GLYPHS.text,
      order: 3,
      visible: true,
      enabled: true,
      panelComponent: TextToolPanel,
      create: (context) => useTextPlugin(context),
    },
    {
      key: 'draw',
      label: '画笔',
      icon: 'icon-draw',
      glyph: ICON_GLYPHS.draw,
      order: 4,
      visible: true,
      enabled: true,
      panelComponent: DrawToolPanel,
      create: (context) => useDrawPlugin(context),
    },
  ]
}
