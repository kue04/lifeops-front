# LifeOps Front

[![CI](https://github.com/kue04/lifeops-front/actions/workflows/ci.yml/badge.svg)](https://github.com/kue04/lifeops-front/actions/workflows/ci.yml)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6)
![License](https://img.shields.io/badge/License-MIT-green)

LifeOps Agent 的 React 前端。把 Agent 的输入、流式执行过程、最终计划、路线、预算、反馈和历史记录做成可视化操作台，而不是一个简单的聊天页面。

后端仓库：[kue04/LifeOps](https://github.com/LifeOps)

## 功能页面

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/` | 规划工作台 | 输入自然语言目标，发起 Agent 规划 |
| `/runs/:traceId` | 执行页 | 通过 SSE 实时展示工具调用进度与节点状态 |
| `/plans/:traceId` | 计划详情 | 时间线、路线地图、预算、推荐依据、风险与确认动作 |
| `/profile` | 用户画像 | 偏好记忆与反馈结果 |
| `/history` | 历史记录 | 复盘过往任务 |
| `/audit` | 审计 | 运行与工具调用统计 |
| `/showcase` | 项目展示 | 面向面试官的系统介绍 |

## 核心亮点

- **SSE 流式渲染 Agent 过程**：通过 `EventSource` 订阅 `/app/runs/{trace_id}/events`，
  把 11 个图节点的中间状态（工具调用进度、候选评分、风险检查）实时推到前端。
- **全链路闭环**：输入 → 流式执行 → 计划详情 → 反馈 → 画像 → 历史复盘 → 审计。
- **类型完整**：`src/types/lifeops.ts` 与后端响应结构一一对应。
- **确认边界**：日历导出等写入型动作必须先由用户确认。

## 技术栈

React 19 · TypeScript · Vite 7 · React Router 7 · GSAP · lucide-react

## 快速开始

```bash
git clone https://github.com/kue04/lifeops-front.git
cd lifeops-front
npm install
npm run dev
```

构建生产版本：

```bash
npm run build
```

环境变量见 `.env.example`，其中 `VITE_LIFEOPS_API_BASE` 指向后端 FastAPI 地址（默认 `http://localhost:8000`）。

## Docker

仓库含 `Dockerfile` 与 `nginx.conf`，构建产物由 nginx 托管：

```bash
docker build -t lifeops-front .
docker run -p 8080:80 lifeops-front
```

## 已知局限

- `src/App.tsx` 仍是 3500+ 行的单文件，页面级组件待进一步拆分。
- 暂无前端自动化测试。
