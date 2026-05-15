<template>
  <view class="preview-page">
    <!-- 内容区 -->
    <view class="preview-content">
      <image v-if="type === 'image'" class="preview-image" :src="src" mode="aspectFit"></image>
      <video v-if="type === 'video'" class="preview-video" :src="src" :poster="thumbSrc" controls autoplay></video>
    </view>

    <!-- 底部操作 -->
    <view class="preview-actions safe-area-bottom">
      <view class="preview-btn btn-back" @tap="onRetake">
        <view class="btn-icon">↩</view>
        <view class="btn-text">重拍</view>
      </view>
      <view class="preview-btn btn-save" @tap="onSave">
        <view class="btn-icon">↓</view>
        <view class="btn-text">保存到相册</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const type = ref('image')
const src = ref('')
const thumbSrc = ref('')

onLoad((options) => {
  type.value = options.type || 'image'
  src.value = decodeURIComponent(options.src || '')
  thumbSrc.value = decodeURIComponent(options.thumbSrc || '')
})

function onSave() {
  const saveFn = type.value === 'image'
    ? uni.saveImageToPhotosAlbum
    : uni.saveVideoToPhotosAlbum

  saveFn({
    filePath: src.value,
    success: () => {
      uni.showToast({ title: '已保存到相册', icon: 'success' })
    },
    fail: (err) => {
      if (err.errMsg && err.errMsg.includes('auth deny')) {
        uni.showToast({ title: '请授权访问相册', icon: 'none' })
      } else {
        uni.showToast({ title: '保存失败', icon: 'none' })
      }
    }
  })
}

function onRetake() {
  uni.navigateBack()
}
</script>

<style scoped>
.preview-page {
  width: 100vw;
  height: 100vh;
  background-color: #000;
  display: flex;
  flex-direction: column;
}

.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

.preview-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-image {
  width: 100%;
  height: 100%;
}

.preview-video {
  width: 100%;
  height: 100%;
}

.preview-actions {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  padding: 32rpx 48rpx 48rpx;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0) 100%);
}

.preview-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  min-width: 160rpx;
}

.btn-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
}

.btn-back .btn-icon {
  background-color: rgba(255, 255, 255, 0.12);
  color: var(--color-text-primary);
}

.btn-save .btn-icon {
  background-color: var(--color-accent-red);
  color: var(--color-text-primary);
}

.btn-text {
  font-size: 22rpx;
  color: var(--color-text-secondary);
}
</style>
