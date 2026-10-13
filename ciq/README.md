# Venu 4 纯双眼表盘

当前版本 0.6.2，应用 ID 沿用旧版，目标为 Venu 4 45 mm（`venu445mm`）。纯黑背景、仅双眼、横线闭眼、连续球面张望；不绘制文字、嘴巴、流彩或烟花。抬腕先显示真实时针／分针，随后自动变为双眼；约 50% 概率触发庆祝，末段以外展双弧表现得意，否则随机选择 0–360° 方向张望，回中末段以内聚双弧表现无奈。运动完成后由系统后台事件触发摇头晃脑庆祝。双眼轮廓为每只眼 64 个预分配的贝塞尔采样顶点，与互动应用共用绘制代码。

心率来自系统 complication，活动来自步数变化，夜间由本地时钟 22:00–07:00 判断。心率不可用时用中性节奏。常规表盘无法接收连续触屏拖动；拖动、连点及挠痒痒手势由另一个独立的 **Emote Play** 手表应用承载，见 `../ciq-play/README.md`。低功耗模式停止 50 ms 定时器并清屏；浏览器帧率不代表真机帧率。

构建命令（Connect IQ SDK 9.2.0）：

```powershell
& 'C:\Users\admin\AppData\Roaming\Garmin\ConnectIQ\Sdks\connectiq-sdk-win-9.2.0-2026-06-09-92a1605b2\bin\monkeyc.bat' -f monkey.jungle -d venu445mm -o bin\Emote-venu445mm.prg -y 'C:\Users\admin\AppData\Roaming\Garmin\ConnectIQ\developer_key.der' -O 2 -r
```

将 **Emote Life** 设为当前表盘后，手表熄屏时无需再次启动应用；在手表的“设置 > 显示与亮度”中开启“抬腕亮屏”，抬腕就会唤醒当前表盘。普通表盘无法通过轻触立即切换成眼睛，指针会自动变形；触屏互动仍由独立的 **Emote Play** 前台应用承载。本次 0.6.2 已复制到目标手表的 `GARMIN/Apps`，需断开 USB 后观察是否完成加载并在腕上验收。
