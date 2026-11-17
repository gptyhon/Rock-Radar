# S2 角色及羁绊导入

2026-11-17 从本地 `hsr/dist/catalog.js` 导入入画奇航资料。根目录 `data.json` 的 `namelist` 是管理页和雷达展示页共同使用的 60 人名单；`S2_CATALOG` 保存来源、许可及 34 个羁绊的分类、图标和去重后的成员 ID。

- 丹恒·饮月（前台）和丹恒·腾荒（后台）合并为「丹恒」，ID 为 `danheng`，只占一个排序及播放条目。沿用饮月的评分和主图；`s2.forms` 保留两个形态的定位、羁绊、费用、来源和原有评分／演出设置。不自动启用中途形态，以免再次增加播放条目。
- 各角色的 `desc` 替换为 S2 羁绊，`s2` 保存结构化基础资料。姓名中的 `•` 统一为本项目使用的 `·`；三月七、开拓者分别对应源目录的巡猎、欢愉形态。
- 匹配到的 49 名角色沿用本项目已有评分及演出配置，保留相对顺序；新角色追加在后。原目录没有 S2 实测评分，不把历史评分标成 S2 实测。
- 其余 11 名角色的 `points` 为空数组，`s2.scoreSource` 为 `pending`。管理页显示提示；现有编辑器及雷达兼容逻辑会用量程下限初始化空评分，使用前应补全评分。提示描述的是导入时状态。
- 新角色主图和 33 个现有源羁绊图标导入 `public/assets/images/`，使用原项目的命名规则。星狩誓言在源目录没有图标，保留空值。帕姆王没有源立绘，使用源头像；开拓者沿用当前项目已有立绘。
- MVP 名单只保留仍在 S2 名单内的角色；专家身份按 S2 源数据更新。全局配置、专场、现有同名角色主图和取景设置保留。

重新导入：

```powershell
node scripts/import-hsr-s2.mjs C:\D\github\hsr
```

脚本先校验 60 人／34 羁绊及图片存在，再写入。每次写入前将完整旧 `data.json` 和被覆盖的图片保存至 `workspace/hsr-s2-import/<时间>/`。恢复时复制该目录的 `data.json` 至项目根目录，图片备份复制回 `public/assets/images/`。原 `hsr` 项目不会被修改。

基础资料来自 [BWIKI 角色一览](https://wiki.biligame.com/sr/角色一览（货币）)和[羁绊一览](https://wiki.biligame.com/sr/羁绊一览)，贡献者包括薄荼bo、AAA百科词条批发病友、Energy_Ark 等，按 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 署名并沿用同一许可。立绘来自 [StarRailRes](https://github.com/Mar-7th/StarRailRes)，头像及羁绊图标来自 BWIKI 引用的游戏素材，美术及商标归原权利方所有。
