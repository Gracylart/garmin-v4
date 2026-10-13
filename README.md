# Emote Life / Venu 4 45 mm

本项目交付两个独立的 Connect IQ 程序：**Emote Life** 日常表盘（0.6.1）和 **Emote Play** 前台互动应用（0.3.1）。两者都只在黑底上绘制两只浅色圆角眼睛，不显示时间、文字、嘴巴、彩带或烟花。浏览器页面用于视觉与手势验收，不能代替真机测试。

## 代码结构

| 路径 | 职责 |
| --- | --- |
| `ciq/source/EmoteView.mc`、`EmoteApp.mc` | 真机表盘：状态、系统数据、唤醒和省电 |
| `ciq-play/source/PlayView.mc`、`EmotePlayApp.mc` | 真机互动应用：手势、表情与后台事件 |
| `ciq/source/EyeShape.mc` | 两个真机程序共用的 64 点圆角眼睛绘制器 |
| `play-preview.html`、`play-preview.js` | 互动浏览器验收稿，不读取手表数据 |
| `preview.html`、`preview.js`、`engine.js` | 早期表盘动作研究稿，保留供比较，不进入真机构建 |
| `verify*.cjs` | 浏览器运动与手势回归测试 |
| `build.ps1` | 单一验证与双程序构建入口 |

真机构建仅由两个 `monkey.jungle` 各自纳入所需 Monkey C 源码；预览、测试和旧稿不被打包。流彩渲染已从浏览器与真机互动应用完全移除，保留球面转圈及边缘遮挡。历史生成的 `bin/`、`mir/`、`gen/` 为 SDK 产物，不是源码。

## 产品行为

**表盘：** 适配 454×454 的 Venu 4 45 mm；仅在亮屏高功耗状态运行 50 ms 动画计时器，低功耗状态清屏并停止计时。抬腕唤醒约 50% 概率摇头晃脑庆祝，否则朝连续随机角度张望约五秒并回中。心率读取系统 complication；步数增量影响活动节奏；夜间按本地时间 22:00–07:00 判断。心率不可用时采用中性值，不显示数字。运动完成后台事件可排队到下次亮屏播放庆祝。表盘本身不提供拖动或连点互动。

**互动应用：** 前台单点看向触点并随机切换眼形；850 ms 内三连点触发生气；小范围反复滑动触发躲避；沿圆屏画一整圈触发庆祝与震动；从一侧外缘跨中心直划到对侧外缘会在达到条件当下启动球面转圈，眼睛经过背面时遮挡、从另一侧出现，再缓动回正。庆祝、生气、转圈完整播放，不被触摸打断。1000–1999 步区间的步数事件（目前未做每日去重）和运动完成事件会在下次打开应用时庆祝；久坐提醒用前台移动条变化近似检测，不等于系统直接推送。震动仅由真机硬件执行。应用退出后不持续绘制。

**浏览器预览：** `node preview-server.cjs` 后访问 [互动预览](http://127.0.0.1:8796/play-preview.html)。页面上的抬腕、步数、运动和久坐按钮只模拟事件。预览与真机代码是两个实现，几何和手势需继续用真机验收。

## 验证与安装

在项目根目录运行 `powershell -ExecutionPolicy Bypass -File .\build.ps1`，会顺序执行三项浏览器回归检查，并为 `venu445mm` 构建表盘及互动应用。然后通过 USB 将两个 `.prg` 放入设备的 `GARMIN/Apps`。手表侧还需要手动选择 **Emote Life** 为当前表盘；**Emote Play** 在应用列表单独启动。复制成功不等于表盘已启用，真机视觉和手势仍需用户验收。

审核准则见 `VISUAL-ACCEPTANCE.md`，提示词审核见 `AUDIT_PROMPT.md`。

下一版表情候选与浏览器/真机交付边界见 `EXPRESSION-CANDIDATES.md`；当前手表上的版本不包含这些新增状态。

## BLOUB HTML 工作台

`node preview-server.cjs` 后打开 `/studio.html`（默认端口 8796，可用 `EMOTE_PREVIEW_PORT` 指定）。页面基于 Figma 的外观、动画、设置三页框架，静态导航图标保存在 `studio-assets/`，无新增运行时依赖。

- 外观：8 个眼形快捷预设、13 种表情（含生气）、12 种眼睛颜色，圆形 454 × 454 PNG 导出。眼形预设复用现有表情，不是独立的形状混合系统。
- 动画：14 个可播放项目，含球面转圈、庆祝、挠痒痒和 `clock-transition.js` 的 1 秒参数化转场。支持暂停、时间轴定位、循环及序列 JSON 导出；JSON 是预览配置，不是视频或 Garmin 安装包。
- 设置：中、英、法界面与浏览器本地持久化。原始参考项目链接不代表本项目官方归属。

工作台通过 `EmotePreview` 小接口复用 `play-preview.js` 的渲染与手势。外观页可直接交互，动画页由时间轴控制，避免手势与序列争抢状态。原实验页和手表代码保持独立，本次页面设置不会自动写入真机。
## 在 Mac 上继续开发

安装 Node.js 18 或更新版本后，在终端运行：

```bash
git clone https://github.com/Gracylart/garmin-v4.git
cd garmin-v4
EMOTE_PREVIEW_PORT=8800 npm start
```

然后打开 <http://127.0.0.1:8800/studio.html>。浏览器预览没有额外依赖，不需要先安装 Garmin SDK。终端服务需保持运行；`Ctrl+C` 停止服务。运行 `npm test` 可检查现有动画逻辑。

继续编译手表应用时，安装 Mac 版 Connect IQ SDK、Java 运行环境和 `venu445mm` 设备包，准备自己的开发者签名密钥，然后运行：

```bash
export CIQ_SDK_ROOT="/absolute/path/to/connectiq-sdk"
export CIQ_DEVELOPER_KEY="/absolute/path/to/developer_key.der"
npm run build:mac
```

输出位于 `ciq/bin/` 与 `ciq-play/bin/`。默认目标是 Venu 4 45 mm；可用 `bash build.sh venu441mm` 切换至 41 mm。签名密钥、编译缓存和历史安装包不纳入 Git。Windows 继续使用 `build.ps1`。

`ae-handoff/` 保留可编辑的 AE 项目、脚本及 SVG；Mac 端用 After Effects 打开 `.aep`。可选静态审查图脚本 `render-review.cjs` 需要单独安装 `@napi-rs/canvas`，不影响工作台运行。

