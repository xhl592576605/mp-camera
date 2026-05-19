import { describe, expect, it, vi } from 'vitest'
import { useCamera } from '@/pages/index/hooks/useCamera'

function createCameraPlugin(key) {
  return {
    key,
    create() {
      return {
        key,
        activate: vi.fn(),
        deactivate: vi.fn(),
        onShutterStart: vi.fn(),
        onShutterEnd: vi.fn(),
        onToggle: vi.fn(),
      }
    },
  }
}

describe('useCamera', () => {
  it('根据插件注册暴露基础动作入口', () => {
    const camera = useCamera({
      plugins: [createCameraPlugin('capture')],
      autoInit: false,
    })

    expect(camera.onShutterStart).toEqual(expect.any(Function))
    expect(camera.onShutterEnd).toEqual(expect.any(Function))
    expect(camera.onChooseFromAlbum).toEqual(expect.any(Function))
  })

  it('快门插件会编排拍照和录像状态', () => {
    const state = { value: false }
    const plugin = {
      key: 'capture',
      create() {
        return {
          onShutterStart() {
            state.value = true
          },
          onShutterEnd() {
            state.value = false
          },
        }
      },
    }
    const camera = useCamera({
      plugins: [plugin],
      autoInit: false,
    })

    camera.onShutterStart()
    expect(state.value).toBe(true)
    camera.onShutterEnd()
    expect(state.value).toBe(false)
  })
})
