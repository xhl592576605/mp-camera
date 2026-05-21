import { describe, expect, it, vi } from "vitest";
import { useStickerPlugin } from "@/pages/editor/plugins/useStickerPlugin";
import { useTextPlugin } from "@/pages/editor/plugins/useTextPlugin";

function createMockContext(overrides = {}) {
  let selectionState = { id: null, type: "" };
  return {
    requestRender: vi.fn(),
    ctx: {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
      fillText: vi.fn(),
      strokeRect: vi.fn(),
      strokeStyle: "",
      fillStyle: "",
      lineWidth: 0,
      font: "",
      textAlign: "",
      textBaseline: "",
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      closePath: vi.fn(),
      arc: vi.fn(),
      shadowColor: "",
      shadowBlur: 0,
      lineCap: "",
      lineJoin: "",
      measureText: vi.fn(() => ({ width: 100 })),
    },
    canvasWidth: { value: 400 },
    canvasHeight: { value: 300 },
    getImageRect: () => ({ x: 0, y: 0, w: 300, h: 200 }),
    getActiveSnapshot: () => ({
      tempFilePath: "/tmp/photo.png",
      width: 800,
      height: 600,
    }),
    getSelection: () => selectionState,
    setSelection: vi.fn(({ id, type }) => {
      selectionState = { id, type };
    }),
    loadImage: vi.fn(async () => ({})),
    exportPipeline: vi.fn(async (opts) => ({
      tempFilePath: "/tmp/exported.png",
      width: opts.width ?? 800,
      height: opts.height ?? 600,
    })),
    ...overrides,
  };
}

// ── Sticker Plugin Tests ──

describe("useStickerPlugin — 自含渲染、导出和触摸", () => {
  it("添加贴纸后暴露选中元素", () => {
    const context = createMockContext();
    const plugin = useStickerPlugin(context);

    plugin.activate();
    plugin.getPanelActions().addSticker({ emoji: "⭐" });

    expect(plugin.getPanelProps().elements).toHaveLength(1);
    expect(plugin.getPanelProps().elements[0].emoji).toBe("⭐");
    expect(context.setSelection).toHaveBeenCalledWith({
      id: expect.any(Number),
      type: "sticker",
    });
  });

  it("renderPreview 直接操作 ctx 绘制贴纸", () => {
    const context = createMockContext();
    const plugin = useStickerPlugin(context);

    plugin.activate();
    plugin.getPanelActions().addSticker({ emoji: "⭐" });

    plugin.renderPreview();

    expect(context.ctx.translate).toHaveBeenCalled();
    expect(context.ctx.fillText).toHaveBeenCalled();
  });

  it("commit 调用 exportPipeline overlay 模式返回 Snapshot", async () => {
    const context = createMockContext();
    const plugin = useStickerPlugin(context);

    plugin.activate();
    plugin.getPanelActions().addSticker({ emoji: "⭐" });

    const result = await plugin.commit();

    expect(result).toEqual({
      tempFilePath: "/tmp/exported.png",
      width: 800,
      height: 600,
    });
    expect(context.exportPipeline).toHaveBeenCalledTimes(1);
    const call = context.exportPipeline.mock.calls[0][0];
    expect(call.drawOriginal).toBe(true);
  });

  it("commit 无元素时返回 null", async () => {
    const context = createMockContext();
    const plugin = useStickerPlugin(context);

    plugin.activate();
    const result = await plugin.commit();
    expect(result).toBeNull();
  });

  it("touchStart 选中贴纸后拖动", () => {
    const context = createMockContext();
    const plugin = useStickerPlugin(context);

    plugin.activate();
    plugin.getPanelActions().addSticker({ emoji: "⭐" });
    const el = plugin.getPanelProps().elements[0];

    plugin.onTouchStart({ touches: [{ x: el.x, y: el.y }] });
    expect(context.setSelection).toHaveBeenCalledWith({
      id: el.id,
      type: "sticker",
    });

    plugin.onTouchMove({ touches: [{ x: el.x + 20, y: el.y + 10 }] });
    expect(el.x).toBeCloseTo(170, -1);
    expect(el.y).toBeCloseTo(110, -1);

    plugin.onTouchEnd();
  });

  it("reset 清空所有贴纸元素", () => {
    const context = createMockContext();
    const plugin = useStickerPlugin(context);

    plugin.activate();
    plugin.getPanelActions().addSticker({ emoji: "⭐" });
    plugin.getPanelActions().addSticker({ emoji: "🔥" });

    plugin.reset();
    expect(plugin.getPanelProps().elements).toHaveLength(0);
  });

  it("图片贴纸通过 loadImage 加载", () => {
    const context = createMockContext();
    const plugin = useStickerPlugin(context);

    plugin.activate();
    plugin
      .getPanelActions()
      .addSticker({ src: "/static/test.png", name: "test" });

    plugin.renderPreview();
    expect(context.loadImage).toHaveBeenCalledWith("/static/test.png");
  });
});

// ── Text Plugin Tests ──

describe("useTextPlugin — 自含渲染、导出和触摸", () => {
  it("添加文字后把内容放入文字元素列表", () => {
    const context = createMockContext();
    const plugin = useTextPlugin(context);

    plugin.activate();
    plugin.getPanelActions().setInput("打卡完成");
    plugin.getPanelActions().addText();

    expect(plugin.getPanelProps().elements).toHaveLength(1);
    expect(plugin.getPanelProps().elements[0].content).toBe("打卡完成");
  });

  it("renderPreview 直接操作 ctx 绘制文字", () => {
    const context = createMockContext();
    const plugin = useTextPlugin(context);

    plugin.activate();
    plugin.getPanelActions().setInput("打卡");
    plugin.getPanelActions().addText();

    plugin.renderPreview();

    expect(context.ctx.translate).toHaveBeenCalled();
    expect(context.ctx.fillText).toHaveBeenCalledWith("打卡", 0, 0);
  });

  it("commit 调用 exportPipeline overlay 模式返回 Snapshot", async () => {
    const context = createMockContext();
    const plugin = useTextPlugin(context);

    plugin.activate();
    plugin.getPanelActions().setInput("打卡");
    plugin.getPanelActions().addText();

    const result = await plugin.commit();

    expect(result).toEqual({
      tempFilePath: "/tmp/exported.png",
      width: 800,
      height: 600,
    });
    expect(context.exportPipeline).toHaveBeenCalledTimes(1);
  });

  it("commit 无元素时返回 null", async () => {
    const context = createMockContext();
    const plugin = useTextPlugin(context);

    plugin.activate();
    const result = await plugin.commit();
    expect(result).toBeNull();
  });

  it("touchStart 选中文字后拖动", () => {
    const context = createMockContext();
    const plugin = useTextPlugin(context);

    plugin.activate();
    plugin.getPanelActions().setInput("打卡");
    plugin.getPanelActions().addText();
    const el = plugin.getPanelProps().elements[0];

    plugin.onTouchStart({ touches: [{ x: el.x, y: el.y }] });
    expect(context.setSelection).toHaveBeenCalledWith({
      id: el.id,
      type: "text",
    });

    plugin.onTouchMove({ touches: [{ x: el.x + 20, y: el.y + 10 }] });
    expect(el.x).toBeCloseTo(170, -1);
    expect(el.y).toBeCloseTo(110, -1);

    plugin.onTouchEnd();
  });
});
