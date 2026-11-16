# S2 背景预览

执行 `npm start` 后访问 `http://localhost:3003/radar`，默认启用 S2 背景。管理页的展示按钮使用同一入口；此前分享的 `?theme=s2` 链接仍兼容。
按空格开始原有演出，顶部可切换普通／高光背景、轻微／增强动态、暂停背景，或打开原版对照。全屏时隐藏预览工具条。

本次仅接入已预览的 S2 背景与雷达底部的暗色遮罩。角色、评分、播放节奏、抽卡、专场和管理页保持原逻辑；没有将主题写入 `data.json`。使用 `?theme=original` 或工具条的“对比原版”查看原版画面，`/legacy/radar` 保留原单 HTML 对照。

`npm start` 与 `npm run dev` 均启动 React 开发服务，默认端口 3003。旧单 HTML 的启动命令为 `npm run start:legacy`，仅供原始版本对照。生产服务继续使用 `npm run build` 后执行 `npm run start:next`。

- `src/radar/themes/s2-background.js`：从背景样例提取的独立 Canvas 渲染器，静态层缓存，动态层最多每秒重绘 30 次，随原引擎统一帧循环更新。
- 背景构图按展示内容重新排列：主框位于右侧人物区，斜切色块靠边，青蓝光带位于底部；雷达数值区域减少装饰与粒子。背景随展示区按宽度等比缩放、垂直居中，高窗口边缘延展填充。
- `src/radar/themes/S2PreviewControls.tsx`：仅预览模式显示的控制条，控件键盘事件不会触发角色切换。
- `src/radar/themes/s2-preview.css`：只作用于 `s2-preview`，保留雷达几何与字体；替换原背景及遮罩颜色。
- 隐藏页面与片尾阶段沿用原引擎暂停绘制的机制；卸载时释放缓存。系统偏好减少动态时默认暂停背景。`P` 键暂时停止背景动态，保留底图。

参考来自备份目录的 `docs/s2-style-analysis.md` 与 `docs/references/s2-style-board.jpg`；这是依照截图重绘的背景，并非提取的游戏原始素材。

本地 `public/assets/images/` 尚无角色素材，因此真实预览的立绘区域可能为空；预览没有替换为虚构角色图。
