# 全面优化计划：数值平衡 / UI清晰度 / 帧率解耦 / 数据表格化

## 一、优化总览

| 维度 | 目标 | 优先级 |
|------|------|--------|
| **数值表格化** | 所有数值提取到 JSON 配置表 | 🔴 P0 |
| **Canvas 清晰度** | 修复 HiDPI 模糊，支持窗口缩放 | 🔴 P0 |
| **FPS 解耦** | 游戏逻辑固定60tick，渲染独立 | 🔴 P0 |
| **数值平衡** | 修复文档-代码偏差 + 蒙特卡洛验证 | 🔴 P0 |
| **敌人/Boss 章节化** | 9章不同敌人池+Boss | 🟡 P1 |
| **UI 体验提升** | 多项优化 | 🟢 P2 |

---

## 二、详细方案

### 核心 1：数值表格化（所有数值走 JSON 配置表）

**当前问题**：数值散布在 7 个 `.ts` 文件中硬编码（`constants.ts`、`units.ts`、`enemies.ts`、`artifacts.ts`、`combat.ts`、`rewards.ts`、`synthesis.ts`），修改数值必须改代码。

**目标**：创建 5 张 JSON 配置表，运行时统一加载。

#### 新建配置文件

| 文件 | 内容 | 来源代码 |
|------|------|----------|
| `src/data/json/battle_config.json` | 伤害公式常量、Canvas尺寸、碰撞检测参数 | `constants.ts`、`combat.ts` |
| `src/data/json/units.json` | 27种单位×4等阶全部属性 + 等阶权重 | `units.ts` |
| `src/data/json/enemies.json` | 35种敌人属性 + 9章敌人池索引 + Boss索引 | `enemies.ts` |
| `src/data/json/artifacts.json` | 213个法宝完整数据（含简略描述和效果参数） | `artifacts.ts` |
| `src/data/json/rewards.json` | 奖励规则（各战斗类型的金币范围、法宝概率、招募权重） | `rewards.ts` |

#### 实现方式

```typescript
// src/state/DataManager.ts — 新增全局数据管理器
// 启动时 fetch 加载所有 JSON 表
// 提供静态方法：getUnit(), getEnemy(), getArtifact(), getBattleConfig(), getRewardRule()
```

- `units.ts` / `enemies.ts` / `artifacts.ts` / `constants.ts` 中的硬编码数据改为从 `DataManager` 读取
- 保留 TypeScript 接口定义在 `types/index.ts` 不动

---

### 核心 2：Canvas 清晰度修复

**当前问题**：
1. Canvas 硬编码 `1200×600` 像素，不处理 `devicePixelRatio`
2. 高 DPI 屏幕（如 2x 屏、Mac Retina）上 Canvas 模糊
3. Canvas 没有 CSS 自适应大小

**修复方案**（修改 2 个文件）：

#### `index.html`
- `<canvas>` 不设固定 `width/height`，由 JS 动态控制

#### `battle.ts` + `main.css`
- `render()` 开始时计算 `window.devicePixelRatio`
- `canvas.width = logicalWidth * dpr`, `canvas.height = logicalHeight * dpr`
- `canvas.style.width = logicalWidth + 'px'`, `canvas.style.height = logicalHeight + 'px'`
- `ctx.scale(dpr, dpr)` 保证绘制尺寸正确
- 监听窗口 `resize` 事件，自适应调整 Canvas 大小

#### `main.css`
- `#battle-canvas` 增加 `width: 100%; max-width: 1200px; height: auto` 样式

---

### 核心 3：帧率解耦（游戏 FPS vs 显示器 FPS）

**当前问题**：
- `requestAnimationFrame` 回调频率 = 显示器刷新率（60Hz/120Hz/144Hz）
- 游戏更新和渲染在同一回调中执行
- 高刷显示器上游戏运行更快 => 帧率相关逻辑错误

**修复方案**（修改 1 个文件）：

#### `battle.ts` — loop() 函数重写

```typescript
// 固定时间步方案
const FIXED_DT = 1/60;  // 60 tick/s
const MAX_FRAME_TIME = 0.1;  // 防止螺旋死锁

loop() {
  if (!this.running) return;
  const now = performance.now();
  let frameDt = (now - this.lt) / 1000;
  this.lt = now;
  if (frameDt > MAX_FRAME_TIME) frameDt = MAX_FRAME_TIME;

  // 累加器模式
  this.accumulator += frameDt * GS.bspeed;
  while (this.accumulator >= FIXED_DT) {
    if (!GS.bpaused && !this.over) this.update(FIXED_DT);
    this.accumulator -= FIXED_DT;
  }

  // 渲染在每一帧都执行，独立于更新次数
  this.render();
  this.af = requestAnimationFrame(() => this.loop());
}
```

**效果**：
- 游戏逻辑以固定 60 tick/s 运行（乘以倍速后）
- 渲染按显示器刷新率进行
- 144Hz 上单位移动速度与 60Hz 上完全一致
- 倍速仅影响逻辑更新频率，不影响渲染平滑度

---

### 核心 4：数值平衡修复（11 项偏差）

#### 4.1 已识别偏差修复

| # | 偏差项 | 当前值 | 目标值 | 修改文件 |
|---|--------|--------|--------|----------|
| 1 | 初始单位数 | 5个 | **3个**（降低到3个增加挑战性） | `StartView.ts:generateStartUnits()` |
| 2 | lv1属性倍数 | ×1.5 | **×1.0**（创建单位时去掉`1+0.5×lv`的lv倍数） | `synthesis.ts:createUnit()` |
| 3 | 开局弱化 | 0.8倍 | **0.9倍**（从80%提升到90%，因为初始单位少了） | `StartView.ts:L31-L34` |
| 4 | 普通战斗金币 | 50~100 | **80~150**（提高中位数） | `rewards.ts` 或新 JSON |
| 5 | 遗物战斗金币 | 60~100 | **100~200** | 同上 |
| 6 | Boss战斗金币 | 300~500 | **500~800** | 同上 |
| 7 | 敌人数量（早期） | 5~6 | **6~9** | `enemies.ts:genEnemies()` |
| 8 | 敌人数量（中期） | 6~8 | **8~12** | 同上 |
| 9 | 敌人数量（Boss小兵） | 10~12 | **12~15** | 同上 |
| 10 | 敌人池按章节 | 全同 | **各章不同**（见下方） | `enemies.ts:CEP` → 新JSON |
| 11 | Boss按章节 | 全同(22) | **9个不同Boss**（见下方） | `enemies.ts:CB` → 新JSON |

#### 4.2 章节敌人池设计

```
第1章(凡间):    毒蜂,山魅,狮妖,虎妖,鹅妖,羊妖 — 6种基础
第2章(幽冥):    阴魂系,鬼将,冥蛇,判官 — 鬼怪主题
第3章(妖界):    山魈,熊妖,狼妖,狼王 — 妖兽主题
第4章(龙宫):    水族系,独角兽妖,骏妖 — 水域主题
第5章(天庭外围): 精英混合池
第6章(蟠桃园):  强化怪物池
第7章(南天门):  高难度混合
第8章(凌霄殿):  精锐天兵
第9章(混沌):    混合最强怪物 + 特殊
```

#### 4.3 各章 Boss 设计

```
第1章 Boss: 马身鸭头兽 (已有 id=22) — 保留
第2章 Boss: 新增"幽冥鬼王" — HP:1000, ATK:70, DEF:40
第3章 Boss: 新增"妖界之王" — HP:1200, ATK:80, DEF:35
第4章 Boss: 新增"龙王" — HP:1500, ATK:60, DEF:50
第5章 Boss: 新增"天兵统领" — HP:1300, ATK:90, DEF:45
第6章 Boss: 新增"蟠桃大仙" — HP:1800, ATK:70, DEF:55
第7章 Boss: 新增"南天王" — HP:2000, ATK:85, DEF:60
第8章 Boss: 新增"玉帝化身" — HP:2500, ATK:100, DEF:70
第9章 Boss: 马身鸭头兽(终极) — HP:3500, ATK:120, DEF:80
```

#### 4.4 伤害公式微调（可选）

当前公式 `(atk - def*0.8) × 1.0 × rand(0.9~1.1)` 存在 **高防御单位近乎免疫** 的问题：
- atk=20 对 def=24 → 伤害 = (20-19.2)=0.8 → clamp 到 1
- 防御完全覆盖攻击时只能打1点血

**建议**：引入穿甲/保底系数：`Max(1, atk × 1.0 - def × 0.8) × rand(0.9~1.1)`，保持 `SKILL_C=1` 不变

---

### 核心 5：游戏平衡性蒙特卡洛模拟

使用 game-balance 技能的 Python 模拟脚本，验证整套数值体系的平衡性：

| 模拟项 | 参数 | 验证目标 |
|--------|------|----------|
| 第1章普通战斗 | 玩家3个单位vs敌人6~9 | 胜率 > 70% |
| 第5章Boss | 合成升级后vsBoss | 胜率 50%~60% |
| 第20章Boss | 满编队vs终极Boss | 胜率 40%~50% |
| 金币经济 | 20回合累积 | 足够买3~5个法宝 |

模拟脚本路径：`wanxiu-liezhen\balance_sim\`，生成可视化 HTML 报告。

---

### 核心 6：UI 体验提升

#### 6.1 战斗界面提升
| 优化项 | 说明 | 文件 |
|--------|------|------|
| Canvas自适应 | 根据窗口宽高动态调整，保持16:9比例 | `battle.ts` |
| 单位纹理 | 使用 Canvas 绘制更精细的单位图标（而非纯色圆） | `battle.ts:render()` |
| 背景多元化 | 按章节切换战斗背景色/网格样式 | `battle.ts:render()` |
| 血条常亮 | 阵亡单位的血条残影显示击杀者颜色 | `battle.ts:drawUnit()` |
| 伤害数字优化 | 暴击数字更大更闪，附带粒子效果 | `battle.ts:FX渲染` |

#### 6.2 备战界面提升
| 优化项 | 说明 | 文件 |
|--------|------|------|
| 单位详情面板 | 点击卡片显示完整属性面板（含法宝/buff） | `PrepareView.ts` |
| 合成预览 | 选中单位后预览合成结果属性 | `PrepareView.ts` |
| 章节背景 | 每章不同背景色/装饰 | `main.css` |

---

## 三、文件变更清单

| 文件 | 变更类型 | 变更说明 |
|------|----------|----------|
| **新建 `src/data/json/battle_config.json`** | 新增 | 战斗公式常量表 |
| **新建 `src/data/json/units.json`** | 新增 | 27种单位×4等阶属性表 |
| **新建 `src/data/json/enemies.json`** | 新增 | 35种敌人 + 章节池 + Boss索引表 |
| **新建 `src/data/json/artifacts.json`** | 新增 | 213个法宝完整数据表 |
| **新建 `src/data/json/rewards.json`** | 新增 | 奖励规则表 |
| **新建 `src/state/DataManager.ts`** | 新增 | JSON 数据全局加载器 |
| **新建 `balance_sim/` 目录** | 新增 | 平衡模拟脚本 |
| `src/data/constants.ts` | 修改 | 保留基础常量，删除可配置数值 |
| `src/data/units.ts` | 修改 | 改为从 DataManager 读取 |
| `src/data/enemies.ts` | 修改 | 改为从 DataManager 读取 + 章节池区分 + 9个Boss |
| `src/data/artifacts.ts` | 修改 | 改为从 DataManager 读取 + 恢复完整描述 |
| `src/engine/combat.ts` | 微调 | 可选的伤害公式穿甲修正 |
| `src/engine/rewards.ts` | 修改 | 改为从 DataManager 读取奖励规则 |
| `src/engine/synthesis.ts` | 修改 | lv1 倍率从×1.5改为×1.0 |
| `src/engine/battle.ts` | 大改 | 固定时间步 + Canvas DPR缩放 + 渲染增强 |
| `src/ui/views/BattleView.ts` | 修改 | Canvas 响应式尺寸调整 |
| `src/ui/views/StartView.ts` | 修改 | 初始单位5→3个，弱化0.8→0.9 |
| `src/ui/views/PrepareView.ts` | 小改 | 合成预览，Boss标识 |
| `src/ui/styles/main.css` | 修改 | Canvas 自适应样式，章节背景 |
| `index.html` | 小改 | Canvas 不设固定尺寸 |

---

## 四、执行顺序与风险

| 步骤 | 内容 | 依赖 | 风险 |
|------|------|------|------|
| 1 | 新建 JSON 配置表和 DataManager | 无 | 低 |
| 2 | units/enemies/artifacts 改用 DataManager | 步骤1 | 中（接口对齐） |
| 3 | Canvas 清晰度 + 帧率解耦 | 步骤1 | 中（渲染逻辑重写） |
| 4 | 数值平衡修复（11项偏差） | 步骤1+2 | 中（需多次验证） |
| 5 | 新增8个Boss+章节敌人池 | 步骤2 | 中（数值设计） |
| 6 | 奖励规则调整 | 步骤1 | 低 |
| 7 | UI 体验提升 | 所有 | 低 |
| 8 | 蒙特卡洛模拟验证 | 步骤4+5 | 需要 Python |

---

## 五、验收标准

1. **Run `npm run build` 构建成功，0 类型错误**
2. **Canvas 清晰度**: 在 2x/3x 屏上打开，文字和圆形没有锯齿模糊
3. **帧率解耦**: 浏览器 DevTools Performance 面板中，update() 与 render() 各自独立调用
4. **数值表格化**: 修改 `src/data/json/units.json` 中的 HP 值后重启游戏，单位血量变化
5. **章节区分**: 进入第2章后敌人种类与第1章不同，Boss 名称为"幽冥鬼王"
6. **平衡验证**: 完整打完第1章20回合，游戏体验流畅不卡数值（不碾压不刮痧）
