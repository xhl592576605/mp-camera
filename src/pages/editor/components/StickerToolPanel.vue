<template>
  <scroll-view scroll-x class="sticker-scroll">
    <view class="sticker-list">
      <view
        v-for="(item, index) in stickerList"
        :key="index"
        class="sticker-item"
        @tap="$emit('addSticker', item)"
      >
        <text class="sticker-emoji">{{ item.emoji }}</text>
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
defineProps({
  stickerList: {
    type: Array,
    default: () => [],
  },
})

defineEmits(['addSticker'])
</script>

<style scoped>
.sticker-scroll {
  width: 100%;
  white-space: nowrap;
}

.sticker-list {
  display: flex;
  flex-direction: row;
  gap: 12rpx;
  padding: 4rpx 32rpx 12rpx;
}

.sticker-item {
  width: 76rpx;
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-md);
  flex-shrink: 0;
  transition: transform 150ms ease, background-color 150ms ease;
}

.sticker-item:active {
  transform: scale(0.9);
  background: rgba(255, 255, 255, 0.10);
}

.sticker-emoji {
  font-size: 40rpx;
}
</style>
