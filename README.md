# Emote Life / Garmin Venu 4

Venu 4 45 mm 表盘、互动应用与浏览器动效工作台。当前浏览器版本为 **0.2.0**：18 项完整运动动作、眼睛与运动图标衔接、视觉居中校正，以及与表盘同心的眼睛活动区域。

**运动图标目前属于浏览器原型，尚未编译到手表。** `ciq/` 的 Emote Life 表盘与 `ciq-play/` 的 Emote Play 互动应用保留原有实现。本次更新不代表真机已安装新版，网页的 15/30 fps 预览也不代表真机性能。

## 快速运行

安装 Node.js 18 或更新版本：

```bash
git clone https://github.com/Gracylart/garmin-v4.git
cd garmin-v4
npm start
```

打开 <http://127.0.0.1:8796/studio.html>。浏览器预览只用 Node 内置模块，无需先安装依赖或 Garmin SDK。`Ctrl+C` 停止服务；修改端口可用 `EMOTE_PREVIEW_PORT=8800 npm start`（PowerShell：`$env:EMOTE_PREVIEW_PORT=8800; npm start`）。

| 页面 | 用途 |
| --- | --- |
| `/` 或 `/studio.html` | 主工作台：外观、运动、动画时间轴、设置与 PNG/JSON 导出 |
| `/sports-preview.html` | 运动转场实验：线条脱轨、融球铺屏、随机拼装、关键帧弧长与融球返回 |
| `/sports-icons/` | 18 项源动作素材库：播放、逐帧、锚点和 SVG 导出 |
| `/pixel-review.html` | 跑步、游泳、骑行、乒乓球的 480 帧 PNG / 矢量 / 二值差异对照 |
| `/play-preview.html` | 眼睛表情与手势验收 |
| `/clock-lab.html`、`/orbit-preview.html` | 指针转场、球面旋转研究 |
| `/preview.html` | 早期表盘行为研究，保留供比较 |

通过 HTTP 服务打开页面；直接双击 HTML 无法可靠加载 JSON 素材。

## 当前功能

- 18 项运动，14 项常用、4 项拓展，共 2,177 个源帧；铁人三项与现代五项已移除。
- Studio 以线条脱轨进入运动，初始姿态停留 0.2 s，播放完整动作后融球返回眼睛。运动速度单独控制，转场时长不随速度档变化。
- 每项运动使用固定视觉定位；缩略图、完整播放、转场落点与返回部件共用定位，保留原动作位移。
- 眼睛的活动极限圆与表盘同心；默认略微向上的眼神以球面俯仰表达。表情摇晃不会移动活动边界。
- 中、英、法界面，颜色设置、暂停、循环、时间轴与 PNG/JSON 导出。浏览器设置分别保存在各入口的 localStorage；仓库不包含用户存储，也不会自动覆盖已有关键帧。

JSON 导出是预览配置，不是 Garmin 安装包或视频。原始动作与原创转场的范围、素材来源见 [运动开发说明](docs/SPORTS.md) 和 [来源记录](THIRD_PARTY_SOURCES.md)。

## 项目结构

| 路径 | 职责 |
| --- | --- |
| `ciq/` | Emote Life 真机表盘、后台事件和省电逻辑 |
| `ciq-play/` | Emote Play 前台互动应用 |
| `play-preview.js` | 浏览器眼睛渲染与手势，向 Studio 暴露 `EmotePreview` |
| `studio.*`、`studio-assets/` | 主工作台及静态 UI 素材 |
| `sport-icons.js` | Studio 的运动加载、时序与播放适配 |
| `sports-catalog.js`、`sports-data/*.json` | 18 项元数据、固定定位和唯一一份完整帧路径 |
| `sports-exact.js` | 完整源帧播放器和共享定位接口 |
| `sports-bounce.js`、`sports-transitions.js` | 眼睛弹跳、绕圆、脱轨与融球转场 |
| `sports-preview.*` | 参数与关键帧实验界面 |
| `sports-icons/` | 素材库 UI、清单、18 个可编辑锚点 SVG 和历史轮廓审计 |
| `reference-frames/*/*.png`、`pixel-review.*` | 四项运动的原片 PNG 对照；路径 JSON 由服务器映射至 `sports-data/` |
| `scripts/`、`verify*.cjs` | 校准、完整性、几何、HTTP 入口与已有行为检查 |
| `ae-handoff/` | 既有 After Effects 项目、脚本与 SVG 交接素材 |

`engine.js`、`sports-motion.js`、`sports-disciplines.js` 等早期程序化研究保留供比较；当前精确运动以 `sports-exact.js` 和 `sports-data/` 为准。预览、测试与 SVG/JSON 资源不会被两个 `monkey.jungle` 自动打包进真机程序。

## 验证

```bash
npm test
```

包括既有表情、手势、球面旋转、指针转场检查，以及 18 项完整帧、独立运动速度、固定视觉中心、转场落点、眼睛同心边界和可移植 HTTP 入口检查。历史轮廓审计不等于本次重新进行原视频 RGB 审计，具体范围见 [运动说明](docs/SPORTS.md)。

调整锚点后可用 `npm run calibrate:sports` 重新计算固定视觉定位，再运行 `npm test` 并人工检查完整动作。

## 编译与安装手表应用

准备 Connect IQ SDK、Java、`venu445mm` 设备包，以及自己的开发者签名密钥。Mac / Linux：

```bash
export CIQ_SDK_ROOT="/absolute/path/to/connectiq-sdk"
export CIQ_DEVELOPER_KEY="/absolute/path/to/developer_key.der"
npm run build:mac
```

Windows 使用 `powershell -ExecutionPolicy Bypass -File .\build.ps1`，可通过 `-SdkRoot`、`-Device` 指定环境。输出位于 `ciq/bin/` 与 `ciq-play/bin/`。通过 USB 将 `.prg` 放入 `GARMIN/Apps` 后，在设备上选择 Emote Life 表盘或启动 Emote Play；复制成功不等于已启用。本次整理没有重新执行 SDK 编译或向设备部署。

签名密钥、SDK 缓存、安装包、网站部署归档、用户设置与作品集其他项目不纳入此仓库。真机行为和验收范围见 [硬件交付边界](docs/HARDWARE.md)、[VISUAL-ACCEPTANCE.md](VISUAL-ACCEPTANCE.md)。
