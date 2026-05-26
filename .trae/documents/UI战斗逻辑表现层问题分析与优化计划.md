# 万修列阵 — UI / 战斗逻辑 / 战斗表现层问题分析与优化计划

## 一、项目概览

- 技术栈：TypeScript + Vite，纯 Web 端 Roguelike
- 核心循环：开局选人 → 备战合成 → Canvas 自动战斗 → 战后结算 → 招募强化
- 源码层级：`src/data/`（数据）、`src/engine/`（引擎）、`src/state/`（状态）、`src/ui/`（视图）、`src/types/`（类型）

---

## 二、发现的问题分类

共发现 **18 个问题**，按严重程度分为 P0（致命）、P1（重要）、P2（改善）：

---

### P0 级 — 致命 Bug / 逻辑错误

#### P0-1 ⚠️ 法宝 28（不死不休）攻击力无限叠加 Bug
- **文件**：[battle.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/engine/battle.ts#L306-L319)
- **问题**：`checkArtPerFrame()` 中法宝 28 的逻辑每帧给所有友方加攻击力，但 `_28stacks` 从未递增（始终为 0），导致 `Math.round(0 * am * 0.5) = 0`，该法宝完全无效。如果修复了递增，又会导致每帧无限叠攻。
- **修复方向**：改为按时间叠加（每 N 秒叠 1 层），或改为一次性加成。

#### P0-2 ⚠️ 近战攻击后追击移动使用硬编码 0.016 而非 dt
- **文件**：[battle.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/engine/battle.ts#L238-L242)
- **问题**：`performAttack()` 中近战单位追击目标时：`u.bx += (dx/d) * u.moveSpeed * 0.016 * 0.5`，使用硬编码 0.016（假设 ~60fps）而非 `dt`。当倍速 ≠ 1 时，追击移动速度不会相应调整，导致高倍速下追击滞后。
- **修复方向**：传入 `dt` 参数，改为 `u.moveSpeed * dt * 0.5`。

#### P0-3 ⚠️ 备战界面回合类型判断逻辑重复
- **文件**：[PrepareView.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/ui/views/PrepareView.ts#L29-L40) vs [enemies.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/data/enemies.ts#L43-L55)
- **问题**：`PrepareView.ts` 中硬编码了一份 `getRoundTypeByIndex()` 函数，与 `enemies.ts` 中的 `getRoundType()` 逻辑完全一致。若回合类型规则修改（比如增减商店/Boss 回合），会只改一处导致 UI 进度条与实际战斗不匹配。
- **修复方向**：删除 PrepareView 中的重复函数，统一使用 `enemies.ts` 导出的 `getRoundType()`。

#### P0-4 ⚠️ 营帐装饰元素每帧重复创建（性能浪费）
- **文件**：[CampZone.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/ui/components/CampZone.ts#L113-L133)
- **问题**：`renderCamp()` 每帧删除全部 `.camp-unit`、`.camp-decor`、`.camp-detail` DOM 元素后重建。其中装饰元素使用 `zone.querySelector('.camp-decor-inner')` 判断是否已存在，但 `camp-decor-inner` 这个 CSS 类从未被添加，导致装饰元素每次都被删除再创建（每帧 3 个 DOM 操作 × 60fps = 高开销）。
- **修复方向**：为装饰元素添加 `camp-decor-inner` 类标识，或将其移出每帧重绘逻辑，只在初始化时创建一次。

---

### P1 级 — 影响游戏体验的重要问题

#### P1-5 🎮 Boss 视觉区分未生效
- **文件**：[battle.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/engine/battle.ts#L68-L71)（设置 `bossSize`/`bossHpW`）vs [battle.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/engine/battle.ts#L405-L445)（`drawUnit` 渲染）
- **问题**：`init()` 中为 Boss 设置了 `bossSize: 60` 和 `bossHpW: 60`，但在 `drawUnit()` 渲染中从未使用这两个属性，Boss 和普通敌人视觉完全一样。
- **修复方向**：在 `drawUnit()` 中，当 `u.ct === EnemyClass.BOSS` 时，使用更大的圆形半径、更粗的边框、特殊颜色（如金色光环），并利用 `bossHpW` 显示更宽的血条。

#### P1-6 🎮 远程单位无攻击范围可视化
- **文件**：[battle.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/engine/battle.ts#L405-L445)
- **问题**：远程单位（`range > 0`）开战后没有任何范围指示器，玩家无法直观判断他们的攻击距离。
- **修复方向**：为被选中/鼠标悬停的远程单位绘制半透明圆形范围指示环。

#### P1-7 🎮 战斗无攻击线 / 攻击动画
- **文件**：[battle.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/engine/battle.ts)（整体渲染）
- **问题**：攻击发生时只有跳字（伤害数字），没有从攻击者到目标的弹道/光束/连线，缺乏打击感。
- **修复方向**：当 `performAttack()` 时，生成短暂的攻击线 FX（如 `atkLine` 特效），在 render 中绘制。

#### P1-8 🖥️ 多处 showToast 重复实现，缺少统一管理
- **文件**：[GameState.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/state/GameState.ts#L112-L118)、[BattleView.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/ui/views/BattleView.ts#L66-L75)、[SettleView.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/ui/views/SettleView.ts#L111-L117)
- **问题**：`showToast` / `showToastBox` 在 3 个文件中各自实现，逻辑略有不同（BattleView 的 toast duration 是 3000ms，SettleView 是 2500ms，GameState 可自定义），维护成本高。
- **修复方向**：统一由 `GameState.ts` 的 `showToast` 提供，其他文件通过导入复用。

#### P1-9 🖥️ 备战卡片点击无法选中单位参与合成
- **文件**：[PrepareView.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/ui/views/PrepareView.ts#L14)（`selSynth` 声明）
- **问题**：`selSynth` 数组已声明，卡片渲染也展示了选中样式（红色边框阴影），但卡片没有绑定 click 事件来切换选中状态，用户无法手动选择单位合成，只能使用自动提示的合成按钮。
- **修复方向**：给卡片添加 click 事件，点击后将单位加入/移出 `selSynth`，检测是否有可合成组并显示合成按钮。

#### P1-10 🖥️ 结算界面获取法宝后没有显示实际装备效果
- **文件**：[SettleView.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/ui/views/SettleView.ts#L50-L59)、[artifact.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/engine/artifact.ts)
- **问题**：法宝展示只显示名称和描述文案，没有显示实际数值加成（如 `+20攻击 +10防御`）。
- **修复方向**：在法宝 HTML 中增加 `effects` 的数值展示行。

#### P1-11 🔧 战斗引擎大量使用 `any` 类型，无类型安全
- **文件**：[battle.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/engine/battle.ts)（全局：`pu: any[]`、`eu: any[]`、函数参数均 `any`）
- **问题**：`BE.pu` / `BE.eu` / 所有函数参数都使用 `any`，而项目已有完备的 `PlayerUnit` / `EnemyUnit` 接口定义。使用 `any` 导致 IDE 无自动补全、重构困难、容易产生属性拼写错误。
- **修复方向**：将所有 `any` 替换为对应的接口类型，为战斗专用扩展属性创建 `BattlePlayerUnit` / `BattleEnemyUnit` 扩展接口。

---

### P2 级 — 体验改善

#### P2-12 🎮 单位阵亡缺乏动画过渡
- **文件**：[battle.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/engine/battle.ts#L406-L410)
- **问题**：单位阵亡后直接变灰色方块，无缩放、淡出、破碎等过渡效果。
- **修复方向**：阵亡时生成 `deathFX`，在 render 中绘制渐隐/缩小动画，持续 0.5-1 秒后移除。

#### P2-13 🎮 战斗画布不支持窗口缩放
- **文件**：[battle.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/engine/battle.ts#L377-L381)、[constants.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/data/constants.ts#L20-L21)
- **问题**：Canvas 尺寸硬编码 1200×600，小屏幕或窗口窄时会出现滚动条或裁切。
- **修复方向**：动态读取容器尺寸，按比例缩放 Canvas 并调整单位坐标。

#### P2-14 🖥️ 开局选人界面未提示初始单位仅有 80% 属性
- **文件**：[StartView.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/ui/views/StartView.ts#L31-L34)
- **问题**：开局单位属性被乘以 0.8 来弱化，但卡面上直接显示了削弱后的数值，没有任何提示告知玩家"这些弟子尚未完全觉醒"，玩家可能误以为所有单位基础属性就这么低。
- **修复方向**：在卡面上添加提示文字或视觉标记。

#### P2-15 🖥️ 备战界面无"返回主菜单"按钮
- **问题**：进入备战界面后，如果想重新开始，只能刷新页面。缺少返回主菜单的按钮。
- **修复方向**：在备战左侧顶部添加"放弃修行"小按钮。

#### P2-16 🖥️ 单位卡片未显示已装备法宝
- **文件**：[PrepareView.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/ui/views/PrepareView.ts#L61-L73)
- **问题**：单位卡片只显示了 HP/攻击/防御，已装备的法宝没有任何指示。
- **修复方向**：在卡片中为已装备法宝添加小图标或文字。

#### P2-17 🔧 伤害计算中敌方 HP 无下限保护
- **文件**：[combat.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/engine/combat.ts#L17-L20)
- **问题**：`def.hp -= actualDmg` 后仅检查 `def.hp <= 0`，但如果攻击力极高导致 `actualDmg > def.hp`，HP 会变为负数。虽然不影响逻辑（alive 被设为 false），但后续 UI 如血条宽度计算可能产生负数百分比。
- **修复方向**：添加 `def.hp = Math.max(0, def.hp - actualDmg)`。

#### P2-18 🔧 EventBus 事件监听未在视图切换时清理
- **文件**：[BattleView.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/ui/views/BattleView.ts#L24-L30) 使用 `EventBus.once`
- **问题**：虽然 `BATTLE_END` 使用了 `once` 不会重复注册，但 `EventBus` 的 `on` 注册没有对应的 `off` 机制。多次战斗可能在其他事件上产生残留监听。
- **当前状态**：BATTLE_END 用了 `once` —— 无问题。其他事件（如 TOAST）是全局监听 —— 无问题。此问题影响较小，暂作为 P2 记录。

---

## 三、优化执行方案

### 执行顺序（按风险与依赖排序）

| 顺序 | 编号 | 修复项 | 影响文件 | 风险 |
|------|------|--------|----------|------|
| 1 | P1-11 | 类型安全改造 | `battle.ts`、`types/index.ts` | 低（纯类型） |
| 2 | P0-2 | 近战追击 dt 修复 | `battle.ts` | 低 |
| 3 | P0-4 | 营帐装饰性能修复 | `CampZone.ts` | 低 |
| 4 | P0-3 | 回合类型逻辑统一 | `PrepareView.ts` | 中（需确保导入正确） |
| 5 | P0-1 | 法宝 28 逻辑修正 | `battle.ts` | 中（需重新设计叠加逻辑） |
| 6 | P1-5 | Boss 视觉区分 | `battle.ts` | 低 |
| 7 | P1-6 | 远程攻击范围显示 | `battle.ts` | 低 |
| 8 | P1-7 | 攻击线动画 | `battle.ts` | 低 |
| 9 | P1-8 | 统一 showToast | `GameState.ts`、`BattleView.ts`、`SettleView.ts` | 低 |
| 10 | P1-9 | 单位选中合成 | `PrepareView.ts` | 中 |
| 11 | P1-10 | 法宝效果显示 | `SettleView.ts`、`PrepareView.ts` | 低 |
| 12 | P2-17 | HP 下限保护 | `combat.ts` | 极低 |
| 13 | P2-12 | 阵亡动画 | `battle.ts` | 低 |
| 14 | P2-13 | Canvas 响应式 | `battle.ts`、`constants.ts` | 中 |
| 15 | P2-14~P2-16 | UI 细节改善 | 多个文件 | 低 |

---

### 详细修复方案

#### 步骤 1：类型安全改造（P1-11）

**文件**：[battle.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/engine/battle.ts)
**改动**：
- 在 `types/index.ts` 中新增 `BattlePlayerUnit` 和 `BattleEnemyUnit` 接口，继承 `PlayerUnit` / `EnemyUnit`，加入战斗运行时属性（`bx, by, acd, tgt, dd, dt, kills, vx, vy, walkAngle, idleTimer, idleDx, idleDy, _deathT` 等）
- 将 `BE` 对象的 `pu: any[]` 改为 `pu: BattlePlayerUnit[]`，`eu: any[]` 改为 `eu: BattleEnemyUnit[]`
- 所有函数的 `any` 参数和返回值替换为正确类型

#### 步骤 2：近战追击 dt 修复（P0-2）

**文件**：[battle.ts:L234-L243](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/engine/battle.ts#L234-L243)
**改动**：
- `performAttack` 方法签名增加 `dt: number` 参数
- 将 `u.moveSpeed * 0.016 * 0.5` 改为 `u.moveSpeed * dt * 0.5`
- 调用处 `this.performAttack(u, tgt, isP, allies, enemies)` 改为 `this.performAttack(u, tgt, isP, allies, enemies, dt)`

#### 步骤 3：营帐装饰性能修复（P0-4）

**文件**：[CampZone.ts:L113-L133](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/ui/components/CampZone.ts#L113-L133)
**改动**：
- 装饰 DOM 元素在 `initCamp()` 中创建一次，添加 `camp-decor-inner` 类标识
- `renderCamp()` 中只删除/更新 `.camp-unit` 和 `.camp-detail`，不再删除装饰元素
- 或者改为只在 `updateCampLoop()` 中通过 CSS transform 更新位置，完全不重建 DOM

#### 步骤 4：回合类型逻辑统一（P0-3）

**文件**：[PrepareView.ts:L29-L40](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/ui/views/PrepareView.ts#L29-L40)
**改动**：
- 删除 `PrepareView` 中的 `getRoundTypeByIndex()` 函数
- 循环中使用 `getRoundType(GS.round)` 来计算当前回合类型
- 进度条各点的类型需要调整 `getRoundType` 使其支持指定索引参数，或者导出 `getRoundTypeByIndex` 到 `enemies.ts`

#### 步骤 5：法宝 28 逻辑修正（P0-1）

**文件**：[battle.ts:L306-L319](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/engine/battle.ts#L306-L319)
**改动**：
- 改为按游戏时间累加层数（例如每 3 秒 +1 层）
- 每层给全体友方增加固定的攻击力加成
- `_28stacks` 在战斗中随时间增加，当有友方阵亡时重置为 0
- 不再每帧叠加攻击力，而是基于当前层数计算（已有叠加时不重复加）

#### 步骤 6-7：Boss 视觉 + 攻击范围显示（P1-5、P1-6）

**文件**：[battle.ts:L405-L445](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/engine/battle.ts#L405-L445)
**改动**：
- Boss 单位使用 `u.bossSize || 16` 作为圆形半径绘制大一圈
- Boss 单位边框颜色使用金色 `#fbbf24`、线宽 4px、附加光晕效果
- Boss 血条使用 `u.bossHpW || 24` 宽度
- 远程单位在 hover/select 状态下，绘制半透明圆形范围指示（以 `u.range` 为半径）

#### 步骤 8：攻击线动画（P1-7）

**文件**：[battle.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/src/engine/battle.ts)
**改动**：
- 在 `performAttack` 中生成攻击线 FX：`{ tp: 'line', x1: u.bx, y1: u.by, x2: tgt.bx, y2: tgt.by, life: 0.15, ml: 0.15, c: r.crit ? '#f97316' : '#fff' }`
- 在 `render()` 中 FX 循环里绘制攻击线（从 x1,y1 到 x2,y2，使用半透明渐变线条）

#### 步骤 9-15：UI 改善逐步执行

---

## 四、验证方式

1. **类型检查**：运行 `npx tsc --noEmit` 确认无类型错误
2. **构建检查**：运行 `npm run build` 确保构建成功
3. **功能验证**：
   - 启动游戏，完成完整一回合战斗，确认 Boss 视觉差异可见
   - 高倍速下观察近战追击是否流畅
   - 查看营帐动画 CPU 占用是否下降
   - 装备法宝 28，确认攻击力正常叠加
   - 手动点击卡片选中单位，确认合成功能正常
4. **边界测试**：
   - 极小窗口下 Canvas 不溢出
   - 单位 HP 被大额伤害击中后不会出现负数
