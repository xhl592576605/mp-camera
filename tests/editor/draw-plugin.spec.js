import { describe, expect, it, vi } from "vitest";
import { useDrawPlugin } from "@/pages/editor/plugins/useDrawPlugin";

function createMockContext(overrides = {}) {
  return {
    requestRender: vi.fn(),
    ctx: {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      strokeStyle: "",
      lineWidth: 0,
      lineCap: "",
      lineJoin: "",
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

describe("useDrawPlugin — 自含渲染和导出", () => {
  it("记录当前路径并在 touch end 时沉淀为笔画", () => {
    const context = createMockContext();
    const plugin = useDrawPlugin(context);

    plugin.activate();
    plugin.onTouchStart({ touches: [{ x: 10, y: 10 }] });
    plugin.onTouchMove({ touches: [{ x: 20, y: 20 }] });
    plugin.onTouchEnd();

    const props = plugin.getPanelProps();
    expect(props.paths).toHaveLength(1);
    expect(props.paths[0].points).toEqual([
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ]);
    expect(context.requestRender).toHaveBeenCalled();
  });

  it("renderPreview 直接操作 ctx 绘制笔画", () => {
    const context = createMockContext();
    const plugin = useDrawPlugin(context);

    plugin.activate();
    plugin.onTouchStart({ touches: [{ x: 10, y: 10 }] });
    plugin.onTouchMove({ touches: [{ x: 20, y: 20 }] });
    plugin.onTouchEnd();

    plugin.renderPreview();

    expect(context.ctx.beginPath).toHaveBeenCalled();
    expect(context.ctx.moveTo).toHaveBeenCalled();
    expect(context.ctx.lineTo).toHaveBeenCalled();
    expect(context.ctx.stroke).toHaveBeenCalled();
  });

  it("commit 无笔画时返回 null", async () => {
    const context = createMockContext();
    const plugin = useDrawPlugin(context);

    plugin.activate();
    const result = await plugin.commit();
    expect(result).toBeNull();
    expect(context.exportPipeline).not.toHaveBeenCalled();
  });

  it("commit 调用 exportPipeline overlay 模式返回 Snapshot", async () => {
    const context = createMockContext();
    const plugin = useDrawPlugin(context);

    plugin.activate();
    plugin.onTouchStart({ touches: [{ x: 10, y: 10 }] });
    plugin.onTouchMove({ touches: [{ x: 50, y: 50 }] });
    plugin.onTouchEnd();

    const result = await plugin.commit();

    expect(result).toEqual({
      tempFilePath: "/tmp/exported.png",
      width: 800,
      height: 600,
    });
    expect(context.exportPipeline).toHaveBeenCalledTimes(1);

    const call = context.exportPipeline.mock.calls[0][0];
    expect(call.drawOriginal).toBe(true);
    expect(call.renderFn).toEqual(expect.any(Function));
  });
});
