<script>
export default {
  onLaunch: function () {
    console.log('App Launch')
  },
  onShow: function () {
    console.log('App Show')
  },
  onHide: function () {
    console.log('App Hide')
  },
}
</script>

<style>
page {
  --color-bg-dark: #0A0A0B;
  --color-bg-glass: rgba(10, 10, 11, 0.75);
  --color-bg-glass-light: rgba(255, 255, 255, 0.12);
  --color-accent-red: #E63946;
  --color-accent-yellow: #FFD166;
  --color-text-primary: #FAFAFA;
  --color-text-secondary: rgba(250, 250, 250, 0.6);
  --color-text-dark: #1A1A1A;
  --color-divider: rgba(255, 255, 255, 0.15);

  --radius-sm: 6rpx;
  --radius-md: 12rpx;
  --radius-lg: 20rpx;
  --radius-full: 50%;

  --shadow-glow: 0 0 20rpx rgba(230, 57, 70, 0.4);
  --shadow-card: 0 4rpx 16rpx rgba(0, 0, 0, 0.3);

  --font-display: -apple-system, "Helvetica Neue", "PingFang SC", sans-serif;
  --font-mono: "SF Mono", "Menlo", "Courier New", monospace;

  height: 100%;
  background-color: #000;
  font-family: var(--font-display);
  font-size: 28rpx;
  line-height: 1.5;
}
</style>
