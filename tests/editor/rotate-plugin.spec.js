import { describe, expect, it, vi } from 'vitest'
import { useRotatePlugin } from '@/pages/editor/plugins/useRotatePlugin'

describe('useRotatePlugin', () => {
  it('90 度旋转会归一化角度并触发重绘', () => {
    const requestRender = vi.fn()
    const plugin = useRotatePlugin({ requestRender })
    const actions = plugin.getPanelActions()

    actions.rotateRight()
    actions.rotateRight()
    actions.rotateRight()

    expect(plugin.getPanelProps().angle).toBe(-90)
    expect(requestRender).toHaveBeenCalledTimes(3)
  })
})
