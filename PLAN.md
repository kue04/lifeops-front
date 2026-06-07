# LifeOps 多页面前端展示台计划

## Summary
前端不做单页结果堆叠，而是做一个轻量多页面旅行规划产品。首页仍然是可用的规划工具，但生成结果后进入独立“计划详情页”，并提供路线、资料、预算、执行过程、历史计划等视图。

推荐技术栈：`Vite + React + TypeScript + React Router + lucide-react + CSS Modules/plain CSS`。

## App Structure
```text
frontend/
  src/
    main.tsx
    App.tsx
    routes/
      PlannerHome.tsx
      PlanDetail.tsx
      History.tsx
      ComparePlans.tsx
    components/
      layout/
        AppShell.tsx
        TopNav.tsx
        SideRail.tsx
      planner/
        PromptComposer.tsx
        PreferenceChips.tsx
        ClarificationCard.tsx
        LoadingJourney.tsx
      plan/
        PlanHero.tsx
        WeatherBrief.tsx
        RouteTimeline.tsx
        PlaceStoryCard.tsx
        BudgetBoard.tsx
        FoodStayGuide.tsx
        SourcesDrawer.tsx
        AgentProcessPanel.tsx
        ReminderStack.tsx
        ReplanComposer.tsx
      history/
        HistoryList.tsx
        PlanSnapshotCard.tsx
    api/
      lifeops.ts
    types/
      lifeops.ts
    styles/
      tokens.css
      base.css
      layout.css
      motion.css
```

## Pages
- `/`
  - 规划首页。
  - 左侧是自然语言输入，右侧是“今日灵感/最近计划/示例需求”。
  - 不是营销页，打开就能输入并生成。
  - 生成成功后跳转到 `/plans/:traceId`。
- `/plans/:traceId`
  - 计划详情页，核心用户页面。
  - 顶部是计划摘要，下面是分区式内容。
  - 页面内有 sticky 分段导航：`总览 / 路线 / 吃住 / 预算 / 来源 / 过程`。
- `/history`
  - 历史计划页。
  - 调用 `GET /history`，展示最近生成过的计划。
- `/compare`
  - 可选 MVP+ 页面。
  - 用于比较两次重规划结果，比如“500预算版”和“300预算版”。

## Plan Detail Layout
- `PlanHero`
  - 显示标题、城市、日期、预算、节奏、天气一句话。
  - 背景做轻艺术化“城市纸面地图纹理”，不用真实地图 SDK。
- `OverviewGrid`
  - 三个重点卡：
    - 天气节奏
    - 搜索依据
    - 预算使用
- `RouteTimeline`
  - 页面核心。
  - 纵向路线时间轴，每个地点是一张“旅行票根卡”。
  - 地点名称必须点击跳转 `map_url`。
  - 未确认票价显示暖色 badge。
- `FoodStayGuide`
  - 餐饮、住宿分栏。
  - 每个候选项可点击地图。
  - 没有候选时只给选择建议，不编造店名。
- `BudgetBoard`
  - 分段预算条：活动费、餐饮、交通。
  - 未确认票价单独列为“待确认费用”。
- `SourcesDrawer`
  - 右侧抽屉或底部面板。
  - 展示可点击搜索来源。
  - 搜索失败时显示温和 fallback 提示。
- `AgentProcessPanel`
  - 轻量执行过程。
  - 只展示步骤、人类可读摘要、工具名称。
  - 不展示原始 JSON。
- `ReplanComposer`
  - 固定在详情页底部或右侧。
  - 输入“太贵了 / 换轻松点 / 增加夜景”，调用 `/replan`。

## Interactions
- 首页输入：
  - 支持示例 chip 一键填入。
  - Enter/Ctrl+Enter 提交。
  - 提交后显示 `LoadingJourney`。
- 生成中：
  - 动画阶段：理解需求 → 查天气 → 搜索资料 → 筛地点 → 排路线 → 算预算。
  - 如果后端暂时不是流式，就前端用本地阶段动画等待接口返回。
- 澄清：
  - `need_clarification` 时不跳详情页。
  - 首页显示 `ClarificationCard`，用户补充后再次 `/plan`。
- 详情页导航：
  - 点击顶部分段导航滚动到对应区域。
  - 移动端变成横向 pill tabs。
- 来源抽屉：
  - 点击“查看依据”打开。
  - 每条来源显示标题、摘要、外链。
- 重规划：
  - `/replan` 返回新结果后生成新的详情状态。
  - 页面顶部显示“已基于上一版调整”。
- 历史：
  - `/history` 展示最近计划。
  - 点击历史卡进入详情；若后端没有按 `task_id` 取详情，前端先从历史中的 `final_plan` 渲染快照。

## Artistic Direction
整体做“城市漫游手账 + 现代产品工具”。

- 背景：浅纸色底，轻颗粒纹理。
- 路线：细线时间轴，有一点手绘地图感。
- 地点卡：像克制的旅行票根，不做花哨插画。
- 天气：用柔和色块表达晴、雨、阴。
- 预算：像旅行账本，但保持清晰。
- 来源：像资料夹索引，可信、安静。
- 动画：
  - 页面进入 200ms fade + slight rise。
  - 路线线条从上到下展开。
  - 卡片 stagger reveal。
  - 预算条从 0 填充。
  - hover 时地点卡轻微抬起，外链图标浮现。

## Backend Preparation
后端最少需要准备这些内容：

```text
请为 LifeOps 前端多页面展示台稳定 API 对接。

1. api.py 增加 CORS：
   - 允许 http://localhost:5173
   - 建议用 FRONTEND_ORIGINS 环境变量配置。

2. 保持现有接口：
   - POST /plan
   - POST /replan
   - GET /history
   - GET /trace/{trace_id}

3. POST /plan 和 /replan 返回顶层字段：
   - status
   - trace_id
   - constraints
   - final_plan
   - assistant_message
   - execution_log
   - tool_results
   - question，仅 need_clarification 时需要

4. final_plan 稳定包含：
   - title
   - goal
   - date
   - weather
   - travel_research
   - itinerary
   - route
   - budget
   - lifestyle_places
   - alternatives
   - risks
   - fallbacks

5. itinerary 每项稳定包含：
   - time
   - place
   - area
   - address
   - map_url
   - play_points
   - reason
   - cost
   - cost_known
   - cost_note
   - evidence

6. travel_research.sources 每项包含：
   - title
   - url
   - content

7. budget 包含：
   - activity_cost
   - meal_budget
   - transport_budget
   - total
   - budget_limit
   - budget_usage
   - unknown_activity_cost_items

8. lifestyle_places 结构建议：
   - foods: [{ name, address, area, map_url }]
   - hotels: [{ name, address, area, map_url }]

9. execution_log 每项至少包含：
   - node
   - summary
   - tool_name 可选但建议补充

10. 不要伪造：
   - map_url 没有就返回 null
   - source url 没有就不放入 sources
   - 未确认票价必须 cost_known=false，并写 cost_note
   - 搜索失败时 sources=[] 且提供 note
```

## MVP Scope
第一版做 3 个页面：

- `/` 规划首页
- `/plans/:traceId` 计划详情页
- `/history` 历史计划页

暂不做：
- 真实地图 SDK
- 账号系统
- PDF 导出
- SSE 实时流
- 收藏夹和分享页

## Test Plan
- 后端：
  - `python -m py_compile api.py`
  - `python -m unittest tests.test_api_imports`
- 前端：
  - `npm run build`
  - 手动验证 `/`、`/plans/:traceId`、`/history`
- 验收重点：
  - 首页能直接规划。
  - 详情页不是纯文本，而是路线、天气、预算、来源分区展示。
  - 地点和来源都能点击。
  - 未确认票价明确标注。
  - 搜索失败提示温和。
  - Streamlit 调试台不受影响。
