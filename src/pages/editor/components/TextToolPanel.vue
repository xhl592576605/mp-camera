<template>
  <view>
    <view class="panel-row">
      <input
        class="text-input"
        placeholder="输入文字..."
        placeholder-style="color: rgba(250,250,250,0.3);"
        :value="textInputContent"
        @input="$emit('setInput', $event.detail.value)"
        @confirm="$emit('addText')"
      />
      <view class="capsule-btn capsule-btn--primary" @tap="$emit('addText')">
        <text class="capsule-btn-text">添加</text>
      </view>
    </view>
    <view class="panel-row">
      <text class="panel-section-label">颜色</text>
      <view class="color-list">
        <view
          v-for="item in drawColors"
          :key="item"
          :class="['color-swatch', textColor === item ? 'is-selected' : '', isLightColor(item) ? 'color-swatch--light' : '']"
          :style="{ backgroundColor: item }"
          @tap="$emit('setColor', item)"
        ></view>
      </view>
    </view>
    <view class="panel-row">
      <text class="panel-section-label">字号</text>
      <view class="capsule-list">
        <view
          v-for="item in textSizes"
          :key="item.value"
          :class="['capsule-btn', textFontSize === item.value ? 'is-selected' : '']"
          @tap="$emit('setFontSize', item.value)"
        >
          <text class="capsule-btn-text">{{ item.label }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  textInputContent: {
    type: String,
    default: '',
  },
  textColor: {
    type: String,
    default: '#FFFFFF',
  },
  textFontSize: {
    type: Number,
    default: 32,
  },
  textSizes: {
    type: Array,
    default: () => [],
  },
  drawColors: {
    type: Array,
    default: () => [],
  },
})

defineEmits(['setInput', 'setColor', 'setFontSize', 'addText'])

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
