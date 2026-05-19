<template>
  <view>
    <view class="panel-row">
      <text class="panel-section-label">颜色</text>
      <view class="color-list">
        <view
          v-for="item in colors"
          :key="item"
          :class="['color-swatch', color === item ? 'is-selected' : '']"
          :style="{ backgroundColor: item }"
          @tap="$emit('setColor', item)"
        ></view>
      </view>
    </view>
    <view class="panel-row">
      <text class="panel-section-label">粗细</text>
      <view class="width-list">
        <view
          v-for="item in widths"
          :key="item"
          :class="['width-swatch', width === item ? 'is-selected' : '']"
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
</script>
