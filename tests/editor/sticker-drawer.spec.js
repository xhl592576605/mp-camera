import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import StickerToolPanel from '@/pages/editor/components/StickerToolPanel.vue'
import { useStickerPlugin } from '@/pages/editor/plugins/useStickerPlugin'

function createPluginContext(overrides = {}) {
  return {
    requestRender: vi.fn(),
    getImageRect: () => ({ x: 0, y: 0, w: 300, h: 200 }),
    setSelection: vi.fn(),
    ...overrides,
  }
}

const mockCategories = [
  {
    key: 'emoji',
    label: '表情',
    icon: '😀',
    type: 'emoji',
    items: [
      { emoji: '⭐', name: 'star' },
      { emoji: '🔥', name: 'fire' },
    ],
  },
]

describe('StickerToolPanel — collapse toggle', () => {
  it('点击折叠按钮后隐藏贴纸网格并发出 collapseToggle(true)', async () => {
    const wrapper = mount(StickerToolPanel, {
      props: { categories: mockCategories },
    })

    expect(wrapper.find('.sticker-grid-scroll').exists()).toBe(true)

    await wrapper.find('.collapse-toggle').trigger('tap')
    await nextTick()

    expect(wrapper.find('.sticker-grid-scroll').exists()).toBe(false)
    expect(wrapper.emitted('collapseToggle')).toBeTruthy()
    expect(wrapper.emitted('collapseToggle')[0]).toEqual([{ collapsed: true }])
  })

  it('再次点击折叠按钮展开网格并发出 collapseToggle(false)', async () => {
    const wrapper = mount(StickerToolPanel, {
      props: { categories: mockCategories },
    })

    await wrapper.find('.collapse-toggle').trigger('tap')
    await nextTick()

    expect(wrapper.find('.sticker-grid-scroll').exists()).toBe(false)

    await wrapper.find('.collapse-toggle').trigger('tap')
    await nextTick()

    expect(wrapper.find('.sticker-grid-scroll').exists()).toBe(true)
    expect(wrapper.emitted('collapseToggle')[1]).toEqual([{ collapsed: false }])
  })
})

describe('sticker plugin — drawer mode', () => {
  it('getPanelProps 返回分类数据', () => {
    const plugin = useStickerPlugin(createPluginContext())
    const props = plugin.getPanelProps()

    expect(props.categories).toBeDefined()
    expect(props.categories.length).toBeGreaterThanOrEqual(3)

    const first = props.categories[0]
    expect(first).toHaveProperty('key')
    expect(first).toHaveProperty('label')
    expect(first).toHaveProperty('icon')
    expect(first).toHaveProperty('type')
    expect(first).toHaveProperty('items')
    expect(first.items.length).toBeGreaterThan(0)
  })

  it('每个分类的 item 结构正确（emoji 类型）', () => {
    const plugin = useStickerPlugin(createPluginContext())
    const props = plugin.getPanelProps()
    const emojiCat = props.categories.find(c => c.type === 'emoji')

    expect(emojiCat).toBeDefined()
    const item = emojiCat.items[0]
    expect(item).toHaveProperty('emoji')
    expect(item).toHaveProperty('name')
  })

  it('每个分类的 item 结构正确（image 类型）', () => {
    const plugin = useStickerPlugin(createPluginContext())
    const props = plugin.getPanelProps()
    const imageCat = props.categories.find(c => c.type === 'image')

    if (!imageCat || imageCat.items.length === 0) return
    const item = imageCat.items[0]
    expect(item).toHaveProperty('src')
    expect(item).toHaveProperty('name')
  })

  it('addSticker(emoji) 创建 emoji 类型元素', () => {
    const plugin = useStickerPlugin(createPluginContext())
    plugin.activate()
    plugin.getPanelActions().addSticker({ emoji: '⭐' })

    const el = plugin.getPanelProps().elements[0]
    expect(el.type).toBe('emoji')
    expect(el.emoji).toBe('⭐')
    expect(el.fontSize).toBe(48)
    expect(el.flipX).toBe(false)
    expect(el.rotation).toBe(0)
  })

  it('addSticker(image) 创建 image 类型元素', () => {
    const plugin = useStickerPlugin(createPluginContext())
    plugin.activate()
    plugin.getPanelActions().addSticker({ src: '/static/stickers/test.png', name: '测试贴纸' })

    const el = plugin.getPanelProps().elements[0]
    expect(el.type).toBe('image')
    expect(el.src).toBe('/static/stickers/test.png')
    expect(el.width).toBe(80)
    expect(el.height).toBe(80)
    expect(el.flipX).toBe(false)
    expect(el.rotation).toBe(0)
  })

  it('reset 清空所有贴纸元素', () => {
    const plugin = useStickerPlugin(createPluginContext())
    plugin.activate()
    plugin.getPanelActions().addSticker({ emoji: '⭐' })
    plugin.getPanelActions().addSticker({ emoji: '🔥' })

    expect(plugin.getPanelProps().elements).toHaveLength(2)

    plugin.reset()
    expect(plugin.getPanelProps().elements).toHaveLength(0)
  })

  it('reset 后能重新添加贴纸', () => {
    const plugin = useStickerPlugin(createPluginContext())
    plugin.activate()
    plugin.getPanelActions().addSticker({ emoji: '⭐' })
    plugin.reset()

    plugin.getPanelActions().addSticker({ emoji: '🔥' })
    expect(plugin.getPanelProps().elements).toHaveLength(1)
    expect(plugin.getPanelProps().elements[0].emoji).toBe('🔥')
  })
})
