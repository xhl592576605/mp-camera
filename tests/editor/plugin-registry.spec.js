import { describe, expect, it } from 'vitest'
import { createEditorPluginRegistry } from '@/pages/editor/plugins'

describe('createEditorPluginRegistry', () => {
  it('按工具栏顺序暴露固定的工具元信息', () => {
    const registry = createEditorPluginRegistry()

    expect(registry.map(item => item.key)).toEqual([
      'crop',
      'rotate',
      'sticker',
      'text',
      'draw',
    ])

    registry.forEach((item) => {
      expect(item.label).toBeTruthy()
      expect(item.icon).toBeTruthy()
      expect(item.order).toEqual(expect.any(Number))
      expect(item.panelComponent).toBeTruthy()
      expect(item.create).toEqual(expect.any(Function))
    })
  })
})
