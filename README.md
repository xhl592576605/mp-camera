# 水印相机（Watermark Camera）

基于 **UniApp + Vue 3** 的跨平台相机应用。拍照/录像时自动合成时间水印，拍照后进入编辑器进行裁剪、旋转、贴纸、文字、画笔等操作。

> **AppID**: `wx044ff4cd01bcd14a`
>
> **源项目**（原生微信小程序）迁移自 UniApp + Vue 3 + Composition API。

## 功能特性

- **相机取景**：拍照/录像、闪光灯（自动/开/关）、前后摄像头切换、缩放
- **实时水印**：打卡徽章 + 时间 + 日期 + 位置 + 自定义文字，每秒自动刷新
- **Canvas 水印合成**：拍照后通过 `<canvas type="2d">` 在图片上绘制水印
- **图片编辑器**：
  - 裁剪（自由比、1:1、4:3、3:4）
  - 旋转（滑块 + 按钮，支持任意角度）
  - 贴纸（emoji / 图片贴纸，支持拖动、旋转、缩放、水平翻转、删除）
  - 文字（自定义内容、颜色、大小，支持拖动、旋转、缩放）
  - 画笔（颜色、粗细选择）
  - 撤销 / 重做
- **预览与保存**：图片/视频预览，一键保存到相册

## 技术栈

| 技术 | 版本 |
|------|------|
| UniApp | 3.0 |
| Vue | 3.4 |
| Vite | 5.2 |
| Vitest | 2.1 |

## 快速开始

```bash
# 安装依赖
yarn

# 开发（微信小程序）— 产物在 dist/dev/mp-weixin
yarn dev:mp-weixin

# 开发（H5）
yarn dev:h5

# 构建
yarn build:mp-weixin   # → dist/build/mp-weixin
yarn build:h5

# 单元测试
yarn test:unit

# 单个测试文件
npx vitest run tests/editor/rotate-plugin.spec.js
```

微信小程序产物需用**微信开发者工具**打开 `dist/dev/mp-weixin` 预览。

## 架构

### 页面（3 个）

| 页面 | 路径 | 职责 |
|------|------|------|
| 相机页 | `src/pages/index/index.vue` | 取景、拍照/录像、闪光灯、前后摄像头、实时水印浮层、Canvas 水印合成、缩放、水印开关 |
| 编辑器 | `src/pages/editor/editor.vue` | 图片编辑：裁剪、旋转、贴纸、文字、画笔。支持撤销/重做，Canvas 2D 渲染 |
| 预览页 | `src/pages/preview/preview.vue` | 图片/视频预览、保存到相册 |

### 页面内架构模式

每个页面采用 **hooks + plugins + components** 三层结构：

```
src/pages/<page>/
├── <page>.vue              # 模板 + 样式，组装 hook 和组件
├── hooks/useXxx.js         # 核心业务逻辑（组合式函数）
├── plugins/                # 可插拔功能模块
│   ├── index.js            # 注册表工厂函数
│   └── useXxxPlugin.js     # 各插件实现
└── components/             # UI 子组件（仅编辑器页）
```

### 插件系统

编辑器采用统一的插件接口，每个插件实现：

```js
{
  key,                                      // 唯一标识
  activate() / deactivate() / reset(),      // 生命周期
  renderPreview(),                          // 实时 Canvas 渲染
  commit() → Snapshot,                      // 确认操作，返回新快照
  onTouchStart/Move/End,                    // Canvas 触摸事件
  getPanelProps() / getPanelActions(),      // 面板 UI 数据与回调
}
```

**相机页插件**：`capture`（快门）、`watermark`（水印渲染）、`mediaPicker`（相册选择）

**编辑器插件**：`crop`、`rotate`、`draw`、`sticker`、`text`

### 数据流

```
相机页拍照 → Canvas 合成水印 → navigateTo 编辑器页
                                ↓
                         加载图片 → Canvas 显示 → 选工具 → 插件渲染预览 → commit → 快照栈更新
                                                                              ↓
                                                                    navigateTo 预览页 → 保存到相册
```

### 关键技术点

- **快门交互**：`@touchstart` / `@touchend` + 定时器，单击拍照、长按 500ms 录视频
- **Canvas 2D**：`<canvas type="2d">` + `uni.createSelectorQuery()`，DPR 缩放适配高清屏
- **双 Canvas 架构**：`#editorCanvas`（显示+交互）+ `#exportCanvas`（导出，隐藏）
- **贴纸/文字手势**：move（拖动）、transform（旋转+缩放）、delete（删除）、flip（水平翻转），通过坐标反变换 (`_hitToLocal`) 做碰撞检测
- **坐标重映射**：Canvas 区域变化时自动重映射 overlay 元素坐标（`_remapOverlayPositions`），保持贴纸/文字与图片的相对位置
- **图标系统**：`src/constants/iconGlyphs.js` 定义 Unicode glyph 常量，配合 `src/styles/iconfont.css` 字体文件

## 测试

Vitest + jsdom，uni API 通过 `tests/setup/uni.js` mock。

```
tests/
├── setup/uni.js           # 全局 uni mock
├── camera/
│   └── useCamera.spec.js
└── editor/
    ├── useEditor.spec.js
    ├── plugin-registry.spec.js
    ├── rotate-plugin.spec.js
    ├── crop-plugin.spec.js
    ├── draw-plugin.spec.js
    ├── sticker-text-plugin.spec.js
    └── sticker-drawer.spec.js
```

## 项目结构

```
src/
├── App.vue                    # 全局样式（暗色主题）
├── pages/
│   ├── index/                 # 相机页
│   ├── editor/                # 编辑器页
│   │   ├── editor.vue
│   │   ├── hooks/useEditor.js
│   │   ├── plugins/
│   │   └── components/
│   └── preview/               # 预览页
├── constants/
│   ├── iconGlyphs.js          # iconfont Unicode glyph 常量
│   └── stickerData.js         # 贴纸分类数据
├── utils/
│   ├── canvas-helper.js       # Canvas 2D Promise 封装
│   └── location.js            # 逆地理编码（腾讯地图 API）
├── styles/
│   └── iconfont.css           # iconfont 字体
├── pages.json                 # 页面路由 + 导航栏配置
└── manifest.json              # AppID、平台配置、Android 权限
```

## License

[GPL-3.0](LICENSE)
