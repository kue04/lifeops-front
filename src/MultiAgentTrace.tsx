import { BadgeCheck, Bot, GitBranch, ShieldCheck, TriangleAlert } from "lucide-react";

import type { AgentRunRecord, AgentTask, PlanResponse } from "./types/lifeops";


export function MultiAgentTrace({ result }: { result: PlanResponse }) {
  const plan = result.final_plan;
  const planner = result.planner_meta || plan?.planner_meta;
  const tasks = result.agent_tasks || plan?.agent_tasks || [];
  const runs = result.agent_runs || plan?.agent_runs || [];
  const critic = result.critic || plan?.critic;
  if (!planner && !tasks.length && !runs.length && !critic) return null;

  return (
    <section className="multiAgentTrace panel">
      <div className="multiAgentTraceHead">
        <div>
          <span className="multiAgentKicker"><GitBranch size={15} /> Multi-Agent orchestration</span>
          <h2>Supervisor · Specialist · Critic</h2>
        </div>
        <span className={`plannerSource ${planner?.source === "llm" ? "llm" : "fallback"}`}>
          {planner?.source === "llm" ? "LLM Supervisor" : "规则回退"}
        </span>
      </div>

      <div className="supervisorBrief">
        <Bot size={20} />
        <div>
          <b>Supervisor 决策</b>
          <p>{planner?.strategy || "按意图合同委派专项 Agent，并合并结构化提案。"}</p>
          {planner?.fallback_reason && <small>回退原因：{planner.fallback_reason}</small>}
          {planner?.validation_errors?.map((item) => <small key={item}>{item}</small>)}
        </div>
      </div>

      <div className="agentDelegationGrid">
        {tasks.map((task) => (
          <AgentCard key={task.task_id} task={task} run={latestRun(task, runs)} />
        ))}
      </div>

      {critic && (
        <div className={`criticBrief ${critic.passed ? "passed" : "attention"}`}>
          {critic.passed ? <ShieldCheck size={20} /> : <TriangleAlert size={20} />}
          <div>
            <b>Critic：{critic.passed ? "检查通过" : actionLabel(critic.next_action)}</b>
            <p>{critic.review || "已检查任务覆盖、预算、工具权限和计划可执行性。"}</p>
            {critic.issues.map((issue) => (
              <small key={`${issue.code}-${issue.message}`}>{issue.agent ? `${agentLabel(issue.agent)}：` : ""}{issue.message}</small>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}


function AgentCard({ task, run }: { task: AgentTask; run?: AgentRunRecord }) {
  const status = run?.status || "pending";
  return (
    <article className={`specialistCard ${status}`}>
      <header>
        <span>{agentLabel(task.agent)}</span>
        <i>{statusLabel(status)}</i>
      </header>
      <p>{task.objective}</p>
      <div className="agentToolChips">
        {(run?.tools_used || []).map((tool) => <span key={tool}>{tool}</span>)}
        {!run?.tools_used?.length && <small>等待执行记录</small>}
      </div>
      <footer>
        <span>{run?.latency_ms ?? 0} ms</span>
        {Boolean(run?.revision_round) && <span>修订轮次 {run?.revision_round}</span>}
      </footer>
      {run?.warnings?.map((warning) => <small className="agentWarning" key={warning}>{warning}</small>)}
      {status === "success" && <BadgeCheck className="agentStatusIcon" size={18} />}
    </article>
  );
}


function latestRun(task: AgentTask, runs: AgentRunRecord[]) {
  return [...runs].reverse().find((item) => item.task_id === task.task_id || item.agent === task.agent);
}


function agentLabel(agent: string) {
  return ({ travel: "Travel Agent", meal: "Meal Agent", errand: "Errand Agent", todo: "Todo Agent" } as Record<string, string>)[agent] || agent;
}


function statusLabel(status: string) {
  return ({ success: "完成", degraded: "降级完成", blocked: "阻塞", pending: "等待" } as Record<string, string>)[status] || status;
}


function actionLabel(action: string) {
  return ({ revise: "要求定向修订", ask_user: "需要用户补充", final: "允许输出" } as Record<string, string>)[action] || action;
}
