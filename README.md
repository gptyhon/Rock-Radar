# Rock Radar

`Rock-Radar` 是一个以 `index.html` 为核心展示页的前端雷达图特效项目。

当前版本不是单纯的静态页面，而是由下面三部分组成：

- `index.html`：展示端，负责雷达图绘制、数据切换、背景特效、抽卡动画、结尾视频与时间轴控制
- `admin.html`：本地管理端，负责编辑角色数据、全局配置、颜色方案、图片素材与取景信息
- `server.js`：本地 Express 服务，提供 `data.json` 读写与图片上传/重命名/删除接口

项目的真正目标是用前端做一套“数据驱动的雷达图变换效果系统”：

- 根据 `data.json` 中的角色列表依次播放
- 在角色切换时让雷达图在不同分数形态之间平滑变形
- 叠加图片、粒子、音频可视化、MVP、高光、抽卡开门、结尾视频等演出效果

## 当前项目定位

从代码现状看，这个项目更接近一个“雷达图演示播放器/包装器”，而不是通用图表组件库。

它的核心特点是：

- 数据驱动：雷达维度、满分、最小值、角色分数、时长都来自 `data.json`
- 强视觉化：雷达图本身带有网格、发光描边、平均值参考层、音频联动外圈效果
- 强包装感：展示页同时管理角色图、装备图、羁绊图标、MVP 背景、抽卡动画和结尾视频
- 可运营编辑：通过 `admin.html` 调整配置，不必每次直接改代码

如果后续继续开发，这个项目的主线应该理解为：

1. 用前端 canvas / DOM / CSS animation 驱动雷达图变形
2. 用本地 JSON 和图片素材组织播放内容
3. 用管理页降低改配置和换素材的成本

## 运行方式

安装依赖：

```bash
npm install
```

启动本地服务：

```bash
npm start
```

默认地址：

- 管理页：`http://localhost:3003/`
- 展示页：`http://localhost:3003/radar`

## 真实目录结构

当前仓库里真正和主流程相关的文件主要是：

```text
.
├─ admin.html          管理页
├─ index.html          展示页 / 雷达图特效主入口
├─ server.js           本地 API 与静态资源服务
├─ data.json           配置、角色数据、图片取景数据
├─ pic/                图片素材目录
├─ music.mp3           背景音乐 1
├─ music2.mp3          背景音乐 2
├─ ending.mp4          结尾视频（可选）
├─ package.json
├─ README.md
└─ docs/
```

仓库里还有一些临时脚本、旧页面和导出的 CSV，这些不是当前主流程的一部分：

- `README.old.md`：旧文档，不再作为开发依据
- `index - cs.html`、`hktv.html`：历史页面/实验文件
- `_tmp_*`、`tmp_*`、零散 `.csv`：临时或中间文件

## 核心架构

### 1. 展示页：`index.html`

`index.html` 是整个项目的主引擎，主要职责包括：

- 启动时请求 `/api/data` 并载入 `CONFIG`、`namelist`、`mvplist`、`IMAGE_META`
- 根据角色顺序计算总时间轴和单角色停留时长
- 在切换角色时更新主题色、角色图、附属素材和目标分数
- 用 canvas 绘制雷达网格、平均值参考层、当前角色雷达多边形和标签
- 用音频分析数据驱动雷达周围额外动效
- 根据配置播放背景粒子、星空或涟漪效果
- 对标记了 `gacha: true` 的角色插入抽卡开门动画
- 在全部角色结束后播放 `OUTRO_VIDEO`

从实现方式看，展示页是“Canvas 雷达绘制 + DOM 图层 + CSS 动画 + 音频分析”的混合方案。

### 2. 管理页：`admin.html`

`admin.html` 不是简单表单，它已经是一套本地编辑后台，支持：

- 编辑角色列表
- 编辑每个角色的各维度分数、描述、颜色索引、停留时长、是否触发抽卡
- 调整维度数量、维度名称、每个维度的满分和最小值
- 调整雷达图参数、音乐参数、背景特效参数、抽卡参数、品牌文案
- 维护 `COLOR_PRESETS`
- 上传图片、重命名图片、删除图片
- 给普通图片、抽卡背景、门板图片、MVP 图片设置取景参数
- 导入/导出 CSV 批量编辑角色数据

最后通过 `PUT /api/data` 把内容整体写回 `data.json`。

### 3. 本地服务：`server.js`

`server.js` 很轻，但很关键，主要职责是：

- 提供静态文件访问
- `/` 返回 `admin.html`
- `/radar` 返回 `index.html`
- `/api/data` 读取和保存 `data.json`
- `/api/images` 枚举 `pic/` 目录图片
- `/api/upload` 上传普通图片
- `/api/upload-slot/:slot` 上传特殊槽位图片
- `/api/images/:filename` 支持重命名和删除

它同时负责把图片取景元数据和文件名变更保持一致，例如重命名图片时同步迁移 `IMAGE_META`。

## 数据模型

项目的核心数据在 `data.json` 中，结构是：

```json
{
  "CONFIG": {},
  "COLOR_PRESETS": [],
  "mvplist": [],
  "IMAGE_META": {},
  "namelist": []
}
```

### `CONFIG`

控制展示页的大部分行为。当前代码中已经实际用到的配置大致包括：

- 雷达结构：`VERTEX_COUNT`、`DIM_NAMES`、`BASE_MAX_SCORES`、`MIN_SCORES`
- 雷达绘制：`RADAR_SCALE`、`RADAR_GRID_LEVELS`、`RADAR_GRID_LINE_WIDTH`、`RADAR_GRID_LINE_OPACITY`
- 文本显示：`USE_PERCENTAGE`、`REAL_PERCENTAGE`、`USE_AUTO_PRECISION`、`SHOW_SCORE_UNDER_NAME`
- 播放节奏：`ANIM_DURATION`、`DEFAULT_DURATION`、`INTRO_WAIT_TIME`、`DETAIL_SWAP_LEAD_MS`
- 图片显示：`IMAGE_SCALE`
- 背景特效：`BG_EFFECT_MODE`、`PARTICLE_OPACITY_MULT`、`PARTICLE_SIZE_MULT`
- 音乐：`MUSIC_VOLUME`、`MUSIC_TRACKS`
- 雷达音频特效：`RADAR_AUDIO_FX_MODE`
- 抽卡演出：`GACHA_ANIM_DURATION`、`GACHA_ANIM_TYPE`、`GACHA_FONT_STYLE`、`GACHA_LOGO_ON_TIME`、`GACHA_LOGO_DURATION`
- 结尾：`OUTRO_VIDEO`、`OUTRO_TRANSITION_MS`
- 品牌文案：`BRAND_TOP_RIGHT_TEXT`、`BRAND_BOTTOM_LEFT_TEXT`、`BRAND_WATERMARK_CN`、`BRAND_WATERMARK_EN`、`INTRO_TITLE_MAIN`、`INTRO_TITLE_SUB`

### `namelist`

这是展示页真正播放的角色数组。单项常见字段有：

```json
{
  "name": "角色名",
  "points": [80, 72, 1.2, 68, 1.05, 1.08],
  "desc": "描述标签",
  "colorIndex": 3,
  "duration": 6000,
  "gacha": true,
  "starLevel": 4,
  "equipmentIds": "1,5,9"
}
```

字段作用：

- `name`：展示名称，也会参与图片命名匹配
- `points`：雷达图各维分数
- `desc`：描述文本，同时会被拆分为羁绊/标签图片名称
- `colorIndex`：对应 `COLOR_PRESETS` 的索引
- `duration`：该角色停留时长，未填时使用全局默认值
- `gacha`：是否在该角色出现前播放抽卡动画
- `starLevel`：角色星级条图片使用的等级
- `equipmentIds`：角色下方装备/附属图标编号列表

### `mvplist`

`mvplist` 是一个名称数组。

当角色名出现在这个列表中时，展示页会启用 MVP 分支效果：

- 尝试加载 `<角色名>1.*` 作为左侧背景图
- 使用金色风格的雷达图主题
- 显示 MVP 标识和额外高光

### `IMAGE_META`

保存每张图片的取景信息，典型结构如下：

```json
{
  "示例.png": {
    "fit": "cover",
    "scale": 1.08,
    "x": 48.5,
    "y": 32.0
  }
}
```

字段含义：

- `fit`：`contain` 或 `cover`
- `scale`：缩放倍数
- `x` / `y`：焦点位置，0 到 100

管理页里的取景编辑器会把这些值写回这里，展示页再按不同用途映射到具体布局。

## 素材命名规则

这部分很重要，因为 `index.html` 里大量素材是按文件名约定自动匹配的。

### 角色主图

```text
<角色名>.<扩展名>
```

例如：

```text
流萤.png
Archer.webp
```

### 抽卡背景图

```text
best_<角色名>.<扩展名>
```

用于 `gacha: true` 角色的开门后背景。

### MVP 左侧背景图

```text
<角色名>1.<扩展名>
```

只有角色名同时在 `mvplist` 中时才会生效。

### 抽卡门板图片

固定使用：

```text
gacha_door_left.<扩展名>
gacha_door_right.<扩展名>
```

管理页对这两个槽位做了专门上传入口。

### 羁绊/标签图标

展示页会把 `desc` 拆成标签，并尝试加载：

```text
faction_<标签>.<扩展名>
```

### 星级图

展示页会根据 `starLevel` 尝试匹配：

```text
Star1.png
Star2.png
Star3.png
Star4.png
Star5.png
```

### 装备图

展示页会根据 `equipmentIds` 加载数字编号图片，例如：

```text
1.png
14.png
29.png
```

## 展示页的实际播放流程

按当前代码，展示端大致是这样工作的：

1. 加载 `data.json`
2. 归一化配置和角色数据
3. 计算每个角色在总时间轴中的区间
4. 进入介绍页/等待阶段
5. 依次切换角色
6. 如果当前角色开启 `gacha`，先播抽卡动画
7. 更新角色名、主图、星级、装备、羁绊和 MVP 图层
8. 将雷达图从上一组分数过渡到下一组分数，或者从中心展开
9. 按音乐分析结果叠加雷达外圈动效与背景特效
10. 全部角色结束后进入结尾视频

这个流程说明了一件事：

项目真正的“主角”不是角色管理，而是雷达图切换时那套前端视效编排。

## 适合继续迭代的方向

如果后续想把项目继续往“前端雷达图变换效果”这个目标上推进，建议优先关注这些方向：

- 把 `index.html` 中大块逻辑拆成模块，降低单文件复杂度
- 把雷达绘制、音频联动、背景特效、抽卡演出拆成独立子模块
- 明确区分“数据层”“演出层”“素材层”
- 补一个真正的配置说明文档，列清每个 `CONFIG` 字段的用途和默认值
- 如果后续要复用，可以把雷达图绘制抽成纯前端组件，再把运营包装层单独保留

## 文档说明

- 本文档基于当前仓库代码重新分析得出
- `README.old.md` 中的旧描述不再作为当前版本依据
- 更细的实现拆解请看 [docs/architecture.md](docs/architecture.md)
