import { describe, expect, it, vi } from 'vitest'
import { useCropPlugin } from '@/pages/editor/plugins/useCropPlugin'

describe('useCropPlugin', () => {
  it('切换裁剪比例后会更新面板状态并请求重绘', () => {
    const requestRender = vi.fn()
    const plugin = useCropPlugin({
      requestRender,
      getImageRect: () => ({ x: 0, y: 0, w: 300, h: 200 }),
    })

    plugin.activate()
    plugin.getPanelActions().setRatio('1:1')

    expect(plugin.getPanelProps().ratio).toBe('1:1')
    expect(plugin.getPanelProps().rect.w).toBe(plugin.getPanelProps().rect.h)
    expect(requestRender).toHaveBeenCalled()
  })
})
