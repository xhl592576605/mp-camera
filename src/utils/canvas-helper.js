/**
 * Canvas 2D 工具函数
 */

import { getCurrentInstance } from 'vue'

export function getCanvasNode(vm, selector) {
  return new Promise((resolve, reject) => {
    const instance = vm || getCurrentInstance()?.proxy
    if (!instance) {
      reject(new Error('No component instance available'))
      return
    }
    const query = uni.createSelectorQuery().in(instance)
    query.select(selector)
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) {
          reject(new Error(`Canvas node not found: ${selector}`))
          return
        }
        resolve(res[0])
      })
  })
}

export function initCanvas(vm, selector) {
  return getCanvasNode(vm, selector).then((res) => {
    const canvas = res.node
    const dpr = (uni.getWindowInfo ? uni.getWindowInfo().pixelRatio : uni.getSystemInfoSync().pixelRatio) || 2
    canvas.width = res.width * dpr
    canvas.height = res.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    return { canvas, ctx, width: res.width, height: res.height, dpr }
  })
}

export function loadImage(canvas, src) {
  return new Promise((resolve, reject) => {
    const img = canvas.createImage()
    img.src = src
    img.onload = () => resolve(img)
    img.onerror = (err) => reject(err)
  })
}

export function canvasToTempFilePath(canvas, options = {}) {
  return new Promise((resolve, reject) => {
    uni.canvasToTempFilePath({
      canvas,
      ...options,
      success: (res) => resolve(res.tempFilePath),
      fail: (err) => reject(err)
    })
  })
}

export function getImageInfo(src) {
  return new Promise((resolve, reject) => {
    uni.getImageInfo({
      src,
      success: (res) => resolve(res),
      fail: (err) => reject(err)
    })
  })
}
