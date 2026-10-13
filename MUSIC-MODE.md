# Emote Music：能力边界与候选方案

Venu 4 支持将手表中的音乐通过蓝牙耳机播放，也支持控制手机音乐。参考 Garmin [Venu 4 音乐手册](https://www8.garmin.com/manuals/webhelp/GUID-2CF5620C-E585-4E0A-9CC3-9565533EEE4D/EN-US/GUID-8702C05F-0915-455A-AABA-079D8374FCD8.html)。

Connect IQ 的 [Media API](https://developer.garmin.com/connect-iq/api-docs/Toybox/Media.html) 面向音频内容提供者，开放曲目、元数据与播放控制；[ContentDelegate.onSong](https://developer.garmin.com/connect-iq/api-docs/Toybox/Media/ContentDelegate.html) 是曲目开始、暂停、结束等离散事件。公开接口未提供普通表盘或手表应用读取系统播放器实时 PCM/FFT 的通用方法。因此不能把现有 Emote Play 直接包装成“任意歌曲精确同步”的真机声浪。

已做的 `music-preview.html` 是视觉验收：浏览器选择本地歌曲后，用 Web Audio 对该文件实时分析；没有文件时可开启明确标注的无声音演示。文件不上传，预览不等于手表可直接读取播放器音频。

后续可选路线：

1. **轻量手表应用**：沿用 Emote Play 的双眼和声浪，以手动 BPM、心率与运动状态驱动。可独立运行，但只是节拍风格化，不是歌曲实时波形。
2. **手机伴侣**：在手机端取得用户授权的音频特征，只传低频能量／节拍事件给手表。需要单独手机应用和验证蓝牙链路延迟；不应假定能读取所有流媒体平台的音频。
3. **受控曲库**：自己提供音频内容及预分析节拍包，按已知歌曲时间轴驱动表情。开发、内容授权与同步成本最高，但更容易做精确编舞。

推荐先验收浏览器视觉，再根据用户实际播放来源选 1 或 2 做真机 MVP。普通表盘不适合承载持续高帧率音乐互动，优先使用前台手表应用。
