import { describe, expect, it, vi } from "vitest";
import { useRotatePlugin } from "@/pages/editor/plugins/useRotatePlugin";

function createMockContext(overrides = {}) {
  return {
    requestRender: vi.fn(),
    ctx: {
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      drawImage: vi.fn(),
    },
    canvasWidth: { value: 400 },
    canvasHeight: { value: 300 },
    getImageRect: () => ({ x: 50, y: 40, w: 300, h: 220 }),
    getActiveSnapshot: () => ({
      tempFilePath: "/tmp/photo.png",
      width: 800,
      height: 600,
    }),
    getSelection: () => ({ id: null, type: "" }),
    setSelection: vi.fn(),
    loadImage: vi.fn(async () => ({})),
    exportPipeline: vi.fn(async (opts) => ({
      tempFilePath: "/tmp/exported.png",
      width: opts.width ?? 800,
      height: opts.height ?? 600,
    })),
    ...overrides,
  };
}

describe("useRotatePlugin — 自含渲染和导出", () => {
  it("90 度旋转归一化角度并触发重绘", () => {
    const context = createMockContext();
    const plugin = useRotatePlugin(context);
    const actions = plugin.getPanelActions();

    actions.rotateRight();
    actions.rotateRight();
    actions.rotateRight();

    expect(plugin.getPanelProps().angle).toBe(-90);
    expect(context.requestRender).toHaveBeenCalledTimes(3);
  });

  it("renderPreview 直接操作 ctx 旋转绘制快照", async () => {
    const mockImage = { src: "/tmp/photo.png" };
    const context = createMockContext({
      loadImage: vi.fn(async () => mockImage),
    });
    const plugin = useRotatePlugin(context);

    plugin.activate();
    await new Promise((r) => setTimeout(r, 0)); // 等待 loadImage.then 完成

    plugin.getPanelActions().rotateRight(); // 90°

    plugin.renderPreview();

    expect(context.ctx.clearRect).toHaveBeenCalled();
    expect(context.ctx.translate).toHaveBeenCalled();
    expect(context.ctx.rotate).toHaveBeenCalled();
    expect(context.ctx.drawImage).toHaveBeenCalled();
  });

  it("commit 在 angle=0 时返回 null", async () => {
    const context = createMockContext();
    const plugin = useRotatePlugin(context);

    plugin.activate();
    const result = await plugin.commit();
    expect(result).toBeNull();
    expect(context.exportPipeline).not.toHaveBeenCalled();
  });

  it("commit 调用 exportPipeline transform 模式并返回 Snapshot", async () => {
    const context = createMockContext();
    const plugin = useRotatePlugin(context);

    plugin.activate();
    plugin.getPanelActions().rotateRight(); // 90°

    const result = await plugin.commit();

    expect(result).toEqual({
      tempFilePath: "/tmp/exported.png",
      width: expect.any(Number),
      height: expect.any(Number),
    });
    expect(context.exportPipeline).toHaveBeenCalledTimes(1);
    const call = context.exportPipeline.mock.calls[0][0];
    // 90° rotation: newW = |800*cos90 + 600*sin90| = 600, newH = |800*sin90 + 600*cos90| = 800
    expect(call.width).toBe(600);
    expect(call.height).toBe(800);
    expect(call.drawOriginal).toBe(false);
    expect(call.renderFn).toEqual(expect.any(Function));
  });

  it("activate 重置角度为 0", () => {
    const context = createMockContext();
    const plugin = useRotatePlugin(context);

    plugin.activate();
    plugin.getPanelActions().rotateRight();
    expect(plugin.getPanelProps().angle).toBe(90);

    plugin.activate();
    expect(plugin.getPanelProps().angle).toBe(0);
  });
});
