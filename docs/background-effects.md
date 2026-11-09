# 背景特效系统

## 目标

背景特效使用一个共享注册模块连接展示页和管理页：

- `public/js/background-effects.js`：模式定义、字段定义、配置规范化和统一生命周期
- `public/js/living-field-effect.js`：WebGL 流体折射场、音频包络与自适应分辨率
- `public/css/background-effects.css`：独立基础渐变背景和背景图层规则
- `index.html`：提供当前主题色、音频能量、性能档位和唯一动画时钟
- `admin.html`：根据共享字段定义生成全局与专场配置界面

展示页仍然只运行一个 `requestAnimationFrame`。背景特效不能创建自己的动画循环。

## 图层

背景被拆成两部分：

1. 基础背景：CSS 渐变和低透明度网格，始终保留。
2. 2D Canvas 特效：粒子流。
3. WebGL 特效：深空流体折射场；不可用时由 CSS 流动光场降级。

因此 `off` 只关闭注册的 Canvas 背景模式，不会把页面变成透明背景。

## 配置

全局模式继续使用兼容字段 `BG_EFFECT_MODE`，详细参数位于
`BG_EFFECT_CONFIG`：

```json
{
  "BG_EFFECT_MODE": "living-field",
  "BG_EFFECT_CONFIG": {
    "version": 2,
    "common": {
      "opacity": 2,
      "size": 2,
      "speed": 1,
      "density": 1,
      "audioResponse": 1
    },
    "particles": {
      "direction": "mixed",
      "drift": 1,
      "glow": 1
    },
    "livingField": {
      "flowScale": 1,
      "distortion": 1,
      "filament": 0.9,
      "chromatic": 0.35,
      "grain": 0.06,
      "beatImpact": 0.85,
      "idleMotion": 0.55,
      "safeMask": 0.78
    }
  }
}
```

旧数据中的 `PARTICLE_OPACITY_MULT` 和 `PARTICLE_SIZE_MULT` 会在
`BG_EFFECT_CONFIG` 不存在时作为回退值读取。管理页保存时也会同步这两个字段。
旧模式 `starfield` 和 `ripple` 会迁移为 `living-field`；旧模式的专属参数会被丢弃。

## 专场覆盖

角色通过 `specialProfileId` 绑定专场。专场中的背景配置结构为：

```json
{
  "effects": {
    "backgroundEffect": "inherit",
    "backgroundConfig": {
      "common": {
        "speed": 1.4
      },
      "livingField": {
        "chromatic": 0.6
      }
    }
  }
}
```

- `backgroundEffect: "inherit"`：继承全局模式。
- `backgroundConfig`：只保存填写过的字段。
- 未出现的字段：继承全局参数。
- 专场覆盖值在运行时会经过与全局配置相同的范围校验。

## 生命周期

每种背景特效遵守相同生命周期：

- `resize(width, height)`：Canvas 尺寸变化时重建空间状态。
- `update(deltaSeconds, environment, config)`：更新模拟状态。
- `draw(context, environment, config)`：绘制当前帧。
- `dispose()`：切换模式、关闭特效或销毁运行时时释放状态。

运行时把异常帧间隔限制在 `0–50ms`。页面隐藏时沿用展示页已有的暂停逻辑，
不会继续绘制 Canvas。流体场在 4K 下使用 `0.42–0.72` 的内部渲染比例，
通过滚动帧时、迟滞阈值和冷却时间调节，避免分辨率来回跳变。

## 音频响应

展示页向流体场提供五段平滑数据：

- `energy`：整体能量和降级层亮度
- `bass`：空间形变与能量汇聚
- `mid`：流向和色温
- `treble`：细微能量丝线
- `beat`：带约 400ms 回落的折射增强

音乐停止时，流体场仍由 24、31、43 秒三组错周期保持小范围运动。

## 添加新模式

增加新背景模式时需要：

1. 在 `MODE_OPTIONS` 中添加模式。
2. 在 `MODE_DEFINITIONS` 中声明管理字段。
3. 2D 模式可注册到内置工厂；独立渲染器通过 `effectFactories` 注入。
4. 返回统一生命周期对象。
5. 为配置规范化和模式切换补充测试。

管理页的全局配置和专场配置会自动使用共享字段定义，不需要再各写一份表单。
