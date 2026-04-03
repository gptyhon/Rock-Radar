# Rock Radar

一个本地运行的雷达图展示项目，包含：

- 管理面板：维护选手、配色、图片、取景和全局配置
- 展示页：播放动态雷达图、人物图、MVP 底图和抽卡开门动画

当前版本已经不是单纯编辑 `index.html` 的静态页面，而是以 `server.js + data.json + admin.html` 为主工作流。

## 功能概览

- 可配置维度名称、维度数、各轴满分、最小值、动画时长、默认展示时长
- 雷达图支持平滑过渡、Best 高亮、超出基准值的延展显示
- 支持背景音乐、全局时间轴、全屏录屏展示
- 管理面板支持图片上传、改名、删除、取景裁切
- 支持特殊图片槽位：
  - 抽卡背景图
  - 左右开门图
  - MVP 底图
- `MVP` 条目可触发左侧专属底图和金色强化特效
- 抽卡出场为定制化动画，并支持门图取景

## 运行方式

先安装依赖：

```bash
npm install
```

启动服务：

```bash
npm start
```

启动后默认地址：

- 管理面板：`http://localhost:3003/`
- 展示页：`http://localhost:3003/radar`

## 推荐工作流

1. 打开管理面板
2. 在“选手管理”里编辑名称、分数、描述、时长、是否触发抽卡
3. 在“全局配置”里调整雷达图、动画、粒子、Best、MVP 等参数
4. 在“图片管理”里上传图片并设置取景
5. 点击顶部“保存全部”
6. 刷新展示页查看效果

如果你更习惯手改配置，也可以直接编辑 `data.json`。

## 数据文件说明

项目的主要数据保存在 `data.json` 中，核心字段包括：

- `CONFIG`：全局配置
- `COLOR_PRESETS`：配色池
- `mvplist`：MVP 名单
- `IMAGE_META`：图片取景与缩放信息
- `namelist`：选手列表

一个选手对象大致长这样：

```json
{
  "name": "白厄",
  "points": [9, 7.8, 9, 12, 4, 7],
  "desc": "xqcl",
  "colorIndex": 12,
  "duration": 6000,
  "gacha": true
}
```

字段说明：

- `name`：展示名称，同时也是图片命名基准
- `points`：雷达图各维度分数
- `desc`：右侧描述文字
- `colorIndex`：使用 `COLOR_PRESETS` 中的第几个配色
- `duration`：该条目停留时间，单位毫秒
- `gacha`：是否触发抽卡出场动画

## 图片命名规则

所有图片放在 `pic/` 目录下，支持 `jpg / jpeg / png / gif / webp / svg`。

### 1. 普通人物图

用于右侧人物图：

```text
<名字>.<扩展名>
```

示例：

```text
白厄.png
风堇.webp
```

### 2. 抽卡背景大图

用于抽卡开门后的背景图：

```text
best_<名字>.<扩展名>
```

示例：

```text
best_白厄.png
best_风堇.png
```

### 3. MVP 底图

用于左侧 MVP 专属底图：

```text
<名字>1.<扩展名>
```

示例：

```text
白厄1.png
```

同时还需要把该名字加入 `mvplist`，否则不会触发 MVP 底图。

### 4. 左右开门图

抽卡动画左右门板使用固定文件名：

```text
gacha_door_left.<扩展名>
gacha_door_right.<扩展名>
```

这两张图建议直接通过管理面板上传，不要手动乱改文件名。

### 5. 其他素材

- 背景音乐：根目录 `music.mp3`
- 抽卡 Logo：`pic/hsr_logo.webp`

## 取景说明

管理面板里的“取景”会把结果保存到 `data.json -> IMAGE_META`。

支持保存的内容包括：

- `fit`：`contain` 或 `cover`
- `scale`：缩放
- `x` / `y`：焦点位置

当前项目里，以下图片都支持独立取景：

- 普通人物图
- `best_名字.*` 抽卡背景图
- `名字1.*` MVP 底图
- `gacha_door_left.*` / `gacha_door_right.*` 左右门图

图片改名时会尽量保留对应的取景数据。

## MVP 机制

`mvplist` 是 MVP 名单，不是分数配置。

当某个选手名字出现在 `mvplist` 中时：

- 展示页会尝试加载 `名字1.*`
- 左侧会出现专属 MVP 底图
- 底图会附带固定金色背景强化特效
- 左上角会出现 `MVP` 标识

## 主要配置项

常用的 `CONFIG` 项包括：

- `RADAR_SCALE`
- `RADAR_GRID_LEVELS`
- `RADAR_GRID_LINE_WIDTH`
- `RADAR_GRID_LINE_OPACITY`
- `VERTEX_COUNT`
- `DIM_NAMES`
- `BASE_MAX_SCORES`
- `MIN_SCORES`
- `ANIM_DURATION`
- `DEFAULT_DURATION`
- `INTRO_WAIT_TIME`
- `IMAGE_SCALE`
- `PARTICLE_OPACITY_MULT`
- `PARTICLE_SIZE_MULT`
- `SHOW_DESC`
- `ENABLE_SPECIAL_FORMAT`
- `USE_AUTO_PRECISION`
- `SHOW_SCORE_UNDER_NAME`
- `BEST_COLOR`
- `BEST_FONT`
- `GACHA_ANIM_DURATION`
- `GACHA_FONT_STYLE`

这些配置都可以直接在管理面板里改，不需要手动进代码。

## 文件结构

```text
.
├─ admin.html          管理面板
├─ index.html          展示页
├─ server.js           Express 服务与图片接口
├─ data.json           配置与数据持久化
├─ pic/                所有图片素材
├─ music.mp3           背景音乐（可选）
├─ package.json
└─ LICENSE
```

## 说明

- 本项目默认端口为 `3003`
- 图片上传、改名、删除、门图上传都通过本地接口处理
- 如果改了配置但展示页没变化，先确认已经点过“保存全部”，再刷新 `/radar`
