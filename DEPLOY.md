# CI/CD 自动部署指南

## 已配置内容

- [x] GitHub Actions 工作流：[.github/workflows/deploy.yml](file:///f:/AIdemo/HuaWeiRogelike/.github/workflows/deploy.yml)
- [x] Git 忽略文件：[.gitignore](file:///f:/AIdemo/HuaWeiRogelike/.gitignore)
- [x] Vite 配置：[vite.config.ts](file:///f:/AIdemo/HuaWeiRogelike/wanxiu-liezhen/vite.config.ts)（已配置 `base: './'` 支持 GitHub Pages）

## 使用步骤

### 1. 初始化 Git 仓库

```bash
cd f:\AIdemo\HuaWeiRogelike
git init
git add .
git commit -m "Initial commit"
```

### 2. 创建 GitHub 仓库

- 在 GitHub 上创建一个新仓库
- 关联本地仓库：

```bash
git remote add origin https://github.com/你的用户名/仓库名.git
git branch -M main
git push -u origin main
```

### 3. 配置 GitHub Pages

1. 进入 GitHub 仓库的 **Settings** 页面
2. 点击左侧菜单的 **Pages**
3. 在 **Build and deployment** 部分：
   - Source 选择 **Deploy from a branch**
   - Branch 选择 **gh-pages**（工作流会自动创建）
   - 点击 **Save**

### 4. 触发部署

将代码推送到 `main` 或 `master` 分支会自动触发部署：

```bash
git push origin main
```

## 工作流说明

GitHub Actions 工作流会执行以下步骤：

1. 检出代码
2. 设置 Node.js 20 环境
3. 安装依赖（使用 npm ci 确保依赖版本一致）
4. 构建项目（`npm run build`）
5. 部署到 `gh-pages` 分支

## 访问网站

部署成功后，你的网站将可以通过以下地址访问：

```
https://你的用户名.github.io/仓库名/
```

## 注意事项

- 首次部署可能需要等待几分钟让 GitHub Pages 生效
- 确保 `vite.config.ts` 中的 `base` 配置正确（当前为 `'./'`，如果仓库名是子路径可能需要调整）
- 查看部署状态：GitHub 仓库 → Actions 标签页
