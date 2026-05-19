import { vi } from 'vitest'

const selectorQuery = {
  in() {
    return this
  },
  select() {
    return this
  },
  fields() {
    return this
  },
  exec(callback) {
    callback?.([])
  },
}

globalThis.uni = {
  showToast: vi.fn(),
  showLoading: vi.fn(),
  hideLoading: vi.fn(),
  navigateBack: vi.fn(),
  navigateTo: vi.fn(),
  openSetting: vi.fn(),
  chooseMedia: vi.fn(),
  saveImageToPhotosAlbum: vi.fn(),
  getImageInfo: vi.fn(),
  getLocation: vi.fn(),
  getWindowInfo: vi.fn(() => ({ pixelRatio: 2 })),
  getSystemInfoSync: vi.fn(() => ({ pixelRatio: 2 })),
  createSelectorQuery: vi.fn(() => selectorQuery),
  createCameraContext: vi.fn(() => ({
    takePhoto: vi.fn(),
    startRecord: vi.fn(),
    stopRecord: vi.fn(),
  })),
}
