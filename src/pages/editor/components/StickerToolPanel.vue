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
