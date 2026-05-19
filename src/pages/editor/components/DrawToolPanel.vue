<template>
  <view>
    <view class="panel-row">
      <text class="panel-section-label">颜色</text>
      <view class="color-list">
        <view
          v-for="item in colors"
          :key="item"
          :class="['color-swatch', color === item ? 'is-selected' : '', isLightColor(item) ? 'color-swatch--light' : '']"
          :style="{ backgroundColor: item }"
          @tap="$emit('setColor', item)"
        ></view>
      </view>
    </view>
    <view class="panel-row">
      <text class="panel-section-label">粗细</text>
      <view class="capsule-list">
        <view
          v-for="item in widths"
          :key="item"
          :class="['capsule-btn', width === item ? 'is-selected' : '']"
          @tap="$emit('setWidth', item)"
        >
          <view class="width-dot" :style="{ width: item * 2 + 'px', height: item * 2 + 'px' }"></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  color: String,
  width: Number,
  colors: {
    type: Array,
    default: () => [],
  },
  widths: {
    type: Array,
    default: () => [],
  },
})

defineEmits(['setColor', 'setWidth'])

/** 判断颜色是否偏浅（用于暗背景上的色块辨识） */
function isLightColor(hex) {
  if (!hex || hex.charAt(0) !== '#') return false
  const c = hex.replace('#', '')
  if (c.length < 6) return false
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 180
}
</script>
