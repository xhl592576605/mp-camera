<template>
  <view>
    <view class="panel-row" style="justify-content:center;">
      <view class="panel-btn" @tap="$emit('rotateLeft')">
        <text class="panel-btn-icon">↺</text>
        <text class="panel-btn-text">90°</text>
      </view>
      <view class="rotate-value">
        <text class="rotate-number">{{ angle }}°</text>
      </view>
      <view class="panel-btn" @tap="$emit('rotateRight')">
        <text class="panel-btn-icon">↻</text>
        <text class="panel-btn-text">90°</text>
      </view>
    </view>
    <view class="panel-row">
      <slider
        class="rotate-slider"
        :min="-180"
        :max="180"
        :value="angle"
        :step="1"
        activeColor="#E63946"
        backgroundColor="rgba(255,255,255,0.1)"
        block-size="14"
        @change="$emit('changeAngle', $event.detail.value)"
      />
    </view>
  </view>
</template>

<script setup>
defineProps({
  angle: {
    type: Number,
    default: 0,
  },
})

defineEmits(['rotateLeft', 'rotateRight', 'changeAngle'])
</script>
