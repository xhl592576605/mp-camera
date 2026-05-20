<template>
  <view class="sticker-drawer" :class="{ 'is-collapsed': collapsed }">
    <!-- 拖拽条 -->
    <view class="drawer-handle">
      <view class="handle-bar"></view>
    </view>

    <!-- 分类 Tab -->
    <scroll-view scroll-x class="category-scroll">
      <view class="category-tabs">
        <view
          v-for="cat in visibleCategories"
          :key="cat.key"
          class="category-tab"
          :class="{ 'is-active': activeCategory === cat.key }"
          @tap="activeCategory = cat.key"
        >
          <text class="tab-icon">{{ cat.icon }}</text>
          <text v-if="activeCategory === cat.key" class="tab-label">{{ cat.label }}</text>
        </view>

        <!-- 折叠/展开按钮 -->
        <view class="collapse-toggle" @tap="toggleCollapse">
          <text class="collapse-icon">﹀</text>
        </view>
      </view>
    </scroll-view>

    <!-- 贴纸网格（折叠时隐藏） -->
    <scroll-view v-if="!collapsed" scroll-y class="sticker-grid-scroll">
      <view class="sticker-grid">
        <view
          v-for="(item, index) in currentItems"
          :key="index"
          class="sticker-cell"
          @tap="$emit('addSticker', item)"
        >
          <!-- emoji 类型 -->
          <text v-if="!item.src" class="sticker-emoji">{{ item.emoji }}</text>
          <!-- image 类型 -->
          <image v-else :src="item.src" class="sticker-image" mode="aspectFit" />
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  categories: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['addSticker', 'collapseToggle'])

/** 过滤掉 items 为空的分类（不显示空 Tab） */
const visibleCategories = computed(() =>
  props.categories.filter(c => c.items && c.items.length > 0)
)

const activeCategory = ref('')
const collapsed = ref(false)

watch(
  () => props.categories,
  () => {
    if (visibleCategories.value.length > 0 && !visibleCategories.value.find(c => c.key === activeCategory.value)) {
      activeCategory.value = visibleCategories.value[0].key
    }
  },
  { immediate: true }
)

const currentItems = computed(() => {
  const cat = props.categories.find(c => c.key === activeCategory.value)
  return cat?.items || []
})

function toggleCollapse() {
  collapsed.value = !collapsed.value
  emit('collapseToggle', { collapsed: collapsed.value })
}
</script>

<style scoped>
.sticker-drawer {
  background: var(--e-surface);
  display: flex;
  flex-direction: column;
  height: 33vh;
  border-radius: 32rpx 32rpx 0 0;
  overflow: hidden;
  transition: height 200ms ease;
}

.sticker-drawer.is-collapsed {
  height: auto;
}

/* 拖拽条 */

.drawer-handle {
  display: flex;
  justify-content: center;
  padding: 16rpx 0 8rpx;
}

.handle-bar {
  width: 64rpx;
  height: 8rpx;
  background: var(--e-surface-light);
  border-radius: 4rpx;
}

/* 分类 Tab */

.category-scroll {
  flex-shrink: 0;
  white-space: nowrap;
}

.category-tabs {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 8rpx 24rpx 12rpx;
  gap: 8rpx;
}

.category-tab {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4rpx;
  padding: 10rpx 20rpx 10rpx;
  border-radius: 32rpx 32rpx 0 0;
  background: var(--e-surface-light);
  flex-shrink: 0;
  transition: background-color 150ms ease;
  border-bottom: 4rpx solid transparent;
}

.category-tab.is-active {
  background: var(--e-surface-light);
  border-bottom-color: var(--e-accent);
}

.tab-icon {
  font-size: 32rpx;
}

.tab-label {
  font-size: 24rpx;
  color: var(--e-text);
  font-weight: 500;
}

/* 折叠按钮 */

.collapse-toggle {
  flex-shrink: 0;
  margin-left: auto;
  padding: 10rpx 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.collapse-toggle:active {
  opacity: 0.6;
}

.collapse-icon {
  font-size: 28rpx;
  color: var(--e-text-dim);
}

/* 贴纸网格 */

.sticker-grid-scroll {
  flex: 1;
  min-height: 0;
}

.sticker-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16rpx;
  padding: 16rpx 24rpx;
}

.sticker-cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--e-surface-light);
  border-radius: var(--radius-md, 16rpx);
  transition: transform 120ms ease, background-color 120ms ease;
}

.sticker-cell:active {
  transform: scale(0.88);
  background: var(--e-surface-hover);
}

.sticker-emoji {
  font-size: 52rpx;
}

.sticker-image {
  width: 60%;
  height: 60%;
}
</style>
