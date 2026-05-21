import { describe, expect, it, vi } from "vitest";
import { useCropPlugin } from "@/pages/editor/plugins/useCropPlugin";

function createMockContext(overrides = {}) {
  return {
    requestRender: vi.fn(),
    ctx: {
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      strokeStyle: "",
      fillStyle: "",
      lineWidth: 0,
      lineCap: "",
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
    },
    getImageRect: () => ({ x: 50, y: 40, w: 300, h: 220 }),
    getActiveSnapshot: () => ({
      tempFilePath: "/tmp/photo.png",
      width: 800,
      height: 600,
    }),
    exportPipeline: vi.fn(async (opts) => ({
      tempFilePath: "/tmp/exported.png",
      width: opts.width ?? 800,
      height: opts.height ?? 600,
    })),
    ...overrides,
  };
}

describe("useCropPlugin — 自含渲染和导出", () => {
  it("切换裁剪比例后更新面板状态并请求重绘", () => {
    const context = createMockContext();
    const plugin = useCropPlugin(context);

    plugin.activate();
    plugin.getPanelActions().setRatio("1:1");

    expect(plugin.getPanelProps().ratio).toBe("1:1");
    expect(plugin.getPanelProps().rect.w).toBe(plugin.getPanelProps().rect.h);
    expect(context.requestRender).toHaveBeenCalled();
  });

  it("renderPreview 直接操作 ctx 绘制裁剪框", () => {
    const context = createMockContext();
    const plugin = useCropPlugin(context);

    plugin.activate();

    plugin.renderPreview();

    // 裁剪框渲染应该调用 fillRect（遮罩）和 strokeRect（边框）
    expect(context.ctx.fillRect).toHaveBeenCalled();
    expect(context.ctx.strokeRect).toHaveBeenCalled();
  });

  it("commit 调用 exportPipeline transform 模式返回裁切 Snapshot", async () => {
    const context = createMockContext();
    const plugin = useCropPlugin(context);

    plugin.activate();
    plugin.getPanelActions().setRatio("1:1");

    const result = await plugin.commit();

    expect(result).toEqual({
      tempFilePath: "/tmp/exported.png",
      width: expect.any(Number),
      height: expect.any(Number),
    });
    expect(context.exportPipeline).toHaveBeenCalledTimes(1);

    const call = context.exportPipeline.mock.calls[0][0];
    expect(call.drawOriginal).toBe(false);
    expect(call.width).toBeGreaterThan(0);
    expect(call.height).toBeGreaterThan(0);
    expect(call.renderFn).toEqual(expect.any(Function));
  });
});
