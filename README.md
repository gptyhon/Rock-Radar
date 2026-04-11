# Rock Radar

一个本地运行的角色雷达图展示项目，包含：
- 管理面板：维护角色、分数、图片、取景与全局配置
- 展示页：播放雷达图动画、抽卡动画、MVP 背景与时间轴

## 运行方式

```bash
npm install
npm start
```

默认地址：
- 管理面板：`http://localhost:3003/`
- 展示页：`http://localhost:3003/radar`

## 项目结构

```text
.
├─ admin.html          管理面板
├─ index.html          展示页
├─ server.js           本地服务与图片接口
├─ data.json           配置与角色数据
├─ pic/                图片素材目录
├─ music.mp3           BGM（可选）
├─ package.json
└─ LICENSE
```

## 核心工作流

1. 打开管理面板编辑角色（名称、六维分数、描述、时长、是否触发抽卡等）。
2. 在全局配置中调整雷达参数、动画参数、音乐与特效参数。
3. 在图片管理中上传图片并设置取景（位置/缩放/cover/contain）。
4. 点击“保存全部”，然后刷新 `/radar` 预览。

## 数据说明（data.json）

主要字段：
- `CONFIG`：全局配置（雷达、动画、音乐、特效等）
- `namelist`：角色列表
- `mvplist`：MVP 名单
- `IMAGE_META`：图片取景信息
- `COLOR_PRESETS`：配色预设

单个角色示例：

```json
{
  "name": "示例角色",
  "points": [9, 8.5, 7, 10, 6, 8],
  "desc": "角色描述",
  "colorIndex": 3,
  "duration": 6000,
  "gacha": true
}
```

## 图片命名规则

- 角色主图：`<角色名>.<扩展名>`（如 `流萤.png`）
- 抽卡背景图：`best_<角色名>.<扩展名>`
- MVP 背景图：`<角色名>1.<扩展名>`
- 抽卡门图（固定槽位）：
  - `gacha_door_left.<扩展名>`
  - `gacha_door_right.<扩展名>`

支持格式：`jpg / jpeg / png / gif / webp / svg`

## 结尾视频（可选）

展示页结尾支持在根目录读取视频文件（例如 `ending.mp4`）。
可通过 `CONFIG.OUTRO_VIDEO` 配置候选文件名，`CONFIG.OUTRO_TRANSITION_MS` 控制转场时长。

## 说明

- 默认端口是 `3003`。
- 图片上传、重命名、删除通过 `server.js` 的本地 API 处理。
- 如果显示未更新，先确认已在管理面板保存，再刷新 `/radar`。
