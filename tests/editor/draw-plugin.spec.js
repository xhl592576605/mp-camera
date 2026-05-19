import { describe, expect, it, vi } from 'vitest'
import { useDrawPlugin } from '@/pages/editor/plugins/useDrawPlugin'

describe('useDrawPlugin', () => {
  it('记录当前路径并在 touch end 时沉淀为笔画', () => {
    const requestRender = vi.fn()
    const plugin = useDrawPlugin({ requestRender })

    plugin.activate()
    plugin.onTouchStart({ touches: [{ x: 10, y: 10 }] })
    plugin.onTouchMove({ touches: [{ x: 20, y: 20 }] })
    plugin.onTouchEnd()

    const props = plugin.getPanelProps()
    expect(props.paths).toHaveLength(1)
    expect(props.paths[0].points).toEqual([{ x: 10, y: 10 }, { x: 20, y: 20 }])
    expect(requestRender).toHaveBeenCalled()
  })
})
