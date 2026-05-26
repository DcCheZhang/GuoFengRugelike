# 万修列阵 HTML Demo 技术设计文档

> **版本**：v1.1  
> **基于**：spec.md v1.1 + 全套策划文档  
> **目标**：定义"万修列阵"HTML Demo的完整技术实现方案，将需求规格（WHAT）转化为架构与实现设计（HOW）  
> **v1.1变更说明**：取消合成系统、新增单位折叠显示、修复招募唯一选择、新增待机区域

---

# 1. 实现模型

## 1.1 上下文视图

### 1.1.1 系统上下文

本Demo为纯前端单页HTML应用，运行于浏览器环境中，无后端、无网络通信、无外部依赖。

```
┌─────────────────────────────────────────────────┐
│               浏览器运行环境                      │
│  ┌──────────────────────────────────────────┐    │
│  │       万修列阵 HTML Demo (SPA)           │    │
│  │                                          │    │
│  │  ┌──────────┐  ┌──────────┐  ┌────────┐ │    │
│  │  │ 渲染层   │  │ 逻辑层   │  │数据层  │ │    │
│  │  │(Canvas+  │  │(战斗/商店│  │(单位/法│ │    │
│  │  │ DOM+CSS) │  │ /待机等) │  │ 宝/关卡│ │    │
│  │  └──────────┘  └──────────┘  └────────┘ │    │
│  │         ↑            ↑            ↑      │    │
│  │         └────────────┴────────────┘      │    │
│  │              事件总线(EventBus)           │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  玩家 ←→ 键盘/鼠标/触摸输入                      │
└─────────────────────────────────────────────────┘
```

### 1.1.2 外部交互

| 外部实体 | 交互方式 | 说明 |
|----------|----------|------|
| 玩家 | 鼠标点击/拖拽/悬停 + 触摸 | 唯一的外部输入源 |
| 浏览器 | DOM渲染/Canvas绑定/事件监听 | 提供运行时环境 |
| localStorage | 可选存档扩展 | Demo不强制使用，预留接口 |

---

## 1.2 服务/组件总体架构

### 1.2.1 分层架构

```
┌─────────────────────────────────────────────────────┐
│                    表现层 (View)                      │
│  MainView │ PrepView │ BattleView │ ResultView │ ... │
│  (DOM+CSS+Canvas)                                   │
├─────────────────────────────────────────────────────┤
│                    控制层 (Controller)                │
│  GameCtrl │ BattleCtrl │ ShopCtrl │ IdleCtrl │ ...   │
├─────────────────────────────────────────────────────┤
│                    逻辑层 (Logic)                    │
│  BattleEngine │ IdleEngine │ DamageCalc │ AIEngine  │
├─────────────────────────────────────────────────────┤
│                    数据层 (Data)                     │
│  UnitDB │ ArtifactDB │ StageDB │ GameState │ EventBus│
└─────────────────────────────────────────────────────┘
```

### 1.2.2 核心模块划分

| 模块 | 职责 | 关键类/对象 |
|------|------|-------------|
| **数据模块 (data)** | 静态数据定义与查询 | `UNIT_DATA`, `ENEMY_DATA`, `ARTIFACT_DATA`, `STAGE_CONFIG` |
| **状态模块 (state)** | 游戏运行时状态管理 | `GameState`, `BattleState`, `PlayerState` |
| **事件模块 (event)** | 模块间解耦通信 | `EventBus` |
| **战斗模块 (battle)** | 自动战斗逻辑与渲染 | `BattleEngine`, `BattleRenderer`, `DamageCalculator`, `UnitAI` |
| **待机模块 (idle)** | 待机区域单位随机行走 | `IdleEngine`, `IdleRenderer` |
| **折叠显示模块 (fold)** | 同种单位折叠/展开逻辑 | `UnitFoldManager` |
| **商店模块 (shop)** | 商店买卖逻辑 | `ShopEngine` |
| **关卡模块 (stage)** | 回合推进与敌人生成 | `StageManager`, `EnemyGenerator` |
| **UI模块 (ui)** | 界面渲染与交互 | `ViewManager`, `PrepView`, `BattleView`, `ResultView`, `ShopView` |
| **法宝模块 (artifact)** | 法宝效果应用 | `ArtifactEffectEngine` |
| **复活模块 (revive)** | 死亡复活倒计时 | `ReviveManager` |
| **招募模块 (recruit)** | 战后3选1唯一招募 | `RecruitManager` |
| **工具模块 (util)** | 通用工具函数 | `RandomUtil`, `MathUtil`, `DomUtil` |

### 1.2.3 模块依赖关系

```
UI模块 ──→ 控制层 ──→ 逻辑层 ──→ 数据层
  │                      │          │
  └──── EventBus ←──────┘←─────────┘
```

- UI模块不直接调用逻辑层，通过控制层中转
- 逻辑层模块之间通过EventBus通信，避免直接依赖
- 数据层为纯静态数据，被逻辑层和UI层只读引用

---

## 1.3 实现设计文档

### 1.3.1 文件组织方案

采用**单HTML文件**结构，内嵌CSS和JavaScript，满足"直接打开即可运行"的要求：

```
wanxiu-liezhen-demo.html
├── <!DOCTYPE html>
├── <head>
│   ├── <style>          // 全部CSS（含国风主题变量、布局、动画）
│   └── <meta>           // 字符编码、视口设置
├── <body>
│   ├── <div id="app">   // 所有UI视图容器（主界面/备战/战斗/结算/商店）
│   └── <script>         // 全部JavaScript逻辑
│       ├── // === 数据层 ===
│       ├── data/unit-data.js        // 27种我方单位属性数据
│       ├── data/enemy-data.js       // 35种敌方单位属性数据
│       ├── data/artifact-data.js    // 213个法宝数据
│       ├── data/stage-config.js     // 关卡回合配置
│       ├── data/text-data.js        // 文案信息（台词/提示）
│       ├── // === 核心层 ===
│       ├── core/event-bus.js        // 事件总线
│       ├── core/game-state.js       // 游戏状态管理
│       ├── core/math-util.js        // 数值计算工具
│       ├── core/random-util.js      // 随机数工具
│       ├── // === 逻辑层 ===
│       ├── logic/damage-calc.js     // 伤害计算引擎
│       ├── logic/battle-engine.js   // 战斗引擎
│       ├── logic/unit-ai.js         // 单位AI
│       ├── logic/idle-engine.js     // 待机区域引擎（随机行走+避让）
│       ├── logic/unit-fold-manager.js // 单位折叠显示管理
│       ├── logic/recruit-manager.js // 招募选择管理（3选1唯一选择）
│       ├── logic/shop-engine.js     // 商店引擎
│       ├── logic/enemy-generator.js // 敌人生成器
│       ├── logic/artifact-effect.js // 法宝效果引擎
│       ├── logic/revive-manager.js  // 复活管理
│       ├── logic/stage-manager.js   // 关卡推进管理
│       ├── // === 渲染层 ===
│       ├── render/battle-renderer.js// 战斗场景Canvas渲染
│       ├── render/effect-renderer.js// 特效渲染（伤害数字/暴击/MISS）
│       ├── render/idle-renderer.js  // 待机区域渲染（DOM动画/Canvas）
│       ├── // === UI层 ===
│       ├── ui/view-manager.js       // 视图切换管理
│       ├── ui/main-view.js          // 主界面
│       ├── ui/start-view.js         // 开局界面
│       ├── ui/prep-view.js          // 备战界面
│       ├── ui/battle-view.js        // 战斗界面
│       ├── ui/result-view.js        // 战后结算界面
│       ├── ui/shop-view.js          // 商店界面
│       ├── ui/component.js          // UI组件（按钮/弹窗/浮窗/拖拽）
│       ├── // === 入口 ===
│       └── main.js                  // 游戏初始化入口
```

**说明**：虽然物理上为单文件，逻辑上通过注释分区+IIFE模块模式组织代码，每个模块使用立即执行函数封装私有作用域，通过全局注册表或EventBus暴露接口。

### 1.3.2 模块封装模式

```javascript
// 模块注册表（全局）
const ModuleRegistry = {};

// 模块定义示例
const BattleEngine = (function() {
  // 私有变量和函数
  let _battleState = null;
  
  function _initBattle(allies, enemies) { /* ... */ }
  function _update(dt) { /* ... */ }
  
  // 公开接口
  return {
    init: _initBattle,
    update: _update,
    getState: () => _battleState
  };
})();

ModuleRegistry.BattleEngine = BattleEngine;
```

---

# 2. 接口设计

## 2.1 总体设计

### 2.1.1 模块间通信方案

采用**EventBus发布-订阅模式**实现模块间解耦通信：

```typescript
// EventBus 接口定义
interface EventBus {
  on(event: string, handler: Function, context?: object): void;
  off(event: string, handler: Function): void;
  emit(event: string, ...args: any[]): void;
  once(event: string, handler: Function, context?: object): void;
}

// 事件名称枚举
enum GameEvent {
  // 开局事件
  GAME_START = "game:start",
  UNIT_ROLLED = "unit:rolled",
  UNIT_CONFIRMED = "unit:confirmed",
  
  // 战斗事件
  BATTLE_START = "battle:start",
  BATTLE_UPDATE = "battle:update",
  BATTLE_END = "battle:end",
  BATTLE_PAUSE = "battle:pause",
  BATTLE_SPEED_CHANGE = "battle:speedChange",
  UNIT_ATTACK = "unit:attack",
  UNIT_DAMAGED = "unit:damaged",
  UNIT_DIED = "unit:died",
  UNIT_MISS = "unit:miss",
  UNIT_CRIT = "unit:crit",
  
  // 商店事件
  SHOP_ENTER = "shop:enter",
  SHOP_BUY = "shop:buy",
  SHOP_SELL = "shop:sell",
  SHOP_REFRESH = "shop:refresh",
  SHOP_LEAVE = "shop:leave",
  
  // 法宝事件
  ARTIFACT_EQUIP = "artifact:equip",
  ARTIFACT_UNEQUIP = "artifact:unequip",
  ARTIFACT_APPLY = "artifact:apply",
  
  // 关卡事件
  STAGE_ADVANCE = "stage:advance",
  STAGE_COMPLETE = "stage:complete",
  BOSS_WARNING = "boss:warning",
  
  // 状态事件
  GOLD_CHANGED = "gold:changed",
  SPIRIT_STONE_CHANGED = "spiritStone:changed",
  UNIT_RECRUITED = "unit:recruited",
  UNIT_REVIVED = "unit:revived",
  
  // 待机区域事件
  IDLE_INIT = "idle:init",
  IDLE_UNIT_CLICK = "idle:unitClick",
  IDLE_UNIT_ADD = "idle:unitAdd",
  IDLE_UNIT_REMOVE = "idle:unitRemove",
  
  // 折叠显示事件
  FOLD_TOGGLE = "fold:toggle",
  FOLD_UPDATED = "fold:updated",
  
  // 招募选择事件
  RECRUIT_OPTIONS_SHOW = "recruit:show",
  RECRUIT_SELECT = "recruit:select",
  RECRUIT_CONFIRMED = "recruit:confirmed",
  
  // 视图事件
  VIEW_SWITCH = "view:switch"
}
```

### 2.1.2 战斗循环主流程

```
┌──────────────┐
│ BattleEngine  │
│ .init()      │
└──────┬───────┘
       │ 初始化战场（我方左侧、敌方右侧）
       ▼
┌──────────────┐     requestAnimationFrame
│ GameLoop     │ ──────────────────────────→
│ .tick(dt)    │                              │
└──────┬───────┘                              │
       │                                       │
       ├── UnitAI.update(dt)  // 寻路+攻击决策  │
       ├── UnitAI.move(dt)    // 移动           │
       ├── BattleEngine.combat(dt) // 攻击结算  │
       ├── ArtifactEffectEngine.tick(dt) // 法宝效果 │
       ├── ReviveManager.tick(dt)    // 复活检测 │
       ├── BattleRenderer.render()   // 渲染    │
       ├── EffectRenderer.render()   // 特效渲染 │
       │                                       │
       └── 检查胜负条件 ──→ 胜/负 → emit(BATTLE_END)
```

---

## 2.2 接口清单

### 2.2.1 数据查询接口

| 接口 | 输入 | 输出 | 说明 |
|------|------|------|------|
| `UnitDB.getById(id)` | 单位编号 | `PlayerUnitData` | 查询我方单位基础数据 |
| `UnitDB.getByTier(tier)` | 等阶 | `PlayerUnitData[]` | 按等阶筛选单位 |
| `UnitDB.getByType(type)` | 流派类型 | `PlayerUnitData[]` | 按流派筛选单位 |
| `UnitDB.getAll()` | - | `PlayerUnitData[]` | 获取全部27种我方单位 |
| `EnemyDB.getById(id)` | 敌方编号 | `EnemyUnitData` | 查询敌方单位基础数据 |
| `EnemyDB.getByCategory(cat)` | 类型(杂兵/精英/Boss) | `EnemyUnitData[]` | 按类型筛选敌方 |
| `ArtifactDB.getById(id)` | 法宝编号 | `ArtifactData` | 查询法宝数据 |
| `ArtifactDB.getByQuality(q)` | 品质 | `ArtifactData[]` | 按品质筛选法宝 |
| `ArtifactDB.getBySource(src)` | 获取途径 | `ArtifactData[]` | 按获取途径筛选 |
| `StageConfig.getRound(round)` | 回合号(1-20) | `RoundConfig` | 获取回合配置 |

### 2.2.2 游戏状态接口

| 接口 | 输入 | 输出 | 说明 |
|------|------|------|------|
| `GameState.getPlayerUnits()` | - | `PlayerUnit[]` | 获取玩家全部单位实例 |
| `GameState.getAliveUnits()` | - | `PlayerUnit[]` | 获取存活单位 |
| `GameState.getArtifacts()` | - | `Artifact[]` | 获取背包中法宝 |
| `GameState.getGold()` | - | `number` | 获取金币 |
| `GameState.getSpiritStone()` | - | `number` | 获取灵石 |
| `GameState.getCurrentRound()` | - | `number` | 获取当前回合号 |
| `GameState.addGold(amount)` | 金币数 | `void` | 增加金币 |
| `GameState.addUnit(unit)` | 单位实例 | `void` | 添加单位到队伍 |
| `GameState.removeUnit(unitId)` | 单位ID | `void` | 移除单位 |

### 2.2.3 战斗引擎接口

| 接口 | 输入 | 输出 | 说明 |
|------|------|------|------|
| `BattleEngine.init(allies, enemies, roundType)` | 我方/敌方/回合类型 | `void` | 初始化战斗 |
| `BattleEngine.start()` | - | `void` | 开始战斗循环 |
| `BattleEngine.pause()` | - | `void` | 暂停战斗 |
| `BattleEngine.resume()` | - | `void` | 继续战斗 |
| `BattleEngine.setSpeed(multiplier)` | 倍速(0.5/1.0/1.5) | `void` | 设置战斗倍速 |
| `BattleEngine.getStatistics()` | - | `BattleStatistics` | 获取战斗统计数据 |

### 2.2.4 伤害计算接口

| 接口 | 输入 | 输出 | 说明 |
|------|------|------|------|
| `DamageCalculator.calc(attacker, defender, skillCoeff)` | 攻方/防方/技能系数 | `DamageResult` | 计算一次攻击伤害 |

### 2.2.5 待机引擎接口

| 接口 | 输入 | 输出 | 说明 |
|------|------|------|------|
| `IdleEngine.init(areaWidth, areaHeight, units)` | 区域宽/高/单位列表 | `void` | 初始化待机区域，设置单位初始随机位置 |
| `IdleEngine.update(dt)` | 帧间隔时间 | `void` | 每帧更新单位行走状态（移动/停留/避让） |
| `IdleEngine.addUnit(unit)` | 单位实例 | `void` | 新增单位到待机区域（随机初始位置） |
| `IdleEngine.removeUnit(unitId)` | 单位ID | `void` | 从待机区域移除单位 |
| `IdleEngine.getUnitPositions()` | - | `Map<unitId, {x, y}>` | 获取所有单位当前位置（供渲染器使用） |
| `IdleEngine.onUnitClick(unitId)` | 单位ID | `void` | 处理待机区域单位点击事件 |

### 2.2.6 折叠显示管理接口

| 接口 | 输入 | 输出 | 说明 |
|------|------|------|------|
| `UnitFoldManager.groupUnits(units)` | 单位数组 | `FoldGroup[]` | 按名称+等阶分组，返回折叠组列表 |
| `UnitFoldManager.toggle(foldKey)` | 折叠键(名称+等阶) | `void` | 切换折叠/展开状态 |
| `UnitFoldManager.isExpanded(foldKey)` | 折叠键 | `bool` | 查询折叠组是否展开 |
| `UnitFoldManager.getFoldDisplayText(foldKey)` | 折叠键 | `string` | 获取显示文本（如"剑修弟子×3"或"石工傀儡"） |
| `UnitFoldManager.onFoldOperation(foldKey, artifact)` | 折叠键+法宝 | `PlayerUnit \| null` | 折叠条目操作处理（N>1时弹出选择面板） |

### 2.2.7 招募选择管理接口

| 接口 | 输入 | 输出 | 说明 |
|------|------|------|------|
| `RecruitManager.generateOptions()` | - | `RecruitOption[]` | 生成3选1招募选项 |
| `RecruitManager.selectOption(optionId)` | 选项ID | `bool` | 选择1个招募选项，选中后其余禁用 |
| `RecruitManager.isSelectionLocked()` | - | `bool` | 查询是否已锁定选择（已选1个后返回true） |
| `RecruitManager.getSelectedOption()` | - | `RecruitOption \| null` | 获取已选择的招募选项 |
| `RecruitManager.reset()` | - | `void` | 重置招募状态（新战斗结算时调用） |

### 2.2.8 商店引擎接口

| 接口 | 输入 | 输出 | 说明 |
|------|------|------|------|
| `ShopEngine.init(chapter)` | 章节号 | `void` | 初始化商店（随机商品） |
| `ShopEngine.getItems()` | - | `ShopItem[]` | 获取当前商品列表 |
| `ShopEngine.buy(itemId)` | 商品ID | `bool` | 购买商品 |
| `ShopEngine.sell(item, type)` | 物品/类型 | `number` | 出售物品，返还金币数 |
| `ShopEngine.refresh()` | - | `void` | 刷新商品（消耗100金币） |

### 2.2.9 法宝效果引擎接口

| 接口 | 输入 | 输出 | 说明 |
|------|------|------|------|
| `ArtifactEffectEngine.applyPassive(unit, artifact)` | 单位/法宝 | `void` | 应用法宝被动加成到单位属性 |
| `ArtifactEffectEngine.removePassive(unit, artifact)` | 单位/法宝 | `void` | 移除法宝被动加成 |
| `ArtifactEffectEngine.onTrigger(event, unit)` | 触发事件/单位 | `void` | 法宝效果触发（如攻击时概率触发） |

### 2.2.10 关卡管理接口

| 接口 | 输入 | 输出 | 说明 |
|------|------|------|------|
| `StageManager.advance()` | - | `void` | 回合推进+1 |
| `StageManager.getRoundType()` | - | `RoundType` | 获取当前回合类型 |
| `StageManager.getDifficultyMultiplier()` | - | `number` | 获取当前难度倍数 |
| `StageManager.isBossRound()` | - | `bool` | 是否Boss回合 |
| `EnemyGenerator.generate(round, chapter)` | 回合号/章节号 | `EnemyUnit[]` | 生成敌方单位列表 |

### 2.2.11 复活管理接口

| 接口 | 输入 | 输出 | 说明 |
|------|------|------|------|
| `ReviveManager.onUnitDeath(unit)` | 单位 | `void` | 处理单位死亡（设置倒计时） |
| `ReviveManager.onBattleEnd()` | - | `void` | 战后递减所有倒计时 |
| `ReviveManager.getReviveStatus(unitId)` | 单位ID | `{alive: bool, countdown: number}` | 查询复活状态 |

---

# 4. 数据模型

## 4.1 设计目标

1. **数据与逻辑分离**：所有静态数值（单位属性、法宝数据、关卡配置）以纯数据对象定义，逻辑代码只读引用
2. **类型安全**：使用TypeScript接口定义约束数据结构（实现时用JSDoc注释在JS中标注类型）
3. **完整覆盖**：数据模型覆盖27种我方单位、35种敌方单位、213个法宝、20回合关卡配置
4. **可配置性**：战斗公式参数、经济参数等提取为常量配置，便于调整

## 4.2 模型实现

### 4.2.1 枚举类型定义

```typescript
// 等阶枚举
enum UnitTier {
  NORMAL = "normal",       // 普通（白）×1.0
  SCARCE = "scarce",       // 稀少（绿）×2.0
  LEGENDARY = "legendary", // 传奇（紫）×4.0
  MYTHICAL = "mythical"    // 神话（橙）×8.0
}

// 等阶属性倍数映射
const TIER_MULTIPLIER: Record<UnitTier, number> = {
  [UnitTier.NORMAL]: 1.0,
  [UnitTier.SCARCE]: 2.0,
  [UnitTier.LEGENDARY]: 4.0,
  [UnitTier.MYTHICAL]: 8.0
};

// 单位流派类型
enum UnitType {
  WARRIOR = "warrior",     // 战士
  MAGE = "mage",           // 法师
  TANK = "tank",           // 坦克
  ASSASSIN = "assassin",   // 刺客
  SUMMONER = "summoner",   // 召唤
  SUPPORT = "support",     // 辅助
  CONTROL = "control"      // 控制
}

// 敌方类型
enum EnemyCategory {
  MINION = "minion",       // 普通杂兵
  ELITE = "elite",         // 精英怪
  BOSS = "boss"            // Boss
}

// 法宝品质
enum ArtifactQuality {
  NORMAL = "normal",       // 普通（白）
  SCARCE = "scarce",       // 稀少（绿）
  LEGENDARY = "legendary", // 传奇（紫）
  MYTHICAL = "mythical"    // 神话（橙）
}

// 法宝功能类型
enum ArtifactCategory {
  OFFENSE = "offense",     // 进攻类
  DEFENSE = "defense",     // 防御类
  UTILITY = "utility",     // 功能类
  MECHANISM = "mechanism"  // 特殊机制类
}

// 法宝子类型
enum ArtifactSubType {
  RELIC = "relic",         // 法宝
  EQUIPMENT = "equipment", // 装备
  TALISMAN = "talisman",   // 符箓
  PILL = "pill",           // 丹药
  MENTAL = "mental",       // 心法
  SPECIAL = "special"      // 事件/特殊
}

// 法宝获取途径
enum ArtifactSource {
  NORMAL_DROP = "normalDrop",       // 普通战斗掉落(5%)
  ELITE_DROP = "eliteDrop",         // 精英战必掉
  BOSS_REWARD = "bossReward",       // Boss战奖励
  SHOP = "shop",                    // 商店购买
  EVENT = "event",                  // 事件选择
  CHAPTER_REWARD = "chapterReward"  // 章节结算
}

// 回合类型
enum RoundType {
  NORMAL = "normal",       // 普通战斗
  RELIC = "relic",         // 遗物战斗
  SHOP = "shop",           // 商店战斗
  BOSS = "boss"            // Boss战
}

// 战斗速度
enum BattleSpeed {
  SLOW = 0.5,
  NORMAL = 1.0,
  FAST = 1.5
}

// 游戏视图
enum GameView {
  MAIN = "main",
  START = "start",
  PREP = "prep",
  BATTLE = "battle",
  RESULT = "result",
  SHOP = "shop"
}
```

### 4.2.2 单位数据模型

```typescript
// 我方单位基础数据（静态，从数值表定义）
interface PlayerUnitData {
  id: number;                    // 编号 1-27
  name: string;                  // 名称（如"琴修弟子"）
  tier: UnitTier;                // 等阶
  type: UnitType;                // 流派
  baseHp: number;                // 基础HP
  baseAttack: number;            // 基础攻击
  baseDefense: number;           // 基础防御
  baseAttackSpeed: number;       // 基础攻速(秒)
  baseMoveSpeed: number;         // 基础移速
  baseRange: number;             // 基础射程(0=近战)
  baseCritRate: number;          // 基础暴击率
  baseCritDamage: number;        // 基础暴击伤害倍数
  baseDodgeRate: number;         // 基础闪避率
  baseToughness: number;         // 基础韧性
  description: string;           // 背景描述
  dialogues: {                   // 台词
    idle: string[];
    attack: string[];
    damaged: string[];
    death: string;
  };
}

// 我方单位运行时实例
interface PlayerUnit {
  instanceId: string;            // 运行时唯一ID（UUID）
  dataId: number;                // 对应的Data ID
  name: string;
  tier: UnitTier;
  type: UnitType;
  // v1.1: 取消合成系统，所有单位固定为1阶，移除level字段
  
  // 运行时属性（含等阶倍数×法宝加成）
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  attackSpeed: number;
  moveSpeed: number;
  range: number;
  critRate: number;
  critDamage: number;
  dodgeRate: number;
  toughness: number;
  
  // 状态
  isAlive: boolean;
  reviveCountdown: number;       // 复活倒计时(-1=不倒计时)
  
  // 装备
  artifacts: Artifact[];         // 已装备法宝列表
  
  // 战斗统计（单场战斗）
  battleStats: {
    damageDealt: number;
    damageTaken: number;
    healingDone: number;
    kills: number;
  };
}

// 敌方单位基础数据
interface EnemyUnitData {
  id: number;                    // 编号 1-35
  name: string;
  category: EnemyCategory;       // 类型(杂兵/精英/Boss)
  hp: number;
  attack: number;
  defense: number;
  attackSpeed: number;
  moveSpeed: number;
  range: number;
  critRate: number;
  critDamage: number;
  dodgeRate: number;
  toughness: number;
}

// 敌方单位运行时实例
interface EnemyUnit {
  instanceId: string;
  dataId: number;
  name: string;
  category: EnemyCategory;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  attackSpeed: number;
  moveSpeed: number;
  range: number;
  critRate: number;
  critDamage: number;
  dodgeRate: number;
  toughness: number;
  isAlive: boolean;
}
```

### 4.2.3 法宝数据模型

```typescript
// 法宝基础数据
interface ArtifactData {
  id: number;                    // 编号 1-213
  name: string;                  // 国风名称
  category: ArtifactCategory;    // 功能类型(进攻/防御/功能/特殊)
  subType: ArtifactSubType;      // 子类型(法宝/装备/符箓/丹药/心法/特殊)
  quality: ArtifactQuality;      // 品质(普通/稀少/传奇/神话)
  effectDescription: string;     // 效果描述(含{x}占位符)
  effectValues: number[];        // {x}占位符的实际数值数组
  source: ArtifactSource;        // 获取途径
  price: number;                 // 价格(金币,-1表示不可购买)
  relatedUnitType?: UnitType;    // 关联单位类型(如毒修专属)
}

// 法宝运行时实例
interface Artifact {
  instanceId: string;
  dataId: number;
  name: string;
  quality: ArtifactQuality;
  equippedBy: string | null;     // 装备目标单位ID(null=在背包中)
}

// 法宝效果处理器
interface ArtifactEffectHandler {
  artifactId: number;
  onEquip?: (unit: PlayerUnit) => void;
  onUnequip?: (unit: PlayerUnit) => void;
  onAttack?: (attacker: PlayerUnit, defender: any, result: DamageResult) => void;
  onDamaged?: (unit: PlayerUnit, damage: number) => void;
  onDeath?: (unit: PlayerUnit) => void;
  onBattleStart?: (units: PlayerUnit[]) => void;
  onTick?: (dt: number, unit: PlayerUnit) => void;
}
```

### 4.2.4 战场与战斗数据模型

```typescript
// 战场单位（战斗中的运行时表示）
interface BattleUnit {
  unit: PlayerUnit | EnemyUnit;  // 引用单位实例
  side: "ally" | "enemy";       // 阵营
  x: number;                    // 战场X坐标
  y: number;                    // 战场Y坐标
  targetId: string | null;      // 当前攻击目标ID
  attackCooldown: number;       // 攻击冷却剩余时间(秒)
  isMoving: boolean;            // 是否在移动中
  effects: BattleEffect[];      // 当前战斗效果列表
}

// 战斗效果(Buff/Debuff)
interface BattleEffect {
  id: string;
  name: string;
  type: "buff" | "debuff";
  duration: number;             // 剩余时间(秒)
  tickRate: number;             // 触发频率
  value: number;                // 效果值
  onApply?: (unit: BattleUnit) => void;
  onTick?: (unit: BattleUnit) => void;
  onExpire?: (unit: BattleUnit) => void;
}

// 伤害计算结果
interface DamageResult {
  damage: number;               // 实际伤害
  isCrit: boolean;              // 是否暴击
  isDodged: boolean;            // 是否闪避
  isKilled: boolean;            // 是否击杀
  rawDamage: number;            // 穿透前原始伤害(用于显示)
}

// 战斗统计
interface BattleStatistics {
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalHealing: number;
  unitStats: Map<string, {      // key=instanceId
    name: string;
    damageDealt: number;
    damageTaken: number;
    healingDone: number;
    survived: boolean;
  }>;
  battleDuration: number;       // 战斗时长(秒)
  isVictory: boolean;
}

// 战场配置常量
interface BattleConfig {
  FIELD_WIDTH: number;          // 战场宽度(像素) 1200
  FIELD_HEIGHT: number;         // 战场高度(像素) 600
  ALLY_START_X: number;         // 我方起始X 100
  ENEMY_START_X: number;        // 敌方起始X 1100
  UNIT_SIZE: number;            // 单位渲染尺寸 40
  MELEE_RANGE: number;          // 近战判定距离 50
  DEFENSE_FACTOR: number;       // 防御系数 0.8
  RANDOM_FLOOR: number;         // 随机波动下限 0.9
  RANDOM_CEIL: number;          // 随机波动上限 1.1
  DEFAULT_CRIT_DAMAGE: number;  // 默认暴击倍数 2.0
}

// 待机区域配置常量
interface IdleConfig {
  AREA_WIDTH_RATIO: number;     // 待机区域宽度占备战界面比例(≥0.6)
  AREA_HEIGHT_RATIO: number;    // 待机区域高度占备战界面比例(≥0.5)
  WALK_SPEED_RATIO: [number, number]; // 行走速度比例范围[0.3, 0.5]（相对战斗移速）
  STAY_DURATION: [number, number];    // 停留时间范围[1, 3]秒
  AVOID_MIN_DISTANCE: number;   // 单位间最小避让间距(30px)
  UNIT_SIZE: number;            // 待机区域单位渲染尺寸
}

// 待机单位运行时状态
interface IdleUnit {
  unitId: string;               // 单位instanceId
  x: number;                    // 当前X坐标
  y: number;                    // 当前Y坐标
  targetX: number;              // 目标X坐标
  targetY: number;              // 目标Y坐标
  state: "walking" | "staying"; // 当前状态(行走/停留)
  stayTimer: number;            // 停留剩余时间(秒)
  walkSpeed: number;            // 行走速度
}

// 折叠组数据模型
interface FoldGroup {
  key: string;                  // 折叠键(格式:"名称_等阶"，如"剑修弟子_scarce")
  name: string;                 // 单位名称
  tier: UnitTier;               // 等阶
  units: PlayerUnit[];          // 该组内所有单位实例
  count: number;                // 单位数量
  isExpanded: boolean;          // 是否展开
  displayText: string;          // 显示文本(如"剑修弟子×3"或"石工傀儡")
}

// 招募选项数据模型
interface RecruitOption {
  id: string;                   // 选项唯一ID
  unit: PlayerUnit;             // 预生成的单位实例
  isSelected: boolean;          // 是否已被选中
  isDisabled: boolean;          // 是否被禁用(其他选项被选中时禁用)
}

// 招募管理状态
interface RecruitState {
  options: RecruitOption[];     // 3个招募选项
  selectionLocked: boolean;     // 选择是否已锁定
  selectedOptionId: string | null; // 已选择的选项ID
}
```

### 4.2.5 关卡与回合数据模型

```typescript
// 回合配置
interface RoundConfig {
  round: number;                // 回合号(1-20)
  type: RoundType;              // 回合类型
  enemyPool: number[];          // 可选敌方ID列表
  baseEnemyCount: number;       // 基础敌方数量
  goldReward: [number, number]; // 金币奖励范围[min, max]
  isBoss: boolean;
  bossId?: number;              // Boss单位ID
}

// 章节配置
interface ChapterConfig {
  chapterId: number;
  name: string;                 // "凡间"
  rounds: RoundConfig[];        // 20回合配置
  enemyPool: number[];          // 章节敌方池(敌方ID数组)
  bossId: number;               // 章节Boss ID
}

// 商店商品
interface ShopItem {
  id: string;                   // 商品唯一ID
  type: "unit" | "artifact";    // 商品类型
  data: PlayerUnitData | ArtifactData; // 商品数据
  price: number;                // 价格
  isSold: boolean;              // 是否已售出
}
```

### 4.2.6 游戏全局状态模型

```typescript
// 游戏全局状态
interface GameState {
  // 流程状态
  currentView: GameView;
  isGameRunning: boolean;
  
  // 玩家资源
  gold: number;                 // 金币(0-9999)
  spiritStone: number;          // 灵石
  
  // 玩境
  playerUnits: PlayerUnit[];    // 我方单位列表(上限20)
  artifactBag: Artifact[];      // 法宝背包(未装备的法宝)
  
  // 关卡
  currentChapter: number;       // 当前章节(1)
  currentRound: number;         // 当前回合(1-20)
  completedRounds: number[];    // 已完成回合
  
  // 开局
  rerollRemaining: number;      // 重新随机剩余次数(3)
  startUnitConfirmed: boolean;  // 开局单位已确认
  
  // 战斗
  battleState: BattleState | null;
  
  // 商店
  shopItems: ShopItem[];
}

// 战斗运行时状态
interface BattleState {
  isRunning: boolean;
  isPaused: boolean;
  speed: BattleSpeed;
  allyUnits: BattleUnit[];
  enemyUnits: BattleUnit[];
  elapsed: number;              // 已过时间(秒)
  statistics: BattleStatistics;
}
```

### 4.2.7 可配置常量表

```typescript
// 游戏配置常量
const GAME_CONFIG = {
  // 战斗公式
  DEFENSE_FACTOR: 0.8,
  RANDOM_DAMAGE_FLOOR: 0.9,
  RANDOM_DAMAGE_CEIL: 1.1,
  DEFAULT_CRIT_DAMAGE: 2.0,
  MIN_DAMAGE: 1,
  
  // v1.1: 合成相关参数已移除（取消合成系统，单位固定1阶）
  
  // 经济
  MAX_GOLD: 9999,
  INITIAL_SPIRIT_STONE: 200,
  INITIAL_GOLD: 0,
  REROLL_COST: 100,             // 重新随机费用(灵石)
  REROLL_MAX: 3,                // 重新随机次数上限
  SHOP_REFRESH_COST: 100,       // 商店刷新费用
  SELL_RETURN_RATE: 0.5,        // 出售返还比例
  
  // 单位
  MAX_PLAYER_UNITS: 20,         // 我方单位上限
  REVIVE_COUNTDOWN: 4,          // 默认复活倒计时(回合)
  REVIVE_HP_RATE: 0.5,          // 复活后HP比例
  START_UNIT_HP_RATE: 0.8,      // 开局单位属性比例
  
  // 等阶概率
  TIER_PROB_NORMAL: 0.6,
  TIER_PROB_SCARCE: 0.3,
  TIER_PROB_LEGENDARY: 0.1,
  
  // 法宝品质概率(遗物战斗)
  ARTIFACT_PROB_NORMAL: 0.6,
  ARTIFACT_PROB_SCARCE: 0.3,
  ARTIFACT_PROB_LEGENDARY: 0.1,
  
  // 战斗
  BATTLE_TIMEOUT: 600,          // 战斗超时(秒,10分钟)
  TARGET_FPS: 60,
  
  // 商店
  SHOP_UNIT_COUNT: [1, 3],      // 商店单位数量范围
  SHOP_ARTIFACT_COUNT: [1, 2],  // 商店法宝数量范围
  
  // 战场尺寸
  BATTLE_FIELD_WIDTH: 1200,
  BATTLE_FIELD_HEIGHT: 600,
  UNIT_RENDER_SIZE: 40,
  MELEE_ATTACK_RANGE: 50,
  
  // 待机区域
  IDLE_AREA_WIDTH_RATIO: 0.65,  // 待机区域宽度占备战界面比例
  IDLE_AREA_HEIGHT_RATIO: 0.55, // 待机区域高度占备战界面比例
  IDLE_WALK_SPEED_RATIO: [0.3, 0.5], // 行走速度比例(相对战斗移速)
  IDLE_STAY_DURATION: [1, 3],   // 停留时间范围(秒)
  IDLE_AVOID_MIN_DISTANCE: 30,  // 单位间最小避让间距(像素)
  IDLE_UNIT_SIZE: 36,           // 待机区域单位渲染尺寸
  
  // 单位价格
  UNIT_PRICE: { [UnitTier.NORMAL]: 100, [UnitTier.SCARCE]: 300, [UnitTier.LEGENDARY]: 1000 },
  
  // 难度曲线(Demo仅1章，循环间倍数=1.0)
  DIFFICULTY_CURVE: {
    1: 1.00, 2: 1.02, 3: 1.04, 4: 1.06, 5: 1.08,   // 回合1-5
    6: 1.10, 7: 1.12, 8: 1.14, 9: 1.16, 10: 1.18,  // 回合6-10
    11: 1.20, 12: 1.24, 13: 1.28, 14: 1.32, 15: 1.36, // 回合11-15
    16: 1.40, 17: 1.45, 18: 1.50, 19: 1.55, 20: 1.75  // 回合16-20(Boss)
  }
};
```

---

# 5. 子系统实现方案

## 5.1 开局系统

### 5.1.1 流程

1. 玩家点击"开始修行" → 进入开局视图
2. 调用 `generateStartUnit()` 从27种单位中按概率(60%/30%/10%)随机等阶
3. 创建单位实例，属性乘以80%(开局衰减)
4. 展示单位信息卡片（头像/名称/等阶/属性）
5. 玩家可点击"再测天机"（消耗100灵石，限3次）或"就此定夺"确认

### 5.1.2 等阶随机算法

```javascript
function rollTier() {
  const r = Math.random();
  if (r < GAME_CONFIG.TIER_PROB_NORMAL) return UnitTier.NORMAL;      // 60%
  if (r < GAME_CONFIG.TIER_PROB_NORMAL + GAME_CONFIG.TIER_PROB_SCARCE) return UnitTier.SCARCE; // 30%
  return UnitTier.LEGENDARY; // 10%
}
```

### 5.1.3 开局单位生成

```javascript
function generateStartUnit() {
  const tier = rollTier();
  // 从该等阶可用的单位中随机选1个
  const candidates = UnitDB.getByTier(tier);
  const baseData = RandomUtil.pick(candidates);
  // 创建实例，属性×80%
  const unit = createUnitInstance(baseData, { hpRate: GAME_CONFIG.START_UNIT_HP_RATE });
  return unit;
}
```

---

## 5.2 待机区域系统（v1.1新增）

### 5.2.1 待机引擎主循环

待机区域使用独立的 `requestAnimationFrame` 循环驱动单位随机行走，在备战界面激活时启动，离开备战时停止。

```javascript
const IdleEngine = {
  _units: [],       // IdleUnit[]
  _areaWidth: 0,
  _areaHeight: 0,
  _running: false,
  _rafId: null,
  
  init(areaWidth, areaHeight, units) {
    this._areaWidth = areaWidth;
    this._areaHeight = areaHeight;
    this._units = [];
    
    for (const unit of units) {
      // 死亡单位不参与行走
      if (!unit.isAlive) {
        this._units.push(this._createIdleUnit(unit, true));
      } else {
        this._units.push(this._createIdleUnit(unit, false));
      }
    }
    
    EventBus.emit(GameEvent.IDLE_INIT);
  },
  
  _createIdleUnit(unit, isDead) {
    // 随机初始位置（留出边距padding=20px）
    const padding = 20;
    return {
      unitId: unit.instanceId,
      x: padding + Math.random() * (this._areaWidth - 2 * padding),
      y: padding + Math.random() * (this._areaHeight - 2 * padding),
      targetX: 0,
      targetY: 0,
      state: isDead ? "staying" : "walking",
      stayTimer: isDead ? Infinity : 0,
      walkSpeed: unit.moveSpeed * RandomUtil.floatRange(
        GAME_CONFIG.IDLE_WALK_SPEED_RATIO[0],
        GAME_CONFIG.IDLE_WALK_SPEED_RATIO[1]
      )
    };
  },
  
  start() {
    if (this._running) return;
    this._running = true;
    this._lastTime = performance.now();
    this._loop(this._lastTime);
  },
  
  stop() {
    this._running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
  },
  
  _loop(timestamp) {
    if (!this._running) return;
    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.05); // 限帧避免跳帧
    this._lastTime = timestamp;
    
    this.update(dt);
    IdleRenderer.render(this._units, this._areaWidth, this._areaHeight);
    
    this._rafId = requestAnimationFrame((t) => this._loop(t));
  },
  
  update(dt) {
    const padding = 20;
    
    for (const idleUnit of this._units) {
      const unit = GameState.getUnitById(idleUnit.unitId);
      // 死亡单位不行走
      if (!unit || !unit.isAlive) continue;
      
      if (idleUnit.state === "staying") {
        idleUnit.stayTimer -= dt;
        if (idleUnit.stayTimer <= 0) {
          // 停留结束，选择新的随机目标点
          idleUnit.targetX = padding + Math.random() * (this._areaWidth - 2 * padding);
          idleUnit.targetY = padding + Math.random() * (this._areaHeight - 2 * padding);
          idleUnit.state = "walking";
        }
      } else if (idleUnit.state === "walking") {
        // 向目标点移动
        const dx = idleUnit.targetX - idleUnit.x;
        const dy = idleUnit.targetY - idleUnit.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 3) {
          // 到达目标点，进入停留状态
          idleUnit.state = "staying";
          idleUnit.stayTimer = RandomUtil.floatRange(
            GAME_CONFIG.IDLE_STAY_DURATION[0],
            GAME_CONFIG.IDLE_STAY_DURATION[1]
          );
        } else {
          // 按速度移动
          const moveAmount = idleUnit.walkSpeed * dt;
          idleUnit.x += (dx / dist) * Math.min(moveAmount, dist);
          idleUnit.y += (dy / dist) * Math.min(moveAmount, dist);
        }
      }
    }
    
    // 避让处理
    this._applyAvoidance();
    
    // 边界约束
    this._clampBounds(padding);
  },
  
  _applyAvoidance() {
    const minDist = GAME_CONFIG.IDLE_AVOID_MIN_DISTANCE;
    for (let i = 0; i < this._units.length; i++) {
      for (let j = i + 1; j < this._units.length; j++) {
        const a = this._units[i];
        const b = this._units[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < minDist && dist > 0) {
          // 推开两个单位各一半距离
          const push = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }
  },
  
  _clampBounds(padding) {
    for (const u of this._units) {
      u.x = MathUtil.clamp(u.x, padding, this._areaWidth - padding);
      u.y = MathUtil.clamp(u.y, padding, this._areaHeight - padding);
    }
  }
};
```

### 5.2.2 待机区域渲染

采用**DOM元素+CSS transform**方案实现待机区域渲染，每个单位对应一个DOM元素，通过transform定位：

```javascript
const IdleRenderer = {
  _container: null,
  _unitElements: new Map(),  // unitId → DOM element
  
  init(containerEl) {
    this._container = containerEl;
  },
  
  render(idleUnits, areaWidth, areaHeight) {
    // 更新已有单位位置（使用transform，避免layout thrash）
    for (const idleUnit of idleUnits) {
      let el = this._unitElements.get(idleUnit.unitId);
      if (!el) {
        el = this._createUnitElement(idleUnit.unitId);
        this._container.appendChild(el);
        this._unitElements.set(idleUnit.unitId, el);
      }
      el.style.transform = `translate(${idleUnit.x}px, ${idleUnit.y}px)`;
    }
  },
  
  _createUnitElement(unitId) {
    const unit = GameState.getUnitById(unitId);
    const el = document.createElement("div");
    el.className = "idle-unit";
    el.dataset.unitId = unitId;
    // 等阶颜色、名称、灰色处理等
    el.style.borderColor = getTierColor(unit.tier);
    el.querySelector(".idle-unit-name").textContent = unit.name.substring(0, 2);
    if (!unit.isAlive) {
      el.classList.add("dead");
      el.querySelector(".revive-countdown").textContent = unit.reviveCountdown;
    }
    // 点击弹出详情
    el.addEventListener("click", () => {
      EventBus.emit(GameEvent.IDLE_UNIT_CLICK, unitId);
    });
    return el;
  }
};
```

---

## 5.3 单位折叠显示系统（v1.1新增）

### 5.3.1 折叠分组算法

```javascript
const UnitFoldManager = {
  _expandedKeys: new Set(),   // 当前展开的折叠键集合
  _groups: [],                // FoldGroup[]
  
  groupUnits(units) {
    // 按名称+等阶分组
    const groupMap = new Map();
    for (const unit of units) {
      const key = `${unit.name}_${unit.tier}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key).push(unit);
    }
    
    // 构建FoldGroup数组
    this._groups = [];
    for (const [key, groupUnits] of groupMap) {
      const count = groupUnits.length;
      const isExpanded = this._expandedKeys.has(key);
      this._groups.push({
        key,
        name: groupUnits[0].name,
        tier: groupUnits[0].tier,
        units: groupUnits,
        count,
        isExpanded,
        displayText: count > 1 ? `${groupUnits[0].name}×${count}` : groupUnits[0].name
      });
    }
    
    EventBus.emit(GameEvent.FOLD_UPDATED, this._groups);
    return this._groups;
  },
  
  toggle(foldKey) {
    if (this._expandedKeys.has(foldKey)) {
      this._expandedKeys.delete(foldKey);
    } else {
      this._expandedKeys.add(foldKey);
    }
    EventBus.emit(GameEvent.FOLD_TOGGLE, foldKey);
  },
  
  isExpanded(foldKey) {
    return this._expandedKeys.has(foldKey);
  },
  
  getFoldDisplayText(foldKey) {
    const group = this._groups.find(g => g.key === foldKey);
    if (!group) return "";
    return group.count > 1 ? `${group.name}×${group.count}` : group.name;
  },
  
  onFoldOperation(foldKey, artifact) {
    const group = this._groups.find(g => g.key === foldKey);
    if (!group) return null;
    
    if (group.count > 1) {
      // 多个实例，需要弹出选择面板让用户选择目标实例
      // 返回null表示需要UI层弹出选择面板
      return null;
    }
    // 仅1个实例，直接装备
    return group.units[0];
  }
};
```

### 5.3.2 折叠显示UI交互设计

1. **折叠状态**：显示"名称×N"文本（如"剑修弟子×3"），附带等阶颜色标记，N>1时右侧显示折叠图标▼
2. **展开状态**：折叠行下方展开N个独立单位行，每个行显示个体信息（已装备法宝、HP、复活倒计时等）
3. **点击交互**：点击折叠行→展开/收起切换；再次点击→收起
4. **拖拽法宝到折叠行**：N>1时弹出实例选择面板（列表展示每个实例，点击选择目标）；N=1时直接装备
5. **不同等阶不折叠**：相同名称不同等阶的单位分别独立折叠组

---

## 5.4 招募唯一选择系统（v1.1修复）

### 5.4.1 招募管理器

修复原有3选1招募可重复选择的Bug，实现选择后立即锁定机制：

```javascript
const RecruitManager = {
  _state: null,  // RecruitState
  
  generateOptions() {
    const options = [];
    for (let i = 0; i < 3; i++) {
      const tier = rollTier();
      const data = RandomUtil.pick(UnitDB.getByTier(tier));
      const unit = createUnitInstance(data.id, tier);
      options.push({
        id: `recruit_${i}`,
        unit,
        isSelected: false,
        isDisabled: false
      });
    }
    
    this._state = {
      options,
      selectionLocked: false,
      selectedOptionId: null
    };
    
    EventBus.emit(GameEvent.RECRUIT_OPTIONS_SHOW, options);
    return options;
  },
  
  selectOption(optionId) {
    if (!this._state || this._state.selectionLocked) return false;
    
    const option = this._state.options.find(o => o.id === optionId);
    if (!option || option.isDisabled) return false;
    
    // 标记选中
    option.isSelected = true;
    this._state.selectedOptionId = optionId;
    this._state.selectionLocked = true;
    
    // 禁用其余选项
    for (const o of this._state.options) {
      if (o.id !== optionId) {
        o.isDisabled = true;
      }
    }
    
    EventBus.emit(GameEvent.RECRUIT_SELECT, { optionId, unit: option.unit });
    return true;
  },
  
  isSelectionLocked() {
    return this._state ? this._state.selectionLocked : false;
  },
  
  getSelectedOption() {
    if (!this._state || !this._state.selectedOptionId) return null;
    return this._state.options.find(o => o.id === this._state.selectedOptionId);
  },
  
  reset() {
    this._state = null;
  }
};
```

### 5.4.2 招募UI交互设计

1. **初始状态**：3个招募选项卡片均高亮可选
2. **选中状态**：点击1个选项→该选项金色边框高亮+打勾标记→其余2个选项立即灰显+禁用点击
3. **防重复点击**：`isSelectionLocked()`返回true后，所有选项点击事件被拦截，UI显示灰禁状态
4. **队伍已满处理**：20个单位已满时，选项均显示"替换"按钮（选择替换哪个现有单位）

---

## 5.5 自动战斗系统

### 5.5.1 战斗主循环

```javascript
function battleLoop(timestamp) {
  if (!battleState.isRunning || battleState.isPaused) return;
  
  const dt = (timestamp - lastTimestamp) / 1000 * battleState.speed;
  lastTimestamp = timestamp;
  
  // 1. AI决策+移动
  for (const unit of [...battleState.allyUnits, ...battleState.enemyUnits]) {
    if (!unit.unit.isAlive) continue;
    UnitAI.update(unit, dt, battleState);
  }
  
  // 2. 攻击结算
  for (const unit of [...battleState.allyUnits, ...battleState.enemyUnits]) {
    if (!unit.unit.isAlive || unit.attackCooldown > 0) {
      unit.attackCooldown -= dt;
      continue;
    }
    tryAttack(unit, battleState);
  }
  
  // 3. 法宝效果tick
  ArtifactEffectEngine.tick(dt, battleState);
  
  // 4. 效果过期清理
  updateEffects(dt, battleState);
  
  // 5. 胜负判定
  if (checkBattleEnd(battleState)) {
    endBattle(battleState);
    return;
  }
  
  // 6. 渲染
  BattleRenderer.render(battleState);
  EffectRenderer.render(battleState);
  
  requestAnimationFrame(battleLoop);
}
```

### 5.5.2 单位AI（简单版）

```javascript
const UnitAI = {
  update(battleUnit, dt, state) {
    if (!battleUnit.unit.isAlive) return;
    
    // 寻找最近存活敌人
    const enemies = battleUnit.side === "ally" ? state.enemyUnits : state.allyUnits;
    const aliveEnemies = enemies.filter(e => e.unit.isAlive);
    if (aliveEnemies.length === 0) return;
    
    const target = findNearest(battleUnit, aliveEnemies);
    battleUnit.targetId = target.unit.instanceId;
    
    // 计算攻击距离
    const dist = getDistance(battleUnit, target);
    const attackRange = battleUnit.unit.range || GAME_CONFIG.MELEE_ATTACK_RANGE;
    
    if (dist <= attackRange) {
      // 在攻击范围内，停止移动
      battleUnit.isMoving = false;
    } else {
      // 向目标移动
      battleUnit.isMoving = true;
      moveToward(battleUnit, target, dt);
    }
  }
};
```

### 5.5.3 伤害计算引擎

```javascript
const DamageCalculator = {
  calc(attacker, defender, skillCoeff = 1.0) {
    // 1. 闪避判定
    const dodgeChance = defender.dodgeRate;
    if (Math.random() < dodgeChance) {
      return { damage: 0, isCrit: false, isDodged: true, isKilled: false, rawDamage: 0 };
    }
    
    // 2. 基础伤害
    const rawDamage = Math.max(
      GAME_CONFIG.MIN_DAMAGE,
      (attacker.attack - defender.defense * GAME_CONFIG.DEFENSE_FACTOR) * skillCoeff
    );
    
    // 3. 随机波动
    const randomFactor = GAME_CONFIG.RANDOM_DAMAGE_FLOOR + 
      Math.random() * (GAME_CONFIG.RANDOM_DAMAGE_CEIL - GAME_CONFIG.RANDOM_DAMAGE_FLOOR);
    let damage = rawDamage * randomFactor;
    
    // 4. 暴击判定
    const effectiveCritRate = Math.max(0, attacker.critRate - defender.toughness * 0.01);
    const isCrit = Math.random() < effectiveCritRate;
    if (isCrit) {
      damage *= attacker.critDamage;
    }
    
    // 5. 取整
    damage = Math.floor(Math.max(GAME_CONFIG.MIN_DAMAGE, damage));
    
    // 6. 击杀判定
    const isKilled = defender.hp - damage <= 0;
    const actualDamage = Math.min(damage, defender.hp);
    
    return { damage: actualDamage, isCrit, isDodged: false, isKilled, rawDamage: damage };
  }
};
```

### 5.5.4 战斗初始化 - 单位布阵

```javascript
function initBattleField(allies, enemies) {
  const fieldW = GAME_CONFIG.BATTLE_FIELD_WIDTH;
  const fieldH = GAME_CONFIG.BATTLE_FIELD_HEIGHT;
  
  // 我方从左侧出发，纵向均匀分布
  const allySpacing = fieldH / (allies.length + 1);
  battleState.allyUnits = allies.map((unit, i) => ({
    unit,
    side: "ally",
    x: GAME_CONFIG.ALLY_START_X,
    y: allySpacing * (i + 1),
    targetId: null,
    attackCooldown: 0,
    isMoving: false,
    effects: []
  }));
  
  // 敌方从右侧出发，纵向均匀分布
  const enemySpacing = fieldH / (enemies.length + 1);
  battleState.enemyUnits = enemies.map((unit, i) => ({
    unit,
    side: "enemy",
    x: GAME_CONFIG.ENEMY_START_X,
    y: enemySpacing * (i + 1),
    targetId: null,
    attackCooldown: 0,
    isMoving: false,
    effects: []
  }));
}
```

---

## 5.6 敌人生成系统

### 5.6.1 敌方数量计算

```javascript
function calcEnemyCount(round) {
  const base = 5 + Math.floor(round / 5);
  const offset = Math.floor(Math.random() * 4) - 1; // -1 ~ 2
  return Math.max(3, base + offset);
}
```

### 5.6.2 难度倍数应用

```javascript
function applyDifficulty(enemyData, round) {
  const multiplier = GAME_CONFIG.DIFFICULTY_CURVE[round] || 1.0;
  return {
    ...enemyData,
    hp: Math.floor(enemyData.hp * multiplier),
    attack: Math.floor(enemyData.attack * multiplier),
    defense: Math.floor(enemyData.defense * multiplier)
  };
}
```

### 5.6.3 Boss战生成

```javascript
function generateBossRound(chapterConfig) {
  const bossData = EnemyDB.getById(chapterConfig.bossId);
  const boss = createEnemyInstance(bossData, { isBoss: true });
  
  // 小兵数量 10~15
  const minionCount = 10 + Math.floor(Math.random() * 6);
  const minions = [];
  for (let i = 0; i < minionCount; i++) {
    const randomId = RandomUtil.pick(chapterConfig.enemyPool);
    const data = EnemyDB.getById(randomId);
    minions.push(createEnemyInstance(applyDifficulty(data, 20)));
  }
  
  return [boss, ...minions];
}
```

---

## 5.7 战后结算系统

### 5.7.1 结算流程

1. 展示战斗结果（胜利金色/失败灰色）
2. 展示单位表现统计（伤害/承伤/治疗排名）
3. 胜利时：
   - 发放金币（按回合类型范围随机）
   - 3选1单位招募（等阶概率60%/30%/10%）
   - 遗物战斗：额外1个随机品质法宝
   - Boss战：1个传奇法宝 + 保底传奇单位
   - 商店战斗：标记进入商店
4. 死亡单位复活倒计时-1
5. 倒计时归0的单位复活（HP=50%maxHp）

### 5.7.2 金币奖励计算

```javascript
function calcGoldReward(roundType) {
  const ranges = {
    [RoundType.NORMAL]: [50, 100],
    [RoundType.RELIC]: [80, 120],
    [RoundType.SHOP]: [100, 150],
    [RoundType.BOSS]: [300, 500]
  };
  const [min, max] = ranges[roundType];
  return min + Math.floor(Math.random() * (max - min + 1));
}
```

---

## 5.8 商店系统

### 5.8.1 商品生成

```javascript
function generateShopItems() {
  const items = [];
  
  // 单位商品 1-3个
  const unitCount = RandomUtil.intRange(...GAME_CONFIG.SHOP_UNIT_COUNT);
  for (let i = 0; i < unitCount; i++) {
    const tier = rollTier();
    const data = RandomUtil.pick(UnitDB.getByTier(tier));
    items.push({
      id: `shop_unit_${i}`,
      type: "unit",
      data,
      price: GAME_CONFIG.UNIT_PRICE[tier],
      isSold: false
    });
  }
  
  // 法宝商品 1-2个
  const artifactCount = RandomUtil.intRange(...GAME_CONFIG.SHOP_ARTIFACT_COUNT);
  const shopArtifacts = ArtifactDB.getBySource(ArtifactSource.SHOP);
  for (let i = 0; i < artifactCount; i++) {
    const data = RandomUtil.pick(shopArtifacts);
    items.push({
      id: `shop_artifact_${i}`,
      type: "artifact",
      data,
      price: data.price,
      isSold: false
    });
  }
  
  return items;
}
```

---

## 5.9 法宝效果系统

### 5.9.1 法宝效果分类实现方案

由于213个法宝效果多样，采用**效果处理器注册表**模式：

1. **属性加成类**（如+攻击/防御/暴击等）：直接修改单位属性值，在装备/卸下时计算
2. **概率触发类**（如攻击时20%概率范围伤害）：注册 `onAttack` 回调
3. **条件触发类**（如死亡时复活/低血量隐身）：注册 `onDeath`/`onDamaged` 回调
4. **持续效果类**（如每秒获得临时生命值）：注册 `onTick` 回调
5. **战斗开始类**（如战斗开始召唤阴魂）：注册 `onBattleStart` 回调

### 5.9.2 法宝效果应用策略

```javascript
// 被动属性加成：在装备时修改unit属性
function applyPassiveStats(unit, artifact) {
  const handler = ArtifactEffectRegistry[artifact.dataId];
  if (handler && handler.onEquip) {
    handler.onEquip(unit);
  }
}

// 触发式效果：在战斗事件中检查
function onAttackTrigger(attacker, defender, result) {
  for (const artifact of attacker.artifacts) {
    const handler = ArtifactEffectRegistry[artifact.dataId];
    if (handler && handler.onAttack) {
      handler.onAttack(attacker, defender, result);
    }
  }
}
```

### 5.9.3 法宝效果分批实现策略

鉴于213个法宝效果实现工作量巨大，采用分批策略：

| 批次 | 范围 | 数量 | 说明 |
|------|------|------|------|
| **P0-核心** | 属性加成类(装备+心法) | ~41个 | 直接修改属性，实现简单 |
| **P1-常用** | 概率触发类(法宝) | ~50个 | 攻击/受伤/死亡时触发 |
| **P2-特殊** | 条件/持续/战斗开始类 | ~122个 | 需要额外状态追踪 |

P0阶段仅实现属性加成效果（所有装备和心法类法宝），P1实现常用概率触发效果，P2逐步补全特殊效果。

---

## 5.10 复活系统

### 5.10.1 死亡处理

```javascript
function handleUnitDeath(unit) {
  // 检查替身傀儡
  const puppet = unit.artifacts.find(a => a.dataId === PUPPET_ARTIFACT_ID);
  if (puppet && !puppet.usedThisBattle) {
    unit.hp = Math.floor(unit.maxHp * GAME_CONFIG.REVIVE_HP_RATE);
    unit.isAlive = true;
    puppet.usedThisBattle = true;
    EventBus.emit(GameEvent.UNIT_REVIVED, { unit, source: "puppet" });
    return;
  }
  
  // 正常死亡
  unit.isAlive = false;
  unit.reviveCountdown = GAME_CONFIG.REVIVE_COUNTDOWN;
  EventBus.emit(GameEvent.UNIT_DIED, { unit });
}
```

### 5.10.2 战后复活倒计时递减

```javascript
function onBattleEnd() {
  for (const unit of GameState.getPlayerUnits()) {
    if (!unit.isAlive && unit.reviveCountdown > 0) {
      unit.reviveCountdown--;
      if (unit.reviveCountdown === 0) {
        unit.hp = Math.floor(unit.maxHp * GAME_CONFIG.REVIVE_HP_RATE);
        unit.isAlive = true;
        EventBus.emit(GameEvent.UNIT_REVIVED, { unit, source: "countdown" });
      }
    }
  }
}
```

---

# 6. 渲染方案

## 6.1 混合渲染架构

采用 **Canvas 2D（战斗场景） + DOM/CSS（UI界面）** 混合渲染方案：

| 场景 | 渲染方式 | 原因 |
|------|----------|------|
| 主界面/开局/备战/结算/商店 | DOM + CSS | UI交互多（按钮/拖拽/浮窗），DOM更易实现 |
| 战斗场景 | Canvas 2D | 大量单位移动+动画，Canvas性能更好 |
| 战斗UI(血条/倍速/暂停) | DOM + CSS(叠在Canvas上) | 按钮交互，DOM更方便 |

### 6.1.1 Canvas战斗渲染器

```javascript
const BattleRenderer = {
  canvas: null,
  ctx: null,
  
  init(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext("2d");
    this.canvas.width = GAME_CONFIG.BATTLE_FIELD_WIDTH;
    this.canvas.height = GAME_CONFIG.BATTLE_FIELD_HEIGHT;
  },
  
  render(state) {
    const ctx = this.ctx;
    // 清空
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 绘制战场背景
    this.drawBackground(ctx);
    
    // 绘制所有存活单位
    for (const unit of [...state.allyUnits, ...state.enemyUnits]) {
      if (unit.unit.isAlive) {
        this.drawUnit(ctx, unit);
      }
    }
  },
  
  drawUnit(ctx, battleUnit) {
    const { x, y, unit, side } = battleUnit;
    const size = GAME_CONFIG.UNIT_RENDER_SIZE;
    
    // 单位圆形底色（我方=蓝，敌方=红）
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = side === "ally" ? "#4488ff" : "#ff4444";
    ctx.fill();
    
    // 等阶边框色
    ctx.strokeStyle = getTierColor(unit.tier || UnitTier.NORMAL);
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 单位名称(缩写)
    ctx.fillStyle = "#ffffff";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(unit.name.substring(0, 2), x, y + 3);
    
    // 血条
    this.drawHpBar(ctx, x, y - size / 2 - 6, size, 4, unit.hp / unit.maxHp);
  },
  
  drawHpBar(ctx, x, y, width, height, ratio) {
    ctx.fillStyle = "#333";
    ctx.fillRect(x - width / 2, y, width, height);
    ctx.fillStyle = ratio > 0.5 ? "#44ff44" : ratio > 0.25 ? "#ffaa00" : "#ff4444";
    ctx.fillRect(x - width / 2, y, width * Math.max(0, ratio), height);
  }
};
```

### 6.1.2 特效渲染器

```javascript
const EffectRenderer = {
  effects: [],  // {type, x, y, text, color, duration, elapsed}
  
  addDamageNumber(x, y, damage, isCrit, isDodged) {
    if (isDodged) {
      this.effects.push({ type: "text", x, y: y - 20, text: "MISS", color: "#aaa", duration: 0.8, elapsed: 0 });
    } else {
      const text = isCrit ? `${damage}!` : `${damage}`;
      const color = isCrit ? "#ffdd00" : "#ffffff";
      this.effects.push({ type: "text", x, y: y - 20, text, color, duration: 0.8, elapsed: 0, scale: isCrit ? 1.3 : 1.0 });
    }
  },
  
  render(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const eff = this.effects[i];
      eff.elapsed += dt;
      if (eff.elapsed >= eff.duration) {
        this.effects.splice(i, 1);
        continue;
      }
      const alpha = 1 - eff.elapsed / eff.duration;
      const offsetY = eff.elapsed * 30; // 上浮
      BattleRenderer.ctx.globalAlpha = alpha;
      BattleRenderer.ctx.fillStyle = eff.color;
      BattleRenderer.ctx.font = `${eff.scale ? 14 * eff.scale : 12}px sans-serif`;
      BattleRenderer.ctx.textAlign = "center";
      BattleRenderer.ctx.fillText(eff.text, eff.x, eff.y - offsetY);
      BattleRenderer.ctx.globalAlpha = 1;
    }
  }
};
```

---

## 6.2 国风视觉风格实现

### 6.2.1 CSS变量主题

```css
:root {
  /* 国风主色 */
  --ink-black: #1a1a2e;        /* 墨色(深蓝黑) */
  --ink-dark: #16213e;         /* 墨色深 */
  --vermilion: #c0392b;        /* 朱红 */
  --vermilion-light: #e74c3c;  /* 朱红浅 */
  --gold: #d4a017;             /* 金色 */
  --gold-light: #f1c40f;       /* 金色浅 */
  --jade: #27ae60;             /* 玉色(绿) */
  --purple: #8e44ad;           /* 紫色(传奇) */
  --orange: #e67e22;           /* 橙色(神话) */
  --paper: #f5e6c8;            /* 宣纸色 */
  --paper-dark: #e8d5a3;       /* 宣纸深 */
  
  /* 等阶颜色 */
  --tier-normal: #bdc3c7;      /* 普通(白) */
  --tier-scarce: #27ae60;      /* 稀少(绿) */
  --tier-legendary: #8e44ad;   /* 传奇(紫) */
  --tier-mythical: #e67e22;    /* 神话(橙) */
  
  /* 字体 */
  --font-title: "Ma Shan Zheng", "STKaiti", "KaiTi", serif;    /* 毛笔标题 */
  --font-body: "Noto Serif SC", "STSong", "SimSun", serif;     /* 宋体正文 */
  --font-ui: "Noto Sans SC", "Microsoft YaHei", sans-serif;    /* UI字体 */
  
  /* 装饰 */
  --border-gold: 2px solid var(--gold);
  --border-vermilion: 1px solid var(--vermilion);
  --shadow-gold: 0 0 10px rgba(212, 160, 23, 0.3);
}
```

### 6.2.2 国风UI组件

- **面板**：宣纸色底色 + 金色边框 + 圆角 + 微内阴影
- **按钮**：朱红底色 + 金色边框 + 悬停发光 + 按下加深
- **标题**：毛笔字体 + 金色 + 文字阴影
- **边框装饰**：CSS伪元素绘制角花/云纹
- **等阶标识**：左上角小方块颜色 + 名称着色
- **过渡动画**：淡入淡出 + 轻尺滑动

### 6.2.3 战场国风背景

Canvas绘制渐变背景：深墨色→墨蓝，底部添加山峦剪影或云雾效果（简单Path2D绘制）。

---

# 7. 状态管理方案

## 7.1 集中式状态管理

采用**单一GameState对象** + **EventBus事件驱动**方案：

1. 全局唯一的 `GameState` 对象存储所有运行时状态
2. 任何状态变更通过函数调用修改 `GameState`，同时触发对应EventBus事件
3. UI层监听事件，响应式更新DOM

```javascript
// 状态变更示例
function addGold(amount) {
  GameState.gold = Math.min(GAME_CONFIG.MAX_GOLD, GameState.gold + amount);
  EventBus.emit(GameEvent.GOLD_CHANGED, GameState.gold);
}

// UI层监听
EventBus.on(GameEvent.GOLD_CHANGED, (gold) => {
  document.getElementById("gold-display").textContent = gold;
});
```

## 7.2 视图切换管理

```javascript
const ViewManager = {
  currentView: null,
  
  switchTo(viewName) {
    // 隐藏所有视图
    document.querySelectorAll(".game-view").forEach(el => el.classList.add("hidden"));
    // 显示目标视图
    const target = document.getElementById(`view-${viewName}`);
    if (target) {
      target.classList.remove("hidden");
      // 过渡动画
      target.classList.add("fade-in");
      setTimeout(() => target.classList.remove("fade-in"), 300);
    }
    GameState.currentView = viewName;
    EventBus.emit(GameEvent.VIEW_SWITCH, viewName);
  }
};
```

---

# 8. 事件系统设计

## 8.1 EventBus实现

```javascript
const EventBus = {
  _handlers: {},
  
  on(event, handler, context) {
    if (!this._handlers[event]) this._handlers[event] = [];
    this._handlers[event].push({ handler, context: context || null });
  },
  
  off(event, handler) {
    if (!this._handlers[event]) return;
    this._handlers[event] = this._handlers[event].filter(h => h.handler !== handler);
  },
  
  emit(event, ...args) {
    if (!this._handlers[event]) return;
    for (const { handler, context } of this._handlers[event]) {
      handler.apply(context, args);
    }
  },
  
  once(event, handler, context) {
    const wrapper = (...args) => {
      handler.apply(context, args);
      this.off(event, wrapper);
    };
    this.on(event, wrapper, context);
  }
};
```

## 8.2 事件流图

```
玩家操作                  系统事件                    UI更新
────────────────────────────────────────────────────────────
点击"开始修行"   → GAME_START          → StartView.show()
点击"就此定夺"   → UNIT_CONFIRMED      → PrepView.show()
点击战斗节点     → BATTLE_START        → BattleView.show()
  ↓ (战斗中)
攻击命中         → UNIT_ATTACK         → EffectRenderer.addDamageNumber()
伤害生效         → UNIT_DAMAGED        → 更新血条
暴击             → UNIT_CRIT           → 特殊高亮+音效
闪避             → UNIT_MISS           → 显示"MISS"
单位死亡         → UNIT_DIED           → 从战场移除+灰显
  ↓ (战斗结束)
战斗结束         → BATTLE_END          → ResultView.show()
装备法宝         → ARTIFACT_EQUIP      → 更新属性面板
购买商品         → SHOP_BUY            → 更新金币+背包
招募选择         → RECRUIT_SELECT      → 其余选项禁用+选中单位加入队伍
待机单位点击     → IDLE_UNIT_CLICK     → 弹出单位详情浮窗
折叠切换         → FOLD_TOGGLE         → 展开/收起单位列表
```

---

# 9. 动画与视觉效果方案

## 9.1 CSS动画

| 动画 | 应用场景 | 实现方式 |
|------|----------|----------|
| 淡入淡出 | 视图切换 | `opacity` + `transition` |
| 滑入滑出 | 面板弹出 | `transform: translateX/Y` + `transition` |
| 缩放弹跳 | 获得稀有物品/招募选择 | `transform: scale` + `@keyframes` |
| 金光闪烁 | 传奇/神话品质展示 | `box-shadow` + `@keyframes` |
| 脉冲发光 | Boss预警 | `box-shadow` + `@keyframes` |
| 进度条填充 | 血条/关卡进度 | `width` + `transition` |
| 灰度 | 死亡单位 | `filter: grayscale(1)` |

## 9.2 Canvas动画

| 动画 | 应用场景 | 实现方式 |
|------|----------|----------|
| 单位移动 | 战场单位走位 | 每帧更新x/y坐标 |
| 攻击线 | 攻击时短暂连线 | 绘制Line+alpha渐隐 |
| 伤害数字 | 伤害/暴击/MISS | 上浮+淡出 |
| 暴击特效 | 暴击时 | 放大+金色闪光 |
| 死亡效果 | 单位死亡 | 缩小+淡出 |

## 9.3 帧动画与Sprite

Demo简化方案：单位不使用帧动画Sprite，以**圆形+名称缩写+血条**表示。等阶用边框颜色区分。后续扩展可添加简单的Sprite帧动画（idle/attack/death各3-5帧）。

---

# 10. 性能优化策略

## 10.1 战斗性能

| 优化项 | 策略 | 说明 |
|--------|------|------|
| **requestAnimationFrame** | 使用rAF驱动战斗循环 | 保证与屏幕刷新同步 |
| **空间分区** | 简单网格空间分区 | 减少最近敌人搜索复杂度(O(n)→O(1)) |
| **对象池** | DamageResult/BattleEffect对象池 | 减少GC压力 |
| **脏标记渲染** | 仅在状态变更时重绘 | Canvas局部重绘 |
| **倍速实现** | dt × speedMultiplier | 不跳帧，加速时间步进 |
| **离屏单位跳过** | 死亡单位不参与计算/渲染 | early return |

## 10.2 数据性能

| 优化项 | 策略 | 说明 |
|--------|------|------|
| **数据预加载** | 所有数据在游戏启动时一次性初始化 | 避免运行时IO |
| **查找表** | 法宝/单位以id为key的Map存储 | O(1)查找 |
| **缓存属性** | 法宝加成后属性缓存，变更时重算 | 避免每帧计算 |

## 10.3 DOM性能

| 优化项 | 策略 | 说明 |
|--------|------|------|
| **批量DOM操作** | 使用DocumentFragment | 减少重排重绘 |
| **事件委托** | 单位列表/商品列表使用事件委托 | 减少事件监听器数量 |
| **CSS硬件加速** | 动画元素添加`will-change` | GPU加速变换动画 |

---

# 11. 拖拽交互实现方案

## 11.1 拖拽系统

采用原生HTML5 Drag & Drop API + 触摸事件兼容方案：

| 拖拽场景 | 起点 | 目标 | 效果 |
|----------|------|------|------|
| 法宝装备 | 法宝图标 | 单位卡片/折叠行 | 装备法宝到单位（折叠行N>1时弹选择面板） |
| 法宝卸下 | 单位上法宝 | 法宝栏 | 卸下法宝回背包 |
| 出售拖拽 | 单位/法宝 | 出售区 | 出售获得金币 |

```javascript
// 拖拽管理器
const DragManager = {
  init() {
    // 鼠标拖拽
    document.addEventListener("dragstart", this.onDragStart);
    document.addEventListener("dragover", this.onDragOver);
    document.addEventListener("drop", this.onDrop);
    
    // 触摸拖拽(移动端兼容)
    document.addEventListener("touchstart", this.onTouchStart, { passive: false });
    document.addEventListener("touchmove", this.onTouchMove, { passive: false });
    document.addEventListener("touchend", this.onTouchEnd);
  },
  
  onDragStart(e) {
    const { dragType, dragData } = e.target.dataset;
    e.dataTransfer.setData("text/plain", JSON.stringify({ type: dragType, data: dragData }));
  },
  
  onDrop(e) {
    e.preventDefault();
    const payload = JSON.parse(e.dataTransfer.getData("text/plain"));
    const dropTarget = e.target.closest("[data-drop-zone]");
    if (!dropTarget) return;
    
    const zoneType = dropTarget.dataset.dropZone;
    handleDrop(payload, zoneType, dropTarget);
  }
};
```

---

# 12. 浮窗与提示系统

## 12.1 浮窗详情

```javascript
const Tooltip = {
  show(targetEl, contentHtml) {
    const tip = document.getElementById("tooltip");
    tip.innerHTML = contentHtml;
    tip.classList.remove("hidden");
    
    // 定位：在目标元素上方或右侧
    const rect = targetEl.getBoundingClientRect();
    tip.style.left = `${rect.right + 8}px`;
    tip.style.top = `${rect.top}px`;
  },
  
  hide() {
    document.getElementById("tooltip").classList.add("hidden");
  }
};

// 悬停绑定
document.querySelectorAll("[data-tooltip]").forEach(el => {
  el.addEventListener("mouseenter", () => Tooltip.show(el, getTooltipContent(el)));
  el.addEventListener("mouseleave", () => Tooltip.hide());
});
```

## 12.2 国风文案提示

| 场景 | 文案 |
|------|------|
| 金币不足 | "囊中羞涩，先去赚点盘缠吧" |
| 法宝栏已满 | "法宝栏已满，先处理一下吧" |
| 队伍已满 | "队伍已满，先送几个回去休息吧" |
| 重新随机次数用完 | "天机已尽，无法再测了" |
| 招募已选择 | "已选定一位弟子，其余无缘了" |

---

# 13. 架构总览图

```
┌──────────────────────────────────────────────────────────────┐
│                      万修列阵 HTML Demo                       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    表现层 (View)                        │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │  │
│  │  │ 主界 │ │ 开局 │ │ 备战 │ │ 战斗 │ │ 结算 │       │  │
│  │  │ 面   │ │ 界面 │ │ 界面 │ │ 界面 │ │ 界面 │       │  │
│  │  └──────┘ └──────┘ └──────┘ └──┬───┘ └──────┘       │  │
│  │                               │Canvas+DOM              │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐  │                       │  │
│  │  │ 商店 │ │ 浮窗 │ │ 拖拽 │  │                       │  │
│  │  │ 界面 │ │ 系统 │ │ 系统 │  │                       │  │
│  │  └──────┘ └──────┘ └──────┘  │                       │  │
│  └────────────────────────────────┴───────────────────────┘  │
│                                  │                           │
│  ┌───────────────────────────────┴───────────────────────┐  │
│  │                    控制层 (Controller)                    │  │
│  │  GameCtrl │ BattleCtrl │ ShopCtrl │ IdleCtrl │ RecruitCtrl│  │
│  └──────────────────────────┬────────────────────────────┘  │
│                              │                               │
│  ┌───────────────────────────┴────────────────────────────┐  │
│  │                    逻辑层 (Logic)                       │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐              │  │
│  │  │ Battle   │ │ Idle     │ │ Shop     │              │  │
│  │  │ Engine   │ │ Engine   │ │ Engine   │              │  │
│  │  └──────────┘ └──────────┘ └──────────┘              │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐              │  │
│  │  │ Damage   │ │ Enemy    │ │ Artifact  │              │  │
│  │  │ Calc     │ │ Generator│ │ Effect    │              │  │
│  │  └──────────┘ └──────────┘ └──────────┘              │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐              │  │
│  │  │ Unit AI  │ │ Revive   │ │ Stage    │              │  │
│  │  │          │ │ Manager  │ │ Manager  │              │  │
│  │  └──────────┘ └──────────┘ └──────────┘              │  │
│  │  ┌──────────┐ ┌──────────┐                            │  │
│  │  │ UnitFold │ │ Recruit  │                            │  │
│  │  │ Manager  │ │ Manager  │                            │  │
│  │  └──────────┘ └──────────┘                            │  │
│  └──────────────────────────┬────────────────────────────┘  │
│                              │                               │
│  ┌───────────────────────────┴────────────────────────────┐  │
│  │                    数据层 (Data)                        │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐              │  │
│  │  │ UnitDB   │ │ EnemyDB  │ │ Artifact │              │  │
│  │  │ (27种)   │ │ (35种)   │ │ DB(213个)│              │  │
│  │  └──────────┘ └──────────┘ └──────────┘              │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐              │  │
│  │  │ Stage    │ │ Game     │ │ EventBus │              │  │
│  │  │ Config   │ │ State    │ │          │              │  │
│  │  └──────────┘ └──────────┘ └──────────┘              │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  战斗渲染: Canvas2D  │  UI渲染: DOM+CSS  │  通信: EventBus │
└──────────────────────────────────────────────────────────────┘
```

---

# 14. 核心流程时序

## 14.1 完整游戏流程时序

```
主界面 ──[开始修行]──→ 开局 ──[确认]──→ 备战 ──[选择节点]──→ 战斗
  ↑                                                    │
  │                              ┌── 遗物战斗 ──── 法宝+金币+3选1 ─┐
  │                              ├── 普通战斗 ──── 金币+3选1 ─────┤
  │                              ├── 商店战斗 ──── 金币 → 商店 ───┤
  │                              └── Boss战 ───── 传奇法宝+金币 ──┤
  │                                                                 │
  │                           战后结算 ←───────────────────────────┘
  │                              │
  │                    ┌── 商店战斗 ──→ 商店 ──[离开]──→ 备战
  │                    └── 其他 ──────→ 备战
  │                                     │
  │                    ┌── 回合<20 ──→ 选择下一节点 → 战斗(循环)
  │                    └── 回合=20且Boss胜利 ──→ 通关界面
  │                                              │
  └──────────────[重新开始]──────────────────────┘
```

---

# 15. 技术风险与缓解

| 风险 | 影响 | 缓解策略 |
|------|------|----------|
| 213个法宝效果实现工作量大 | 开发周期长 | 分批实现：P0属性加成→P1概率触发→P2特殊效果 |
| Canvas渲染大量单位性能瓶颈 | 战斗卡顿 | 空间分区+对象池+脏标记+死亡单位跳过 |
| 单HTML文件代码量过大(>2MB) | 加载缓慢 | 数据使用紧凑格式(数组而非对象)，代码压缩 |
| 法宝效果间交互复杂 | 效果叠加异常 | 效果独立叠加，不互相依赖；属性变更触发重算 |
| 触摸设备拖拽兼容 | 移动端不可用 | 实现touch事件拖拽+长按弹出菜单替代方案 |
| 战斗AI寻路简单导致单位重叠 | 视觉混乱 | 添加碰撞排斥力(单位间最小间距) |
| 待机区域20个单位同时行走性能 | DOM更新频繁 | 使用CSS transform定位(避免layout)+requestAnimationFrame节流+单位数>15时缩小尺寸 |
| 折叠显示状态与单位列表同步 | 状态不一致 | 折叠管理器监听unit:recruited/unit:revived等事件自动刷新分组 |
| 招募选择防重复点击竞态 | 可能选2个 | RecruitManager.selectOption内使用selectionLocked原子锁+UI层立即灰禁 |

---

> **文档版本**：v1.1  
> **生成时间**：2026-05-03  
> **变更说明**：取消合成系统、新增单位折叠显示、修复招募唯一选择、新增待机区域  
> **下一步**：基于本设计文档开始编码实现
