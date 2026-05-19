<template>
  <view class="panel-row" style="justify-content:center;">
    <view
      v-for="item in ratios"
      :key="item.key"
      :class="['panel-btn', ratio === item.key ? 'is-selected' : '']"
      @tap="$emit('setRatio', item.key)"
    >
      <text class="panel-btn-text">{{ item.label }}</text>
    </view>
  </view>
</template>

<script setup>
defineProps({
  ratio: {
    type: String,
    default: '',
  },
  ratios: {
    type: Array,
    default: () => [],
  },
})

defineEmits(['setRatio'])
</script>
