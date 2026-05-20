import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useEditor } from '@/pages/editor/hooks/useEditor'

function createPlugin(key) {
  return {
    key,
    label: key,
    icon: key,
    order: 0,
    panelComponent: { name: `${key}-panel` },
    create() {
      return {
        key,
        requiresConfirm: true,
        supportsLivePreview: true,
        activate: vi.fn(),
        deactivate: vi.fn(),
        reset: vi.fn(),
        onTouchStart: vi.fn(),
        onTouchMove: vi.fn(),
        onTouchEnd: vi.fn(),
        renderPreview: vi.fn(),
        commit: vi.fn(async () => null),
        getPanelProps: vi.fn(() => ({ key })),
        getPanelActions: vi.fn(() => ({ setValue: vi.fn() })),
      }
    },
  }
}

describe('useEditor', () => {
  it('选择工具后暴露当前面板和面板参数', async () => {
    const editor = useEditor({
      plugins: [createPlugin('rotate'), createPlugin('draw')],
      autoInit: false,
    })

    await editor.selectTool('draw')
    await nextTick()

    expect(editor.activeTool.value).toBe('draw')
    expect(editor.isEditing.value).toBe(true)
    expect(editor.activePanelComponent.value).toBeTruthy()
    expect(editor.activePanelProps.value).toEqual({ key: 'draw' })
  })

  it('暴露工具确认、取消和保存入口', () => {
    const editor = useEditor({
      plugins: [],
      autoInit: false,
    })

    expect(editor.onConfirmTool).toEqual(expect.any(Function))
    expect(editor.onCancelTool).toEqual(expect.any(Function))
    expect(editor.onSave).toEqual(expect.any(Function))
  })

  it('onConfirmTool 无 commit 结果时重置编辑状态', async () => {
    const plugin = createPlugin('draw')
    const editor = useEditor({
      plugins: [plugin],
      autoInit: false,
    })

    await editor.selectTool('draw')
    await nextTick()
    expect(editor.isEditing.value).toBe(true)

    await editor.onConfirmTool()
    await nextTick()

    expect(editor.activeTool.value).toBe('')
    expect(editor.isEditing.value).toBe(false)
  })

  it('onCancelTool 重置编辑状态', async () => {
    const plugin = createPlugin('draw')
    const editor = useEditor({
      plugins: [plugin],
      autoInit: false,
    })

    await editor.selectTool('draw')
    await nextTick()
    expect(editor.isEditing.value).toBe(true)

    editor.onCancelTool()
    await nextTick()

    expect(editor.activeTool.value).toBe('')
    expect(editor.isEditing.value).toBe(false)
  })
})
