# Rock Radar Architecture

## Overview

`Rock-Radar` 当前是一套本地运行的前端雷达图演示系统，重点不是通用后台，也不是数据抓取，而是“如何把一组角色分数做成具有包装感的雷达图切换演出”。

当前结构分为五层：

- 展示层：`public/index.html`
- 编辑层：`public/admin.html`
- 本地数据与素材服务层：`server/server.js`
- 持久化数据层：`data/data.json`
- 后续模块化源码层：`src/`

## Source Of Truth

项目唯一的持久化数据源是 `data/data.json`。

展示页和管理页都围绕它工作：

- 管理页通过 `/api/data` 读取数据，在浏览器里编辑，然后整体保存回去。
- 展示页启动时通过 `/api/data` 读取数据，把内容转成运行时状态。

这意味着：

- 改数据最稳妥的入口是 `public/admin.html`。
- 想直接批量处理也可以改 `data/data.json`。
- 当前没有数据库，也没有用户权限体系。

## Static Assets

静态资源现在集中放在 `public/assets/`：

- `public/assets/images/`：角色图、抽卡图、MVP 图、羁绊图标、星级图、装备图。
- `public/assets/audio/`：背景音乐。
- `public/assets/video/`：结尾视频。

服务端提供两类路径：

- 新路径：`/assets/images/...`、`/assets/audio/...`、`/assets/video/...`
- 兼容路径：`/pic/...`、`/music.mp3`、`/music2.mp3`、`/ending.mp4`

兼容路径只用于降低迁移风险；新增配置和新增代码应优先使用 `/assets/...`。

## File Responsibilities

### `public/index.html`

展示页承担了大量职责，目前仍是“大单文件前端引擎”：

- 初始化配置和角色数据
- 计算时间轴
- 预加载图片
- 角色切换编排
- 雷达图绘制
- 背景特效
- 音频分析与音频驱动特效
- 抽卡动画
- MVP 特殊分支
- 结尾视频

关键函数可以按下面理解：

- `loadData()`：从 `/api/data` 获取运行数据。
- `updateUI()`：切换到下一个角色时调度界面过渡。
- `performTransition()`：真正应用角色内容、图片、主题色和目标分数。
- `drawRadar()`：绘制当前帧雷达图。
- `drawBackgroundEffect()`：绘制背景粒子/星空/涟漪。
- `drawRadarAudioFx()`：根据音频能量给雷达外围加动态效果。
- `startOutroSequence()`：角色播放完后的结尾逻辑。

### `public/admin.html`

管理页本质是一个本地 CMS：

- 维护角色列表
- 维护雷达维度
- 维护颜色方案
- 管理图片素材
- 调整图片取景
- 导入导出 CSV

关键函数：

- `init()`：初始化并读取 `/api/data`。
- `normalizeVertexConfigAndBands()`：把配置和角色分数整理成一致长度。
- `renderBands()`：渲染角色编辑区。
- `renderConfig()`：渲染全局配置区。
- `renderColors()`：渲染颜色方案区。
- `openImageEditor()`：打开图片取景编辑器。

### `server/server.js`

服务端非常轻量，主要负责：

- 暴露 `public/` 静态文件。
- 返回 `/` 和 `/radar` 页面入口。
- 读写 `data/data.json`。
- 管理 `public/assets/images/` 中的图片。
- 在图片重命名/删除时维护 `IMAGE_META`。
- 保留旧路径兼容层。

它不是业务计算中心，更像本地文件中转层。

### `src/`

`src/` 是下一阶段模块化拆分的目标目录，当前运行时还没有依赖它。

建议边界：

- `src/radar/`：雷达几何、分数映射、canvas 绘制、形变状态。
- `src/effects/`：背景特效、音频联动、扫描线、粒子、覆盖层。
- `src/admin/`：管理页状态、表单、图片编辑器、CSV 工具。
- `src/shared/`：数据归一化、配置默认值、素材 URL、校验、通用工具。

## Data Flow

当前项目的数据流是单向的：

1. `public/admin.html` 读取 `/api/data`。
2. 用户在浏览器里修改角色、配置、图片取景。
3. 点击保存后，`PUT /api/data` 覆盖写回 `data/data.json`。
4. `public/index.html` 刷新后重新读取 `/api/data`。
5. 展示页用新的配置和数据执行动画。

图片相关则走另一条支线：

1. 图片上传到 `public/assets/images/`。
2. 图片名作为素材类型匹配依据。
3. 取景信息保存到 `IMAGE_META`。
4. 展示页按文件名和 `IMAGE_META` 应用图片。

## Radar Rendering Model

雷达图并不是简单地把数值等比例画在一个固定 0 到 100 的六边形里，而是做了更灵活的映射：

- 维度数量由 `VERTEX_COUNT` 控制，不一定永远是 6。
- 每个维度有自己的 `BASE_MAX_SCORES`。
- 每个维度还有 `MIN_SCORES`。
- 标签显示时支持百分比和原值两种模式。
- 雷达多边形支持超出“标准满分”范围的视觉表现。

实际绘制层次大致是：

1. 网格层
2. 轴线层
3. 内部底板遮罩
4. 平均值参考层
5. 当前角色雷达面
6. 外圈音频联动层
7. 标签与 Best 高亮文本

这使它更像“包装型展示雷达图”，而不是传统 BI 图表。

## Transition Model

角色切换时有三条主要分支。

### 普通切换

- 从上一位角色分数平滑变形到下一位角色分数。
- 同时更换名称、图片、颜色和附属信息。

### 中心展开切换

当首次出现，或角色带有 `best_角色名.*` 相关表现时，会采用从中心展开的演出方式：

- 先把雷达设为全 0。
- 再从中心向外展开到目标形态。
- 配合标签延迟出现。

### 抽卡分支

对 `gacha: true` 的角色：

- 先隐藏雷达。
- 播放开门动画。
- 读取 `best_角色名.*` 和门板图片。
- 动画结束后再切回正常角色展示。

这是当前项目与一般雷达图页面最大的差异点之一。

## Asset Convention

项目大量依赖命名约定而不是显式配置。

主要命名规则：

- 角色主图：`<name>.*`
- 抽卡背景：`best_<name>.*`
- MVP 图：`<name>1.*`
- 左右门板：`gacha_door_left.*`、`gacha_door_right.*`
- 羁绊图标：`faction_<tag>.*`
- 星级图：`Star1.png` 到 `Star5.png`
- 装备图：`1.png`、`2.png` 这类编号图

优点是换图很快、配置成本低；缺点是命名一旦不规范，页面可能静默失效。后续要增强稳定性，可以把这些约定逐步收束成显式字段或校验规则。

## Current Strengths

- 快速改内容：管理页和 JSON 足够直接。
- 本地可运行：没有复杂部署依赖。
- 演出能力强：雷达图、图片、背景、抽卡、音频都能联动。
- 结构边界更清楚：入口、数据、素材和服务端已经分离。

## Current Risks

- `public/index.html` 体量仍然很大，展示逻辑高度耦合。
- `public/admin.html` 同样承担了过多表单和状态管理职责。
- 图片素材依赖命名约定，缺乏校验。
- `data/data.json` 结构较自由，字段约束偏弱。
- 代码中仍残留“band/选手/角色”多种历史命名，语义不够统一。

## Recommended Refactor Direction

后续继续朝“前端雷达图变换效果引擎”推进时，建议按下面顺序改：

1. 先从 `public/index.html` 抽出展示页模块边界，例如 `radar`、`timeline`、`audio`、`gacha`、`assets`。
2. 再整理数据边界，明确哪些字段属于雷达数据，哪些属于演出配置，哪些属于素材映射。
3. 最后整理视觉细节，避免大单文件继续膨胀。

## Practical Development Advice

如果后面围绕“前端雷达图变换效果”继续开发，最值得优先看的代码区域是：

- `public/index.html` 中的 `performTransition()`
- `public/index.html` 中的 `drawRadar()`
- `public/index.html` 中的 `drawRadarAudioFx()`
- `public/index.html` 中的 `drawBackgroundEffect()`
- `public/index.html` 中的 `playGachaAnimation()` 相关逻辑
- `public/admin.html` 中的 `normalizeVertexConfigAndBands()`

这些函数基本覆盖了“数据如何进入页面”和“页面如何把雷达图做出变形演出”这两条主链路。
