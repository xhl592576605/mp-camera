import { describe, expect, it, vi } from 'vitest'
import { useStickerPlugin } from '@/pages/editor/plugins/useStickerPlugin'
import { useTextPlugin } from '@/pages/editor/plugins/useTextPlugin'

describe('sticker and text plugins', () => {
  it('添加贴纸后会暴露选中元素', () => {
    const plugin = useStickerPlugin({
      requestRender: vi.fn(),
      getImageRect: () => ({ x: 0, y: 0, w: 300, h: 200 }),
      setSelection: vi.fn(),
    })

    plugin.activate()
    plugin.getPanelActions().addSticker({ emoji: '⭐' })

    expect(plugin.getPanelProps().elements).toHaveLength(1)
    expect(plugin.getPanelProps().elements[0].emoji).toBe('⭐')
  })

  it('添加文字后会把内容放入文字元素列表', () => {
    const plugin = useTextPlugin({
      requestRender: vi.fn(),
      getImageRect: () => ({ x: 0, y: 0, w: 300, h: 200 }),
      setSelection: vi.fn(),
    })

    plugin.activate()
    plugin.getPanelActions().setInput('打卡完成')
    plugin.getPanelActions().addText()

    expect(plugin.getPanelProps().elements).toHaveLength(1)
    expect(plugin.getPanelProps().elements[0].content).toBe('打卡完成')
  })
})
