<template>
  <view class="tool-bar">
    <view
      v-for="tool in items"
      :key="tool.key"
      :class="['tool-item', activeTool === tool.key ? 'is-active' : '']"
      @tap="$emit('select', tool.key)"
    >
      <text class="tool-icon">{{ tool.icon }}</text>
      <text class="tool-label">{{ tool.label }}</text>
    </view>
  </view>
</template>

<script setup>
defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  activeTool: {
    type: String,
    default: '',
  },
})

defineEmits(['select'])
</script>
