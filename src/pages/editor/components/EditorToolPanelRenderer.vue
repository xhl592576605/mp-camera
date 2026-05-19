<template>
  <view v-if="component" class="sub-panel">
    <component
      :is="component"
      v-bind="panelProps"
      v-on="panelActions"
    />
  </view>
</template>

<script setup>
defineProps({
  component: {
    type: Object,
    default: null,
  },
  panelProps: {
    type: Object,
    default: () => ({}),
  },
  panelActions: {
    type: Object,
    default: () => ({}),
  },
})
</script>
