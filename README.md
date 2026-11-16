# Rock Radar · React S2

当前开发分支为 `react-s2`，原样迁移基线为 `hktv-new-version @ ba1d92b`。项目用于编辑角色评分、预览雷达图演出，并组合角色立绘、抽卡、MVP、专场、音乐和片尾。前端采用 React + TypeScript + Vite，演出内核继续使用原 Canvas／DOM／CSS 实现。

默认展示已启用 S2 动态背景，支持普通／高光场景、轻微／增强动态和单独暂停。评分、素材命名、数据格式及原播放逻辑沿用基线。通过 `?theme=original` 可对比 React 版的原画面。

## 安装和启动

要求 Node.js ≥ 22.12.0。在项目根目录执行：

```sh
npm ci
npm start
```

| 地址 | 用途 |
| --- | --- |
| `http://localhost:3003/` | React 管理页 |
| `http://localhost:3003/radar` | S2 雷达展示，按空格开始 |
| `http://localhost:3003/radar?theme=original` | React 原版画面对比 |
| `http://localhost:3003/legacy/admin` | 原单 HTML 管理页 |
| `http://localhost:3003/legacy/radar` | 原单 HTML 展示页 |

`npm start` 与 `npm run dev` 均启动开发服务，修改源码会热更新。生产运行使用：

```sh
npm run build
npm run start:next
```

`PORT` 可覆盖默认端口。旧单 HTML 服务须显式执行 `npm run start:legacy`；它也默认使用 3003，不能与新版同时占用同一端口。React 服务绑定 `127.0.0.1`，开发热更新使用 `PORT + 1`。

## 使用与素材

管理页包括角色编辑、角色位置、角色对比、专场、图片和全局配置。编辑暂存在浏览器，保存后通过原 API 写入 `data.json`。新旧页面共享同一份数据；展示页刷新后读取保存结果。

图片默认放入 `public/assets/images/`，音乐和视频按配置中的 URL 提供，可放在 `public/assets/audio/`、`public/assets/video/`。没有素材时立绘或音视频可能缺失；项目不会自动生成角色图。命名规则与数据字段见下文。

S2 工具条只改变当前预览，不写入 `data.json`。普通／高光背景为手动切换，不会自动跟随角色或 MVP。管理页的粒子／流体背景参数作用于原版背景模式；S2 使用独立渲染器。完整说明见 [S2 背景](docs/s2-background-preview.md)。

## 当前目录与开发入口

```text
app/                     Vite 的管理、展示 HTML 入口
src/app/                 React 挂载、开发与生产服务
src/admin/               六个页签的组件、编辑控制器与基础样式
src/radar/               展示组件、演出引擎、默认配置与基础样式
src/radar/themes/        S2 背景、预览工具条与主题样式
src/shared/              生命周期资源回收
public/js/、public/css/  原背景、专场、角色对比、排序、音乐等公共模块
public/assets/           本地素材
data.json                配置、角色、评分、图片取景
server.js                共享 Express API 与旧版独立启动入口
index.html、admin.html   原单 HTML 基线与构建依赖
tests/                   原有规则测试、API／源码检查和浏览器对照
docs/                    架构、功能和迁移记录
```

日常改动进入 `src/`：展示逻辑位于 `src/radar/engine.js`，管理逻辑位于 `src/admin/controller.js`。React 管理页面结构和生命周期，原动态表单与演出状态尚未全部改为 React 状态。

原 HTML 保留对照，并由 Vite 提取公共样式和脚本链接。不要将它们误认作当前默认页面，或在未调整构建配置前删除。`dist/`、`test-results/` 和旧实验 `workspace/` 不参与源码提交。

## 本地 API

`src/app/server.ts` 通过 `server.js` 的 `createLegacyApp()` 复用原接口：

- `GET /api/data`、`PUT /api/data`：读取、整体保存数据。
- `GET /api/images`：枚举图片。
- `POST /api/upload`、`POST /api/upload-slot/:slot`：上传普通图片或特殊槽位素材。
- `PATCH /api/images/:filename`、`DELETE /api/images/:filename`：重命名、删除图片并维护 `IMAGE_META`。

React 服务支持 `RADAR_DATA_FILE` 和 `RADAR_IMAGE_DIR` 环境变量以指定独立数据、素材目录。当前没有数据库或账号体系。

## 数据模型

项目的核心数据在 `data.json` 中，结构是：

```json
{
  "CONFIG": {},
  "COLOR_PRESETS": [],
  "SPECIAL_PROFILES": [],
  "mvplist": [],
  "expertlist": [],
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
- 音乐：`MUSIC_VOLUME`、`MUSIC_TRACKS`、`MUSIC_DELAY_SECONDS`
- 雷达音频特效：`RADAR_AUDIO_FX_MODE`
- 抽卡演出：`GACHA_ANIM_DURATION`、`GACHA_ANIM_TYPE`、`GACHA_FONT_STYLE`、`GACHA_LOGO_ON_TIME`、`GACHA_LOGO_DURATION`
- 结尾：`OUTRO_VIDEO`、`OUTRO_TRANSITION_MS`
- 品牌文案：`BRAND_TOP_RIGHT_TEXT`、`BRAND_BOTTOM_LEFT_TEXT`、`BRAND_WATERMARK_CN`、`BRAND_WATERMARK_EN`、`INTRO_TITLE_MAIN`、`INTRO_TITLE_SUB`

`MUSIC_DELAY_SECONDS` 表示音乐相对整场演出向后延迟的秒数，范围为 `0–60`，支持一位小数。延迟期间视觉时间轴继续运行；延迟结束后音乐立即按 `MUSIC_VOLUME` 播放，多首音乐仅在整个播放列表首次启动前应用一次延迟。

### `namelist`

这是展示页真正播放的角色数组。单项常见字段有：

```json
{
  "name": "角色名",
  "points": [80, 72, 1.2, 68, 1.05, 1.08],
  "desc": "描述标签",
  "colorMode": "preset",
  "colorIndex": 3,
  "duration": 6000,
  "gacha": true,
  "equipmentIds": "1,5,9"
}
```

字段作用：

- `name`：展示名称，也会参与图片命名匹配
- `points`：雷达图各维分数
- `desc`：描述文本，同时会被拆分为羁绊/标签图片名称
- `colorMode`：`preset` 使用固定配色，`custom` 使用角色自定义配色
- `colorIndex`：固定配色索引，只允许 `0–4`
- `customColor`：自定义配色对象，包含 `color`、`bg1`、`bg2`
- `duration`：该角色停留时长，未填时使用全局默认值
- `gacha`：是否在该角色出现前播放抽卡动画
- `equipmentIds`：角色下方装备/附属图标编号列表
- `specialProfileId`：可选的角色专场 ID；失效或停用时自动回退普通界面

### `COLOR_PRESETS`

固定保存 5 个全局配色，每项包含可编辑名称、主色与两层背景色：

```json
{
  "name": "青蓝",
  "color": "#00ffff",
  "bg1": "#001a1a",
  "bg2": "#000d0d"
}
```

选手管理中的配色按钮会读取这五项。选择“自定义”后，颜色写入该角色自己的 `customColor`，不会影响其他角色。二段形态使用相同结构。

### `SPECIAL_PROFILES`

保存可复用的角色专场。管理页使用折叠卡片编辑主题色、背景、名称动画、角色图转场、雷达转场、抽卡风格、时间和素材，并通过 `specialProfileId` 绑定角色。

银狼 LV.999 的原有专属界面已经迁移为 `silverwolf-lv999` 专场，不再直接依赖角色名称触发。完整结构和扩展方法见 [`docs/special-profiles.md`](docs/special-profiles.md)。

### `mvplist`

`mvplist` 是一个名称数组。

当角色名出现在这个列表中时，展示页会启用 MVP 分支效果：

- 尝试加载 `<角色名>1.*` 作为左侧背景图
- 使用金色风格的雷达图主题
- 显示 MVP 标识和额外高光

### `expertlist`

`expertlist` 是一个去重后的角色名称数组，通过管理页“全局配置 → 专家列表”维护。

当当前展示名称与列表中的名称精确匹配时，展示页会在角色名字右侧显示 `public/assets/images/专家.png`。基础、二段和 MVP 等展示状态使用同一匹配规则；未匹配的角色不创建可见占位。

### 角色对比

管理页“角色对比”同时叠加两名不同角色的雷达多边形，并允许在旁边直接修改双方原始 `points`。输入支持两位小数，超过全局满分时图形可以越过最外圈；雷达图下方实时统计全部角色在各维度的最高分和并列角色。保存后写回原有 `namelist`。实现与边界说明见 [`docs/role-comparison.md`](docs/role-comparison.md)。

### 角色位置

管理页“角色位置”会在响应式网格中一次展示全部角色名称。拖动卡片到目标卡片前后即可调整 `namelist` 顺序，靠近视口上下边缘时会自动滚动；只有点击“保存顺序”后才会写入服务器。MVP 名单成员或存在 `best_<角色名>.*` 图片的角色会显示 Best 高亮。完整规则见 [`docs/role-position.md`](docs/role-position.md)。

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

这部分很重要，因为 `src/radar/engine.js` 里大量素材是按文件名约定自动匹配的。

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
7. 更新角色名、主图、装备、羁绊和 MVP 图层
8. 将雷达图从上一组分数过渡到下一组分数，或者从中心展开
9. 按音乐分析结果叠加雷达外圈动效；背景由 S2 或原版背景系统独立更新
10. 全部角色结束后进入结尾视频

这个流程说明了一件事：

项目真正的“主角”不是角色管理，而是雷达图切换时那套前端视效编排。

## 验证与当前边界

- `npm run check`：类型检查、五组原有测试、API／源码一致性检查及生产构建。
- `npm run test:replica`：原 HTML 与 React 原版模式的阶段截图、编辑行为，以及 S2 入口和控制检查。
- 浏览器测试优先使用本机 Google Chrome；其他环境需要安装 Playwright Chromium，例如 `npx playwright install chromium`。

首次 S2 提交 `00e4f85` 的构建及 S2 交互检查通过；1080p 抽卡像素对照仍有待定位差异。真实素材、音轨、外部字体和整片播放尚需独立验收，不能把测试素材截图等同于完整成片验证。

当前未接入 Remotion、直接视频导出或历史实验的 `workspace/project.json`。后续拆分应以 `src/radar/engine.js` 和 `src/admin/controller.js` 为基础，逐步独立时间轴、素材、音频和抽卡模块。

文档入口见 [docs/README.md](docs/README.md)，详细结构见 [架构](docs/architecture.md)，迁移与已知验证差异见 [迁移记录](docs/react-migration.md)。
