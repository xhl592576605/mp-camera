import { describe, expect, it } from "vitest";
import { isLightColor } from "@/utils/color";

describe("isLightColor", () => {
  it("白色判定为浅色", () => {
    expect(isLightColor("#FFFFFF")).toBe(true);
  });

  it("黑色判定为深色", () => {
    expect(isLightColor("#000000")).toBe(false);
  });

  it("黄色判定为浅色", () => {
    expect(isLightColor("#FFD166")).toBe(true);
  });

  it("红色判定为深色", () => {
    expect(isLightColor("#E63946")).toBe(false);
  });

  it("null 返回 false", () => {
    expect(isLightColor(null)).toBe(false);
  });

  it("非 # 开头的值返回 false", () => {
    expect(isLightColor("rgb(255,255,255)")).toBe(false);
  });
});
