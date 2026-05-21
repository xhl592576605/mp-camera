import { describe, expect, it, vi } from "vitest";
import {
  hitToLocal,
  distance,
  hitControl,
  getControlMetrics,
  drawSelectionFrame,
  drawControlButton,
} from "@/utils/gesture-helper";

describe("gesture-helper", () => {
  describe("hitToLocal", () => {
    it("将全局坐标转换为元素本地坐标（无旋转）", () => {
      const el = { x: 100, y: 50, rotation: 0 };
      const local = hitToLocal(120, 60, el);
      expect(local.x).toBeCloseTo(20);
      expect(local.y).toBeCloseTo(10);
    });

    it("将全局坐标转换为元素本地坐标（90度旋转）", () => {
      const el = { x: 100, y: 100, rotation: Math.PI / 2 };
      const local = hitToLocal(110, 90, el);
      // 旋转 90°: dx=10, dy=-10, cos(-90)=0, sin(-90)=-1
      // local.x = 10*0 - (-10)*(-1) = -10
      // local.y = 10*(-1) + (-10)*0 = -10
      expect(local.x).toBeCloseTo(-10);
      expect(local.y).toBeCloseTo(-10);
    });

    it("将全局坐标转换为元素本地坐标（45度旋转）", () => {
      const el = { x: 0, y: 0, rotation: Math.PI / 4 };
      const local = hitToLocal(10, 0, el);
      const sqrt2 = Math.sqrt(2);
      // dx=10, dy=0, cos(-45)=sqrt2/2, sin(-45)=-sqrt2/2
      // local.x = 10*sqrt2/2 - 0*(-sqrt2/2) = 5*sqrt2
      // local.y = 10*(-sqrt2/2) + 0*sqrt2/2 = -5*sqrt2
      expect(local.x).toBeCloseTo(5 * sqrt2);
      expect(local.y).toBeCloseTo(-5 * sqrt2);
    });
  });

  describe("distance", () => {
    it("计算两点之间的距离", () => {
      expect(distance(0, 0, 3, 4)).toBeCloseTo(5);
    });

    it("同一点距离为 0", () => {
      expect(distance(5, 5, 5, 5)).toBe(0);
    });
  });

  describe("hitControl", () => {
    it("在半径内命中", () => {
      const local = { x: 0, y: 0 };
      expect(hitControl(local, 0, 0, 16)).toBe(true);
    });

    it("在边界命中", () => {
      const local = { x: 16, y: 0 };
      expect(hitControl(local, 0, 0, 16)).toBe(true);
    });

    it("超出半径未命中", () => {
      const local = { x: 20, y: 0 };
      expect(hitControl(local, 0, 0, 16)).toBe(false);
    });
  });

  describe("getControlMetrics", () => {
    it("根据元素半宽半高计算选择框尺寸", () => {
      const { fw, fh, handleRadius } = getControlMetrics(40, 30);
      expect(fw).toBe(40 + 14);
      expect(fh).toBe(30 + 14);
      expect(handleRadius).toBe(13);
    });
  });

  describe("drawSelectionFrame", () => {
    function createMockCtx() {
      return {
        save: vi.fn(),
        restore: vi.fn(),
        strokeRect: vi.fn(),
        strokeStyle: "",
        lineWidth: 0,
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        closePath: vi.fn(),
        arc: vi.fn(),
        translate: vi.fn(),
        fillStyle: "",
        lineCap: "",
        lineJoin: "",
        shadowColor: "",
        shadowBlur: 0,
      };
    }

    it("调用 ctx 方法绘制选择框不抛错", () => {
      const ctx = createMockCtx();

      expect(() => drawSelectionFrame(ctx, 40, 30)).not.toThrow();
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
      expect(ctx.strokeRect).toHaveBeenCalled();
    });

    it("showFlip 时额外绘制翻转按钮", () => {
      const ctx = createMockCtx();

      drawSelectionFrame(ctx, 40, 30, { showFlip: true });
      // showFlip=true → drawControlButton 会被调用 3 次 (flip, delete, transform)
      // 每次都有 save/restore/arc 等调用
      expect(ctx.arc).toHaveBeenCalled();
    });
  });

  describe("drawControlButton", () => {
    it("绘制删除按钮不抛错", () => {
      const ctx = {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        arc: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        shadowColor: "",
        shadowBlur: 0,
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 0,
        lineCap: "",
        lineJoin: "",
      };

      expect(() => drawControlButton(ctx, 0, 0, "delete")).not.toThrow();
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });
  });
});
