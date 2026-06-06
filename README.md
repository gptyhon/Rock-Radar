# Rock Radar

`Rock-Radar` 是一套本地运行的前端雷达图演示系统。它的重点不是通用图表库或线上后台，而是把一组角色分数做成具有包装感的雷达图切换演出。

当前版本已经完成第一步文件结构整理：运行入口、数据、静态资源、服务端和后续源码模块边界分开，便于继续拆分雷达图特效逻辑。

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

语法检查：

```bash
npm run check
```

## 目录结构

```text
.
├─ public/
│  ├─ admin.html              管理页
│  ├─ index.html              展示页 / 雷达图特效主入口
│  └─ assets/
│     ├─ images/              图片素材
│     ├─ audio/               背景音乐
│     └─ video/               结尾视频
├─ data/
│  └─ data.json               配置、角色数据、图片取景数据
├─ server/
│  └─ server.js               本地 API 与静态资源服务
├─ src/
│  ├─ radar/                  后续雷达绘制与变形模块
│  ├─ effects/                后续视觉/音频特效模块
│  ├─ admin/                  后续管理页模块
│  └─ shared/                 后续共享工具、校验、数据适配
├─ docs/
│  └─ architecture.md
├─ package.json
└─ Agent.md
```

兼容说明：

- `/` 仍返回管理页。
- `/radar` 仍返回展示页。
- `/api/data` 读写 `data/data.json`。
- `/api/images`、上传、重命名、删除接口现在管理 `public/assets/images/`。
- 旧图片路径 `/pic/<filename>` 仍可访问，方便兼容历史代码和旧配置。
- 旧媒体路径 `/music.mp3`、`/music2.mp3`、`/ending.mp4` 仍可访问；新配置推荐使用 `/assets/audio/...` 和 `/assets/video/...`。

## 核心职责

### 展示页：`public/index.html`

展示页仍是当前主引擎，负责：

- 请求 `/api/data` 并载入 `CONFIG`、`namelist`、`mvplist`、`IMAGE_META`
- 根据角色顺序计算总时间轴和单角色停留时长
- 切换角色时更新主题色、角色图、附属素材和目标分数
- 用 canvas 绘制雷达网格、平均值参考层、当前角色雷达多边形和标签
- 用音频分析驱动雷达外圈动效
- 播放背景粒子、星空、涟漪、抽卡开门、MVP 高光和结尾视频

### 管理页：`public/admin.html`

管理页是一套本地 CMS，负责：

- 编辑角色列表、分数、描述、停留时长、抽卡标记
- 调整雷达维度、满分、最小值、全局演出配置
- 维护颜色方案
- 上传、重命名、删除图片素材
- 调整图片取景参数
- 导入/导出 CSV
- 通过 `PUT /api/data` 把内容写回 `data/data.json`

### 服务端：`server/server.js`

服务端是轻量本地文件中转层，负责：

- 暴露 `public/` 静态资源
- 提供 `/`、`/radar` 页面入口
- 提供 `/api/data` 数据读写
- 提供 `/api/images`、`/api/upload`、`/api/upload-slot/:slot`、`/api/images/:filename`
- 图片重命名或删除时同步维护 `IMAGE_META`

## 数据模型

核心数据在 `data/data.json`：

```json
{
  "CONFIG": {},
  "COLOR_PRESETS": [],
  "mvplist": [],
  "IMAGE_META": {},
  "namelist": []
}
```

`CONFIG` 控制雷达结构、演出节奏、音乐、背景特效、抽卡和结尾视频等行为。

`namelist` 是实际播放的角色数组。常见字段包括 `name`、`points`、`desc`、`colorIndex`、`duration`、`gacha`、`starLevel`、`equipmentIds`。

`mvplist` 是触发 MVP 分支效果的角色名数组。

`IMAGE_META` 保存图片取景信息，例如 `fit`、`scale`、`x`、`y`。

## 素材命名规则

展示页仍大量依赖命名约定：

- 角色主图：`<角色名>.<扩展名>`
- 抽卡背景：`best_<角色名>.<扩展名>`
- MVP 左侧背景：`<角色名>1.<扩展名>`
- 抽卡门板：`gacha_door_left.<扩展名>`、`gacha_door_right.<扩展名>`
- 羁绊/标签图标：`faction_<标签>.<扩展名>`
- 星级图：`Star1.png` 到 `Star5.png`
- 装备图：`1.png`、`14.png`、`29.png` 这类编号图片

素材文件现在放在 `public/assets/images/`。上传接口返回的新 URL 也使用 `/assets/images/...`。

## 后续重构方向

后续新增雷达图特效时，优先把逻辑从 `public/index.html` 中逐步拆到：

- `src/radar/`：雷达几何、分数映射、canvas 绘制、形变状态
- `src/effects/`：背景特效、音频联动、扫描线、粒子、覆盖层
- `src/shared/`：数据归一化、素材 URL、配置默认值、校验
- `src/admin/`：管理页状态、表单、图片编辑器、CSV 工具

判断拆分是否成功的标准：新增一个雷达特效时，主要改 `src/effects/` 和少量 `src/radar/` 配置，不再大面积修改展示页主入口。
