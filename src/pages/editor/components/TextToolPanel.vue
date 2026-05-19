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
      <view class="panel-btn panel-btn-primary" @tap="$emit('addText')">
        <text class="panel-btn-text">添加</text>
      </view>
    </view>
    <view class="panel-row">
      <text class="panel-section-label">颜色</text>
      <view class="color-list">
        <view
          v-for="item in drawColors"
          :key="item"
          :class="['color-swatch', textColor === item ? 'is-selected' : '']"
          :style="{ backgroundColor: item }"
          @tap="$emit('setColor', item)"
        ></view>
      </view>
    </view>
    <view class="panel-row">
      <text class="panel-section-label">字号</text>
      <view class="size-list">
        <view
          v-for="item in textSizes"
          :key="item.value"
          :class="['panel-btn', textFontSize === item.value ? 'is-selected' : '']"
          @tap="$emit('setFontSize', item.value)"
        >
          <text class="panel-btn-text">{{ item.label }}</text>
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
</script>
