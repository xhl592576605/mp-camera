import { describe, expect, it, vi, beforeEach } from "vitest";
import { useCamera } from "@/pages/index/hooks/useCamera";

describe("useCamera — 快门与设备控制", () => {
  let camera;

  beforeEach(() => {
    vi.useFakeTimers();
    camera = useCamera({ autoInit: false });
  });

  it("onToggleFlash 循环切换闪光灯状态", () => {
    expect(camera.flash.value).toBe("auto");
    camera.onToggleFlash();
    expect(camera.flash.value).toBe("on");
    camera.onToggleFlash();
    expect(camera.flash.value).toBe("off");
    camera.onToggleFlash();
    expect(camera.flash.value).toBe("auto");
  });

  it("onToggleCamera 切换前后摄像头", () => {
    expect(camera.devicePosition.value).toBe("back");
    camera.onToggleCamera();
    expect(camera.devicePosition.value).toBe("front");
    camera.onToggleCamera();
    expect(camera.devicePosition.value).toBe("back");
  });

  it("短按快门 — onShutterEnd 立即拍照", () => {
    camera.onShutterStart();
    vi.advanceTimersByTime(100);
    camera.onShutterEnd();
    expect(uni.navigateTo).not.toHaveBeenCalled();
  });

  it("长按快门 — 500ms 后进入录像状态", () => {
    camera.onShutterStart();
    vi.advanceTimersByTime(500);
    expect(camera.isRecording.value).toBe(true);
    camera.onShutterEnd();
    expect(camera.isRecording.value).toBe(false);
  });

  it("onChooseFromAlbum 调用 uni.chooseMedia 并路由到编辑器", () => {
    const file = { fileType: "image", tempFilePath: "/tmp/photo.jpg" };
    uni.chooseMedia.mockImplementation(({ success }) => {
      success({ tempFiles: [file] });
    });

    camera.onChooseFromAlbum();

    expect(uni.chooseMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 1,
        sourceType: ["album"],
      })
    );
    expect(uni.navigateTo).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining(encodeURIComponent(file.tempFilePath)),
      })
    );
  });
});
