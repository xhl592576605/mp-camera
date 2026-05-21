import { describe, expect, it, vi } from "vitest";
import { useCamera } from "@/pages/index/hooks/useCamera";

describe("useCamera", () => {
  it("暴露基础动作入口", () => {
    const camera = useCamera({ autoInit: false });

    expect(camera.onShutterStart).toEqual(expect.any(Function));
    expect(camera.onShutterEnd).toEqual(expect.any(Function));
    expect(camera.onChooseFromAlbum).toEqual(expect.any(Function));
    expect(camera.onToggleFlash).toEqual(expect.any(Function));
    expect(camera.onToggleCamera).toEqual(expect.any(Function));
  });

  it("闪光灯默认 auto", () => {
    const camera = useCamera({ autoInit: false });
    expect(camera.flash.value).toBe("auto");
  });

  it("摄像头默认 back", () => {
    const camera = useCamera({ autoInit: false });
    expect(camera.devicePosition.value).toBe("back");
  });
});
