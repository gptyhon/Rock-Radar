# 角色专场配置

## 目标

角色专场用于集中管理少数角色独立的主题、场景、转场、抽卡风格和素材覆盖，避免继续在 `index.html` 中按角色名称追加分支。

当前实现采用“独立专场 + 角色引用”模型：

- `data.json.SPECIAL_PROFILES` 保存专场。
- 角色通过 `specialProfileId` 引用一个专场。
- 一个专场可以被多个角色复用。
- 专场被停用、删除或配置损坏时，角色自动回退普通展示。
- 二段形态继承基础角色的 `specialProfileId`。

## 管理界面

管理面板的“专场管理”页面使用折叠卡片：

- 摘要展示名称、简介、插件、状态、主题色和绑定角色。
- 详情可编辑角色绑定、主题色、背景效果、名称动画、角色图转场、雷达转场、抽卡风格、时间和素材。
- 支持新建、复制、删除、启停和搜索。
- “打开展示页预览”通过 `sessionStorage` 传递当前未保存配置，打开单角色预览，不会写入 `data.json`。

## 数据结构

```json
{
  "SPECIAL_PROFILES": [
    {
      "version": 1,
      "id": "silverwolf-lv999",
      "name": "银狼 LV.999 专场",
      "description": "紫蓝故障科技主题、专属角色区样式与抽卡风格。",
      "enabled": true,
      "pluginId": "silverwolf",
      "theme": {
        "color": "#7f8fff",
        "bg1": "#130c34",
        "bg2": "#060816",
        "accent": "#59e4ff"
      },
      "effects": {
        "backgroundEffect": "inherit",
        "nameAnimation": "glitch",
        "photoTransition": "glitch",
        "radarTransition": "center-reveal",
        "intensity": 1
      },
      "transitions": {
        "nameDuration": 1200,
        "photoDuration": 820,
        "radarDuration": 1500,
        "gachaDuration": 3000
      },
      "gacha": {
        "style": "silverwolf",
        "accent": "#7d83ff"
      },
      "assets": {
        "overlayImage": "",
        "overlayOpacity": 0.18,
        "gachaBackgroundName": ""
      }
    }
  ],
  "namelist": [
    {
      "name": "银狼LV.999",
      "specialProfileId": "silverwolf-lv999"
    }
  ]
}
```

## 插件注册

`public/js/special-profiles.js` 是管理页和展示页共享的配置边界，负责：

- 插件清单和字段选项。
- 默认值、数据规范化和范围限制。
- 新建、复制、ID 去重和禁用回退。

当前插件：

- `custom-theme`：通用结构化主题。
- `silverwolf`：银狼故障科技主题。

新增专属插件时，应先在共享模块注册插件及默认值，再在 `index.html` 中增加对应的语义 CSS 类或运行时钩子。管理页会自动显示新的插件类型，不需要再为角色名称增加判断。

## 组合优先级

1. 有效专场控制主题、背景模式、角色区域、转场和抽卡风格。
2. MVP 继续叠加 MVP 背景和标识，但不覆盖专场主题色。
3. 专家图标继续按 `expertlist` 显示。
4. 未绑定或失效专场使用原有普通/MVP 展示。

## 非目标

- 不执行管理页填写的 JavaScript。
- 不支持任意 HTML/CSS 节点编辑器。
- 第一版不支持一个角色叠加多个专场。
- 不引入数据库或服务端插件系统。

## 回滚

删除角色的 `specialProfileId` 即可让单个角色回退普通展示。删除 `SPECIAL_PROFILES` 前应先清除引用；管理页删除操作会自动完成这一处理。
