# GuoFeng Roguelike (国风肉鸽游戏)

一个基于 Vite + TypeScript 的国风肉鸽游戏项目。

## 项目特性

- 🎮 完整的游戏循环（准备 -> 战斗 -> 结算 -> 商店）
- ⚔️ 回合制战斗系统
- 🏪 神器（遗物）系统
- 🛒 商店购买机制
- 🎯 敌人与关卡设计
- 📦 CI/CD 自动部署到 GitHub Pages

## 技术栈

- **前端框架**: Vite + TypeScript
- **构建工具**: Vite 5.4
- **开发语言**: TypeScript 5.4

## 快速开始

```bash
# 进入项目目录
cd wanxiu-liezhen

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 项目结构

```
wanxiu-liezhen/
├── src/
│   ├── data/           # 游戏数据配置
│   ├── engine/         # 游戏引擎逻辑
│   ├── state/          # 状态管理
│   ├── types/          # TypeScript 类型定义
│   ├── ui/             # UI 组件与视图
│   └── utils/          # 工具函数
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## CI/CD 自动部署

项目已配置 GitHub Actions，当代码推送到 `main` 分支时会自动：

1. 安装依赖
2. 构建项目
3. 部署到 GitHub Pages

## 访问地址

部署成功后可以通过以下地址访问：
```
https://DcCheZhang.github.io/GuoFengRugelike/
```

## 开发说明

详细的部署指南请查看 [DEPLOY.md](file:///f:/AIdemo/HuaWeiRogelike/DEPLOY.md)。

## License

MIT
