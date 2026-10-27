# 当前进度 · 2026-10-27

浏览器版本 **0.3.0**。此轮将作品集中已完成的 Garmin 更新整理回独立仓库。

## 已完成

- 玻璃表盘：使用 Figma 的平滑圆形玻璃与金属材质，叠加原有 454 × 454 Canvas；眼睛和 18 项完整运动继续随机播放。
- 作品集第一张（`media-1-0`）为展示区域，取消点击跳转；第二张（`media-1-1`）直接嵌入工作台。两处媒体 ID 与编号导航保留。
- 工作台仅保留外观、动画两页；表盘预览、3D 场景加载器、包装样机入口均已移除，保留屏幕预览、颜色、运动、时间轴、PNG / JSON 导出。
- 随机序列每轮重新洗牌，避免相邻重复；运动按需加载，支持快速切换、重复点击重播和失败重试，加载结束保持用户的暂停选择。
- 内嵌页面通过同源 `bloub-visibility` 消息暂停/恢复；独立打开表盘时自动播放，隐藏页面和减少动态效果偏好也会暂停表盘。

## 本地入口

`npm start` 后打开 `/studio.html` 查看工作台，打开 `/watch-preview.html` 查看动态玻璃表盘。`npm test` 运行完整检查。

第一张点击行为由作品集外层容器决定；独立表盘页面没有跳转链接。该容器在网站仓库使用 `div.garmin-live-card`，内部 iframe 为 `pointer-events:none`。本仓库的进度清单保留 `clickAction: none`，后续同步不可重新包裹链接。

## 材质与截图

- Figma：[Luminous UI](https://www.figma.com/design/yfJhdvbU6dDu1hWI4NOwin/)，材质节点 `151:531`。Figma 源为平滑椭圆、连续渐变与一条贝塞尔反光路径，已替换早期逐像素描边造成的锯齿轮廓。
- `assets/figma-glass-dial.png`：868 × 868 的材质导出，网页通过圆形裁切和 `screen` 混合叠加实时动画。
- `assets/emote-watchface-glass.png`：1200 × 800 展示预览。
- `assets/emote-animation-studio-current.jpg`：1280 × 1220 当前纯屏幕工作台预览。
- 网站来源版本：`fb7af0339e45e6bb669752dbc766b080c289025f`；来源、媒体 ID 和移除/保留项记录在 [portfolio-progress.json](portfolio-progress.json)。

## 后续边界

本轮保留独立仓库已有的固定运动定位和统一 `sports-data/` 加载实现。素材与浏览器效果不代表已经移植到 Monkey C；本轮没有重新编译 `.prg`、安装设备或进行真机性能验收，硬件状态仍见 [HARDWARE.md](HARDWARE.md)。

本轮回归覆盖完整运动与定位、表情手势、随机序列、加载切换/重试/暂停、自动表盘的单一 RAF 和可见性暂停，以及 HTTP 页面、脚本和图片资源。作品集视觉检查沿用此次网站发布时完成的桌面与移动端检查；本轮同步未新增视觉设计。
