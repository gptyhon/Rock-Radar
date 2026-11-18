# react-s2 文档导航

当前分支将原单 HTML 迁移为 React 工程，并默认启用 S2 动态背景。日常启动使用 `npm start`，访问 `http://localhost:3003/`；展示地址为 `/radar`，原版画面对比为 `/radar?theme=original`。

| 文档 | 内容 |
| --- | --- |
| [项目说明](../README.md) | 安装、启动、功能、数据字段与素材命名 |
| [架构](architecture.md) | 当前目录职责、路由、数据流、开发入口与边界 |
| [S2 背景](s2-background-preview.md) | 视觉构图、循环动效、工具条和当前限制 |
| [背景特效系统](background-effects.md) | S2 与原粒子／流体背景的分工、配置与生命周期 |
| [角色专场](special-profiles.md) | 专场数据、预览、覆盖规则和扩展位置 |
| [角色对比](role-comparison.md) | 双角色编辑、最高分统计和保存规则 |
| [角色位置](role-position.md) | 拖动排序、Best 标记与保存规则 |
| [迁移与验证记录](react-migration.md) | 原样迁移依据、兼容方案和未完成的验证项 |

原 `index.html`、`admin.html` 是保留的基线与构建输入，日常页面修改应进入 `src/`。当前的逐帧 MP4 导出见 [使用说明](../README.md#导出视频)。
