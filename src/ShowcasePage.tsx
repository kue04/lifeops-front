import { ArrowUpRight, BadgeCheck, Brain, CalendarDays, Compass, Database, Gauge, MapPin, RouteIcon, Sparkles } from "lucide-react";

const highlights = [
  { label: "Agent 编排", value: "LangGraph", icon: Brain },
  { label: "外部工具", value: "天气 / 地图 / 搜索", icon: Compass },
  { label: "可追踪性", value: "SQLite Trace", icon: Database },
  { label: "交互体验", value: "React + GSAP", icon: Sparkles },
];

const capabilities = [
  "自然语言拆解时间、地点、预算、偏好和限制",
  "按场景调用天气、地点、路线、搜索和预算工具",
  "输出可执行日程、路线依据、风险提醒和后续确认动作",
  "记录 trace、历史计划和用户反馈，便于复盘 Agent 决策",
];

const interviewPoints = [
  "把 LLM 从单次问答推进到“意图识别 -> 工具调用 -> 评分 -> 反思 -> 落库”的工程闭环。",
  "前端不是简单聊天框，而是把 Agent 中间状态、路线、证据和可确认动作可视化。",
  "默认支持无 Key 的 OpenMeteo / OSM 兜底，也预留在线搜索和高德能力。",
];

export function ShowcasePage() {
  return (
    <main className="showcasePage">
      <section className="showcaseHero">
        <div className="showcaseHeroCopy">
          <span className="showcaseEyebrow"><BadgeCheck size={16} /> 面试项目展示</span>
          <h1>LifeOps：面向真实生活任务的 AI Agent 规划系统</h1>
          <p>
            这是一个生活助理型 Agent 项目。用户只需要说一句模糊需求，系统会抽取约束、选择工具链、生成计划、
            评估风险并留下可追踪的执行记录，展示的是 LLM 应用层工程能力，而不是单纯 Prompt Demo。
          </p>
          <div className="showcaseActions">
            <a href="https://github.com/kue04" target="_blank" rel="noreferrer">
              GitHub 主页 <ArrowUpRight size={17} />
            </a>
            <a href="/" className="secondaryShowcaseAction">
              进入系统 <RouteIcon size={17} />
            </a>
          </div>
        </div>
        <div className="showcaseBoard" aria-label="LifeOps 架构概览">
          <div className="routeCard active">
            <MapPin size={18} />
            <span>用户目标</span>
            <b>杭州一日轻松游，预算 500</b>
          </div>
          <div className="routeConnector" />
          <div className="routeCard">
            <Brain size={18} />
            <span>Agent 决策</span>
            <b>约束抽取 + 工具路由 + 候选评分</b>
          </div>
          <div className="routeConnector" />
          <div className="routeCard">
            <CalendarDays size={18} />
            <span>最终交付</span>
            <b>时间线、路线、预算、依据、风险</b>
          </div>
        </div>
      </section>

      <section className="showcaseMetrics">
        {highlights.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label}>
              <Icon size={20} />
              <span>{item.label}</span>
              <b>{item.value}</b>
            </article>
          );
        })}
      </section>

      <section className="showcaseContent">
        <div>
          <span className="showcaseEyebrow"><Gauge size={16} /> 系统能力</span>
          <h2>从一句需求到一份可执行计划</h2>
          <ul>
            {capabilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <span className="showcaseEyebrow"><Sparkles size={16} /> 面试亮点</span>
          <h2>我希望面试官看到什么</h2>
          <div className="showcaseNotes">
            {interviewPoints.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
