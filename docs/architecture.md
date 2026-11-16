# Rock Radar 架构

适用分支：`react-s2`。更新日期：2026-11-16。原样迁移基线为 `hktv-new-version @ ba1d92b`。

## 当前结构

项目使用 React + TypeScript + Vite 组织页面，继续使用原 JavaScript 演出内核和 Express 文件 API。默认展示已经接入 S2 动态背景；原单 HTML 保留为对照，仍参与构建时的公共脚本与样式链接提取。

| 路径 | 当前职责 |
| --- | --- |
| `app/index.html`、`app/radar.html` | 管理、展示两份 Vite 入口 |
| `src/app/main.tsx` | 按路由加载页面，将 React 挂载到 `body`，保留原 DOM 层级 |
| `src/app/server.ts` | 开发／生产服务入口、原 HTML 对照路由 |
| `src/admin/AdminPage.tsx`、`components/` | 六个管理页签、弹窗和页面生命周期 |
| `src/admin/controller.js` | 原编辑、排序、对比、专场、素材与保存逻辑 |
| `src/radar/RadarPage.tsx`、`components/` | 舞台、媒体、抽卡、品牌、雷达与时间轴结构 |
| `src/radar/engine.js` | 配置加载、时间轴、Canvas、角色切换、音频、抽卡和片尾 |
| `src/radar/defaults.js` | 每次挂载使用的新默认配置副本 |
| `src/radar/themes/` | S2 背景渲染器、工具条及限定作用域的样式 |
| `src/shared/runtimeScope.js` | 卸载时回收事件、帧请求、计时器、请求与媒体资源 |
| `src/admin/styles.css`、`src/radar/styles.css` | 从原 HTML 逐字拆出的基础样式 |
| `public/js/`、`public/css/` | 原背景、专场、角色对比、角色位置与音乐共享模块 |
| `server.js` | 导出 `createLegacyApp()`，复用原 API；直接执行时启动旧 HTML 服务 |
| `index.html`、`admin.html` | 原版基线，不是默认页面的日常修改入口 |
| `data.json` | 角色、评分、配置和图片取景的持久化数据 |

React 当前主要管理结构与生命周期。动态表单和演出状态仍由控制器维护，尚未全部迁成 React 状态。静态按钮通过动作引用调用控制器；原动态表单使用受生命周期管理的 `window.__rockRadarAdmin` 桥接。

## 启动和路由

从项目根目录运行，要求 Node.js ≥ 22.12.0。

| 命令 | 行为 |
| --- | --- |
| `npm start` / `npm run dev` | 启动 React 开发服务，默认 `127.0.0.1:3003`，含热更新 |
| `npm run build` | 类型检查并构建到 `dist/app/` |
| `npm run start:next` | 启动 React 生产服务，先运行构建 |
| `npm run start:legacy` | 启动旧单 HTML 服务，默认也占用 3003 |

新旧服务不能同时占用相同端口。`PORT` 可覆盖端口，开发热更新端口为 `PORT + 1`。`RADAR_DATA_FILE` 和 `RADAR_IMAGE_DIR` 可分别覆盖 React 服务的数据文件与图片目录。

| React 服务地址 | 内容 |
| --- | --- |
| `/` | 管理页 |
| `/radar`、`/radar.html` | 默认 S2 背景的雷达展示 |
| `/radar?theme=s2` | 与默认 S2 模式一致，兼容之前的预览链接 |
| `/radar?theme=original` | React 页面使用原版背景 |
| `/legacy/admin`、`/legacy/radar` | 未修改的原单 HTML 对照 |

`vite.config.mts` 在首屏解析前注入拆出的基础 CSS，并从原 HTML 提取公共 CSS、脚本链接，保持加载顺序。不要删除原 HTML；后续模块化替换需同时调整此构建依赖和对照测试。

## 数据与素材流

1. 管理页从 `GET /api/data` 读取数据，修改暂存在浏览器。
2. 保存时通过 `PUT /api/data` 写回完整数据。
3. 展示页刷新后重新加载数据并计算时间轴；没有自动同步管理页的未保存修改。
4. 图片通过原上传、枚举、重命名和删除 API 管理，默认目录为 `public/assets/images/`。
5. 取景保存在 `IMAGE_META`；重命名／删除由 API 同步维护相关元数据。

角色使用 `namelist`；MVP、专家、专场分别使用 `mvplist`、`expertlist`、`SPECIAL_PROFILES`。当前没有数据库、账号体系或新的 S2 数据格式。图片命名约定见根目录 [README](../README.md#素材命名规则)。

## 展示与背景

主体设计尺寸为 `1920 × 1080`，窗口适配倍率与 `PRESENTATION_SCALE` 独立。雷达维持 `1600 × 1600` 逻辑坐标，分辨率另按实际尺寸和设备像素比计算。维度和量程由配置决定，保留平均值参考层、超量程绘制、Best、二段形态和原切换逻辑。

`engine.js` 的主 `tick()` 调度背景和雷达。`drawBackgroundEffect()` 优先调用传入的 S2 渲染器；没有传入时才进入原背景管理器。S2 不创建自己的 RAF，静态层缓存，动态画面最多每秒重绘 30 次。页面隐藏、片尾、卸载沿用引擎的相应处理。

S2 当前按手动选择的普通／高光场景显示，不会自动根据 MVP 或抽卡切换。它也不读取原背景参数或音频能量。专场的角色样式与转场仍运行，但其粒子／流体背景配置在 S2 模式下不驱动背景。详见 [S2 背景](s2-background-preview.md) 和 [背景系统](background-effects.md)。

## 维护入口与边界

- 角色切换：`src/radar/engine.js` 的 `updateUI()`、`performTransition()`。
- 雷达与音频绘制：同文件的 `drawRadar()`、`drawRadarAudioFx()`。
- 抽卡与片尾：同文件的 `playGachaAnimation()`、`startOutroSequence()`。
- 管理数据规范化与保存：`src/admin/controller.js`。
- S2 外观、构图与循环：`src/radar/themes/s2-background.js`；不应改原版基础 CSS 来调整 S2。

当前的主要维护边界是体量仍较大的 `engine.js` 和 `controller.js`、素材命名依赖，以及尚未完整类型化的数据模型。后续可按时间轴、素材、音频、抽卡逐步拆分；Remotion、直接导出视频和新的项目数据模型均未接入当前默认流程。

## 验证

`npm run check` 覆盖类型检查、五组原有测试、API／源码一致性测试和构建；`npm run test:replica` 覆盖浏览器对照与 S2 交互。原版对照使用 `?theme=original`。

截至首次 `react-s2` 提交 `00e4f85`，构建与 S2 交互通过，1080p 抽卡截图仍有待定位的像素差异。测试截图使用固定数据、测试素材和时钟，不能替代真实音视频整片验收。完整记录见 [迁移与验证记录](react-migration.md)。
