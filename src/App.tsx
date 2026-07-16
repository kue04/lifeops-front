import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  AlertCircle,
  ArrowUpRight,
  BadgeCheck,
  Brain,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  CloudSun,
  Compass,
  Download,
  FileSearch,
  Gauge,
  Heart,
  History,
  Loader2,
  MapPin,
  Minus,
  NotebookTabs,
  Plus,
  ReceiptText,
  RouteIcon,
  Search,
  Send,
  Settings,
  Share2,
  Sparkles,
  Star,
  TrendingUp,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { ShowcasePage } from "./ShowcasePage";
import { MultiAgentTrace } from "./MultiAgentTrace";
import {
  cachePlan,
  cacheRunEvents,
  confirmPlanAction,
  exportCalendarIcs,
  getAppAudit,
  getAppMe,
  getHistory,
  getHistoryItem,
  getProfile,
  getProviderHealth,
  getRunStatus,
  readCachedPlan,
  readCachedRunEvents,
  runEventsUrl,
  startPlanRun,
  submitFeedback,
  type PlanRequestContext,
} from "./api/lifeops";
import type { AppAuditItem, AppMeResponse, ExecutionLogItem, FinalPlan, HistoryItem, ItineraryItem, PlanFeedbackPayload, PlanResponse, ProfileResponse, ProviderHealthResponse, QualityScore, RunEvent } from "./types/lifeops";

type AppSettings = {
  defaultCity: string;
  preferences: string;
  avoid: string;
  pace: "轻松" | "中等" | "紧凑";
  theme: "system" | "light" | "dark";
};

type MemoryOverrides = NonNullable<PlanRequestContext["memory_overrides"]>;
type MemoryResolution = {
  applied_likes?: string[];
  applied_dislikes?: string[];
  suppressed_likes?: Array<string | { value?: string; reason?: string }>;
  suppressed_dislikes?: Array<string | { value?: string; reason?: string }>;
  source?: string;
};
type RunStepState = RunEvent & { stepKey: string; startedAt?: string; finishedAt?: string };
type ToolStepState = RunEvent & { output_summary?: unknown; preview_items?: unknown[] };
type ConfirmedActionState = { type: string; label: string; execution: string; confirmationId: string };

const SETTINGS_KEY = "lifeops:settings";
const HISTORY_PAGE_SIZE = 10;

const defaultSettings: AppSettings = {
  defaultCity: "杭州",
  preferences: "展览、咖啡、夜景、轻松路线",
  avoid: "太赶、排队太久、无依据的票价",
  pace: "轻松",
  theme: "system",
};

const examples = [
  "这周六我想在杭州轻松玩一天，预算 500，喜欢咖啡、展览和夜景，不想太累。",
  "明天下午从当前位置出发，取快递、买生日礼物、顺便吃晚饭，帮我排最省时间路线。",
  "今晚 7 点后在西湖附近找一家适合两个人聊天的餐厅，预算 300，避开太吵的店。",
  "把我今天要做的事拆成时间块：写周报、预约体检、整理发票、晚上健身。",
];

const homeCapabilities = [
  { title: "出行计划", text: "天气、地点、路线、预算和来源一起看。" },
  { title: "跑腿路线", text: "多件事按时间、距离和顺路程度排序。" },
  { title: "餐饮选择", text: "按位置、预算、场景和避雷条件筛候选。" },
  { title: "待办拆解", text: "把模糊任务拆成时间块和确认动作。" },
];

const homeWorkflow = [
  { title: "读懂一句话", text: "先把时间、地点、预算、偏好和限制拆成可执行语义。" },
  { title: "选择工具链", text: "按场景决定查天气、走路线、筛餐厅还是拆待办。" },
  { title: "排出节奏", text: "把候选放进同一条时间线，压掉重复和不顺路的安排。" },
  { title: "留下依据", text: "结果页展示动作、风险、工具过程和可确认的下一步。" },
];

const homeRevealPhrases = ["目标", "时间", "预算", "位置", "偏好", "限制", "路线", "确认动作"];

function App() {
  const [settings, setSettings] = useState<AppSettings>(() => readSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [appMe, setAppMe] = useState<AppMeResponse | null>(null);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    if (settings.theme === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.dataset.theme = settings.theme;
    }
  }, [settings]);

  useEffect(() => {
    getAppMe().then(setAppMe).catch(() => undefined);
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brandMark">L</span>
          <span>LifeOps</span>
        </Link>
        <div className="topActions">
          <nav>
            <NavLink to="/">规划</NavLink>
            <NavLink to="/profile">画像</NavLink>
            <NavLink to="/history">历史</NavLink>
            <NavLink to="/audit">审计</NavLink>
            <NavLink to="/showcase">展示</NavLink>
          </nav>
          <div className="identityPill" title={appMe ? `当前用户：${appMe.user_id}` : "正在读取当前用户"}>
            <UserRound size={15} />
            <span>{appMe?.role === "operator_admin" ? "运营管理员" : "普通用户"}</span>
          </div>
          <button className="iconButton" onClick={() => setSettingsOpen(true)} aria-label="打开设置">
            <Settings size={18} />
          </button>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<PlannerHome settings={settings} />} />
        <Route path="/runs/:traceId" element={<RunPage />} />
        <Route path="/plans/:traceId" element={<PlanDetail />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/showcase" element={<ShowcasePage />} />
      </Routes>
      {settingsOpen && (
        <SettingsDrawer
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={(next) => {
            setSettings(next);
            setSettingsOpen(false);
          }}
        />
      )}
    </div>
  );
}

function PlannerHome({ settings }: { settings: AppSettings }) {
  const navigate = useNavigate();
  const homeRef = useRef<HTMLElement | null>(null);
  const [input, setInput] = useState(examples[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [profileError, setProfileError] = useState("");
  const [disabledLikes, setDisabledLikes] = useState<string[]>([]);
  const [disabledDislikes, setDisabledDislikes] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    getProfile()
      .then((next) => {
        if (!cancelled) setProfile(next);
      })
      .catch((err) => {
        if (!cancelled) setProfileError(err instanceof Error ? err.message : "画像读取失败");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const root = homeRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      gsap.fromTo(
        ".homeMotion",
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: "power3.out" }
      );
      gsap.fromTo(
        ".scrubWord",
        { opacity: 0.16, y: 14 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.03,
          ease: "none",
          scrollTrigger: {
            trigger: ".homeReveal",
            start: "top 78%",
            end: "bottom 55%",
            scrub: true,
          },
        }
      );
      gsap.fromTo(
        ".homeVisual img",
        { opacity: 0.72, scale: 0.88 },
        {
          opacity: 1,
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: ".homeVisual",
            start: "top 72%",
            end: "bottom top",
            scrub: true,
          },
        }
      );
      gsap.to(".homeMarqueeTrack", { xPercent: -50, duration: 28, ease: "none", repeat: -1 });
    }, root);

    return () => context.revert();
  }, []);

  const sessionLikes = splitPreferenceText(settings.preferences);
  const sessionDislikes = splitPreferenceText(settings.avoid);
  const memoryLikes = uniqueStrings([...(profile?.profile.likes || []), ...sessionLikes]);
  const memoryDislikes = uniqueStrings([...(profile?.profile.dislikes || []), ...sessionDislikes]);
  const explicitConstraints = extractExplicitConstraints(input);

  async function submit() {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const memoryOverrides = buildMemoryOverrides({
        disabledLikes,
        disabledDislikes,
      });
      const requestContext = await buildRequestContext(input.trim(), settings.defaultCity, memoryOverrides);
      const result = await startPlanRun(input.trim(), undefined, requestContext);
      navigate(`/runs/${result.trace_id}`, { state: { input: input.trim() } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败，请确认后端服务是否启动。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main ref={homeRef} className="homeGrid pageEnter">
      <section className="homeHero">
        <div className="homeHeroCopy homeMotion">
          <div className="sectionKicker homeKicker">
            <Sparkles size={16} /> 生活任务规划 Agent
          </div>
          <h1>
            把生活任务
            <span className="inlineScene" aria-hidden="true" />
            排成清晰路线。
          </h1>
          <p className="muted homeLead">
            直接写目标、时间、预算、当前位置、偏好和限制，LifeOps 会先识别任务类型，再调用合适工具生成结构化结果。
          </p>
          <div className="homeHeroActions">
            <a className="primaryButton" href="#planner-composer">
              开始规划 <ArrowUpRight size={18} />
            </a>
            <span className="settingsHint">
              <MapPin size={16} />
              默认地点：{settings.defaultCity || "未设置"}
            </span>
          </div>
        </div>
        <div className="homeVisual homeMotion" aria-hidden="true">
          <img src="https://picsum.photos/seed/lifeops-city-map/900/1100" alt="" />
          <div className="routeGlass">
            <span>目标识别</span>
            <b>咖啡 · 展览 · 夜景</b>
            <i />
            <span>执行路线</span>
            <b>顺路优先 · 节奏轻松</b>
          </div>
        </div>
      </section>

      <section id="planner-composer" className="composer homeMotion">
        <div className="composerTop">
          <div>
            <span>输入工作台</span>
            <h2>把你脑子里的“今天要做什么”，直接丢进来。</h2>
          </div>
          <Brain size={24} />
        </div>
        <div className="promptDeck">
          <div className="promptDeckHead">
            <h3>可以直接这样问</h3>
            <div className="homeMarquee" aria-hidden="true">
              <div className="homeMarqueeTrack">
                {[...homeRevealPhrases, ...homeRevealPhrases].map((item, index) => (
                  <span key={`${item}-${index}`}>{item}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="inspirationStrip">
            {examples.map((item) => (
              <button key={item} onClick={() => setInput(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") submit();
          }}
          placeholder="例如：明天下午从当前位置出发，先取快递，再买生日礼物，最后找一家安静餐厅吃饭；预算 300，避开排队太久的店。"
        />
        <div className="composerSubmit">
          <button className="primaryButton" onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
            {loading ? "正在启动" : "生成计划"}
          </button>
          <span>本次输入会优先覆盖长期画像。</span>
        </div>
        {error && <div className="error">{error}</div>}
        {loading && <LoadingJourney />}
        <div className="miniPanel">
          <NotebookTabs size={18} />
          <span>结果页会展示任务清单、路线、时间块、确认动作、风险和工具执行过程。</span>
        </div>
        <MemoryPlanningPanel
          likes={memoryLikes}
          dislikes={memoryDislikes}
          profileError={profileError}
          disabledLikes={disabledLikes}
          disabledDislikes={disabledDislikes}
          explicitConstraints={explicitConstraints}
          onToggleLike={(item) => setDisabledLikes((current) => toggleString(current, item))}
          onToggleDislike={(item) => setDisabledDislikes((current) => toggleString(current, item))}
        />
      </section>

      <section className="homeBento homeMotion">
        <article className="homeBentoCard homeBentoWide homeReveal">
          <Compass size={22} />
          <h2>
            {homeRevealPhrases.map((word) => (
              <span className="scrubWord" key={word}>{word}</span>
            ))}
          </h2>
          <p>把分散的信息压成一条可以立刻执行的安排，而不是给你一堆松散建议。</p>
        </article>
        <article className="homeBentoCard homeBentoTall">
          {homeWorkflow.map((item) => (
            <div key={item.title}>
              <b>{item.title}</b>
              <span>{item.text}</span>
            </div>
          ))}
        </article>
        {homeCapabilities.slice(0, 3).map((item) => (
          <article className="homeBentoCard compact" key={item.title}>
            <b>{item.title}</b>
            <span>{item.text}</span>
          </article>
        ))}
      </section>

      <section className="homeFinalCta homeMotion">
        <h2>少一点反复权衡，多一点可执行的下一步。</h2>
        <a className="primaryButton" href="#planner-composer">开始安排今天</a>
      </section>
    </main>
  );
}

function MemoryPlanningPanel({
  likes,
  dislikes,
  profileError,
  disabledLikes,
  disabledDislikes,
  explicitConstraints,
  onToggleLike,
  onToggleDislike,
}: {
  likes: string[];
  dislikes: string[];
  profileError: string;
  disabledLikes: string[];
  disabledDislikes: string[];
  explicitConstraints: string[];
  onToggleLike: (item: string) => void;
  onToggleDislike: (item: string) => void;
}) {
  const visibleLikes = likes.slice(0, 8);
  const visibleDislikes = dislikes.slice(0, 8);

  return (
    <section className="memoryPlanner">
      <div className="memoryPlannerHead">
        <div>
          <strong>本次记忆参与</strong>
          <span>长期画像只作默认倾向，本次输入和临时开关优先。</span>
        </div>
        {profileError && <small>未读取到后端画像，仍可按输入规划。</small>}
      </div>
      <div className="memoryPlannerGrid">
        <div>
          <b>会参考的偏好</b>
          <MemoryToggleList items={visibleLikes} disabledItems={disabledLikes} empty="暂无喜欢项" onToggle={onToggleLike} />
        </div>
        <div>
          <b>会避开的内容</b>
          <MemoryToggleList items={visibleDislikes} disabledItems={disabledDislikes} empty="暂无避开项" onToggle={onToggleDislike} />
        </div>
      </div>
      <div className="explicitConstraints">
        <span>本次明确限制</span>
        {explicitConstraints.length ? explicitConstraints.map((item) => <b key={item}>{item}</b>) : <small>输入里出现“不要、避开、不想”等表达时会在这里提示。</small>}
      </div>
    </section>
  );
}

function MemoryToggleList({ items, disabledItems, empty, onToggle }: { items: string[]; disabledItems: string[]; empty: string; onToggle: (item: string) => void }) {
  if (!items.length) return <p>{empty}</p>;
  return (
    <div className="memoryToggleList">
      {items.map((item) => {
        const disabled = disabledItems.includes(item);
        return (
          <button key={item} className={disabled ? "ignored" : ""} onClick={() => onToggle(item)} type="button">
            <span>{item}</span>
            <small>{disabled ? "本次忽略" : "启用"}</small>
          </button>
        );
      })}
    </div>
  );
}

function SettingsDrawer({ settings, onClose, onSave }: { settings: AppSettings; onClose: () => void; onSave: (settings: AppSettings) => void }) {
  const [draft, setDraft] = useState(settings);

  return (
    <div className="settingsOverlay" role="dialog" aria-modal="true" aria-label="设置">
      <div className="settingsPanel">
        <div className="settingsHeader">
          <div>
            <span className="sectionKicker">个人设置</span>
            <h2>默认值和偏好</h2>
          </div>
          <button className="iconButton" onClick={onClose} aria-label="关闭设置">
            <X size={18} />
          </button>
        </div>
        <label className="field">
          <span>默认地点</span>
          <input value={draft.defaultCity} onChange={(event) => setDraft({ ...draft, defaultCity: event.target.value })} />
          <small>仅当本次没有明确目标地点时作为城市兜底。</small>
        </label>
        <label className="field">
          <span>个人喜好</span>
          <textarea className="settingsTextarea" value={draft.preferences} onChange={(event) => setDraft({ ...draft, preferences: event.target.value })} />
          <small>作为本地默认偏好参与规划；本次输入或首页临时开关会优先覆盖。</small>
        </label>
        <label className="field">
          <span>尽量避免</span>
          <textarea className="settingsTextarea short" value={draft.avoid} onChange={(event) => setDraft({ ...draft, avoid: event.target.value })} />
          <small>作为默认避开项参与规划；如果本次明确想要某项，会以本次输入为准。</small>
        </label>
        <div className="field">
          <span>默认节奏</span>
          <select value={draft.pace} onChange={(event) => setDraft({ ...draft, pace: event.target.value as AppSettings["pace"] })}>
            <option value="轻松">轻松</option>
            <option value="中等">中等</option>
            <option value="紧凑">紧凑</option>
          </select>
          <small>没有本次节奏要求时，作为画像里的默认节奏参考。</small>
        </div>
        <div className="field">
          <span>主题</span>
          <div className="segmented">
            {[
              ["system", "跟随系统"],
              ["light", "浅色"],
              ["dark", "深色"],
            ].map(([value, label]) => (
              <button key={value} className={draft.theme === value ? "selected" : ""} onClick={() => setDraft({ ...draft, theme: value as AppSettings["theme"] })}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="settingsFooter">
          <button className="ghostButton" onClick={() => setDraft(defaultSettings)}>恢复默认</button>
          <button className="primaryButton" onClick={() => onSave(draft)}>保存设置</button>
        </div>
      </div>
    </div>
  );
}

function LoadingJourney() {
  return (
    <div className="journey">
      {["识别任务", "读取偏好", "调用工具", "筛选候选", "排时间块", "生成结果"].map((step, index) => (
        <span key={step} style={{ animationDelay: `${index * 140}ms` }}>{step}</span>
      ))}
    </div>
  );
}

function RunPage() {
  const { traceId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [events, setEvents] = useState<RunEvent[]>(() => readCachedRunEvents(traceId));
  const [result, setResult] = useState<PlanResponse | null>(() => readCachedPlan(traceId));
  const [error, setError] = useState("");
  const navigatedRef = useRef(false);
  const input = typeof location.state === "object" && location.state && "input" in location.state ? String(location.state.input) : "";

  useEffect(() => {
    let closed = false;

    function handleRunResult(nextResult: PlanResponse) {
      const trace = nextResult.trace_id || traceId;
      if (nextResult.status === "need_clarification") return;
      if (!trace || navigatedRef.current) return;
      navigatedRef.current = true;
      const resultWithTrace = { ...nextResult, trace_id: trace };
      cachePlan(resultWithTrace);
      window.setTimeout(() => navigate(`/plans/${resultWithTrace.task_id || trace}`, { replace: true, state: { result: resultWithTrace } }), 300);
    }

    function handleMissingRun() {
      const cached = readCachedPlan(traceId);
      if (cached) {
        setResult(cached);
        handleRunResult(cached);
        return;
      }
      setError("运行连接已中断，后端可能重启或任务内存已丢失。当前过程会保留，请重新发起一次规划。");
    }

    function applyRunStatus(status: Awaited<ReturnType<typeof getRunStatus>>) {
      if (status.status === "unknown") {
        handleMissingRun();
        return;
      }
      if (status.events?.length) {
        setEvents(status.events);
        cacheRunEvents(traceId, status.events);
      }
      if (status.result) {
        setResult(status.result);
        handleRunResult(status.result);
      }
      if (status.status === "error" && status.error) setError(status.error);
    }

    if (result) handleRunResult(result);

    getRunStatus(traceId).then((status) => {
      if (closed) return;
      applyRunStatus(status);
    }).catch((err) => {
      if (!closed) setError(err instanceof Error ? err.message : "运行状态读取失败");
    });

    const pollTimer = window.setInterval(() => {
      if (closed || navigatedRef.current) return;
      getRunStatus(traceId).then((status) => {
        if (closed) return;
        applyRunStatus(status);
      }).catch(() => undefined);
    }, 1500);

    const source = new EventSource(runEventsUrl(traceId));
    source.onmessage = (message) => {
      const event = JSON.parse(message.data) as RunEvent;
      if (isMissingRunEvent(event)) {
        handleMissingRun();
        source.close();
        return;
      }
      setEvents((items) => {
        const next = appendUniqueEvent(items, event);
        cacheRunEvents(traceId, next);
        return next;
      });
      if (event.status === "error") {
        setError(event.summary || "执行失败");
        source.close();
      }
      if (event.result) {
        setResult(event.result);
        handleRunResult(event.result);
        source.close();
      }
    };
    source.onerror = () => source.close();

    return () => {
      closed = true;
      window.clearInterval(pollTimer);
      source.close();
    };
  }, [navigate, traceId]);

  const progress = events.reduce((value, event) => Math.max(value, Number(event.progress || 0)), 0);

  return (
    <main className="runPage pageEnter">
      <section className="runHero">
        <div>
          <div className="sectionKicker">
            <Sparkles size={16} /> 正在执行 LifeOps 规划
          </div>
          <h1>先看过程，再看结果。</h1>
          <p className="muted">{input || "系统正在识别需求、调用工具并生成计划。"}</p>
        </div>
        <div className="progressCard">
          <span>{Math.min(progress, 100)}%</span>
          <div><i style={{ width: `${Math.min(progress, 100)}%` }} /></div>
        </div>
      </section>
      {error && <div className="error">{error}</div>}
      {result?.status === "need_clarification" && (
        <div className="notice">
          需要补充：{result.question || "还需要更多信息才能继续规划。"}
          <Link to="/" className="inlineAction">返回补充</Link>
        </div>
      )}
      <section className="panel">
        <SectionTitle icon={<NotebookTabs size={20} />} title="实时执行过程" />
        <AgentProcess events={events} keepResult={result?.status === "need_clarification"} />
      </section>
    </main>
  );
}

function PlanDetail() {
  const { traceId = "" } = useParams();
  const location = useLocation();
  const [planResult, setPlanResult] = useState<PlanResponse | null>(() => readStatePlan(location.state) || readCachedPlan(traceId));
  const [runEvents, setRunEvents] = useState<RunEvent[]>(() => readCachedRunEvents(traceId));
  const [replanText, setReplanText] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [shareFallbackText, setShareFallbackText] = useState("");
  const [confirmedAction, setConfirmedAction] = useState<ConfirmedActionState | null>(null);
  const [providerHealth, setProviderHealth] = useState<ProviderHealthResponse | null>(null);
  const navigate = useNavigate();
  const plan = hasPlanContent(planResult?.final_plan) ? planResult?.final_plan : null;
  const qualityWarnings = qualityWarningList(planResult);
  const runTraceId = planResult?.trace_id || traceId;
  const taskType = plan?.task_type || planResult?.constraints?.task_type;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [traceId]);

  useEffect(() => {
    const statePlan = readStatePlan(location.state);
    if (!statePlan) return;
    const next = { ...statePlan, trace_id: statePlan.trace_id || traceId };
    setPlanResult(next);
    cachePlan(next);
  }, [location.state, traceId]);

  useEffect(() => {
    if (!traceId || hasPlanContent(planResult?.final_plan)) return;
    let cancelled = false;
    function loadHistoryDetail() {
      return getHistoryItem(traceId).then((history) => {
        if (cancelled || !history.result) return;
        const next = { ...history.result, trace_id: history.result.trace_id || traceId };
        setPlanResult(next);
        cachePlan(next);
      });
    }
    getRunStatus(runTraceId).then((status) => {
      if (cancelled) return;
      if (!status.result) {
        void loadHistoryDetail();
        return;
      }
      const next = { ...status.result, trace_id: status.result.trace_id || runTraceId };
      setPlanResult(next);
      cachePlan(next);
      if (status.events?.length) {
        setRunEvents(status.events);
        cacheRunEvents(runTraceId, status.events);
      }
    }).catch(() => void loadHistoryDetail().catch(() => undefined));
    return () => {
      cancelled = true;
    };
  }, [planResult?.final_plan, runTraceId, traceId]);

  useEffect(() => {
    if (!runTraceId || runEvents.length) return;
    const cachedEvents = readCachedRunEvents(runTraceId);
    if (cachedEvents.length) {
      setRunEvents(cachedEvents);
      return;
    }
    let cancelled = false;
    getRunStatus(runTraceId).then((status) => {
      if (cancelled || !status.events?.length) return;
      setRunEvents(status.events);
      cacheRunEvents(runTraceId, status.events);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [runEvents.length, runTraceId]);

  useEffect(() => {
    let cancelled = false;
    getProviderHealth()
      .then((health) => {
        if (!cancelled) setProviderHealth(health);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitReplan() {
    if (!replanText.trim() || !planResult || loading) return;
    setLoading(true);
    try {
      const nextInput = replanText.trim();
      const requestContext = await buildRequestContext(nextInput, readSettings().defaultCity);
      const result = await startPlanRun(nextInput, planResult, requestContext);
      setReplanText("");
      navigate(`/runs/${result.trace_id}`, { state: { input: nextInput, previous: traceId } });
    } finally {
      setLoading(false);
    }
  }

  function downloadPlanDocument() {
    if (!plan || !planResult) return;
    setActionMessage("");
    setShareFallbackText("");
    try {
      const html = buildPlanDocumentHtml(plan, planResult);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${plan.date ? `lifeops_plan_${String(plan.date).slice(0, 10).replace(/-/g, "")}` : "lifeops_plan"}.html`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setActionMessage("已下载可打印行程单，打开后也可以保存为 PDF。");
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "导出失败");
    }
  }

  async function downloadCalendarFile() {
    if (!plan || !confirmedAction?.confirmationId) {
      setActionMessage("请先确认导出日历动作。");
      return;
    }
    setActionMessage("");
    setShareFallbackText("");
    try {
      const blob = await exportCalendarIcs(plan, confirmedAction.confirmationId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${plan.date ? `lifeops_plan_${String(plan.date).slice(0, 10).replace(/-/g, "")}` : "lifeops_plan"}.ics`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setActionMessage("已导出 ICS 日历文件。");
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "日历导出失败");
    }
  }

  async function sharePlan() {
    if (!plan || !planResult) return;
    const text = buildShareText(plan, planResult);
    const copiedBeforeShare = await copyShareTextToClipboard(text);
    setActionMessage("");
    setShareFallbackText("");
    try {
      if (navigator.share) {
        await navigator.share({ title: plan.title || "LifeOps 计划", text });
        setActionMessage("已打开系统分享面板。");
        return;
      }
      await navigator.clipboard.writeText(text);
      setActionMessage("当前浏览器不支持直接分享，已复制分享文本，可发微信。");
    } catch {
      if (copiedBeforeShare) {
        setActionMessage("分享面板未完成，已复制分享文本，可发微信。");
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        setActionMessage("分享面板未完成，已复制分享文本，可发微信。");
      } catch {
        setShareFallbackText(text);
        setActionMessage("分享受浏览器限制，已准备好文本，可发微信。");
      }
    }
  }

  async function copyShareTextToClipboard(text: string) {
    try {
      await navigator.clipboard?.writeText(text);
      return true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        return document.execCommand("copy");
      } catch {
        return false;
      } finally {
        textarea.remove();
      }
    }
  }

  async function confirmFirstAction() {
    if (!plan || !planResult) return;
    const action = firstConfirmAction(plan, planResult);
    if (!action) return;
    const actionRecord = asRecord(action) || {};
    const actionType = String(actionRecord.action || actionRecord.type || "export_calendar");
    const actionLabel = String(actionRecord.description || actionRecord.label || "确认动作");
    setActionMessage("");
    setShareFallbackText("");
    try {
      const result = await confirmPlanAction({
        plan_id: planResult.task_id,
        trace_id: planResult.trace_id || runTraceId,
        action_type: actionType,
        label: actionLabel,
        items: Array.isArray(actionRecord.items) ? actionRecord.items : [],
      });
      setConfirmedAction({
        type: actionType,
        label: actionLabel,
        execution: result.execution,
        confirmationId: result.confirmation_id,
      });
      setActionMessage(result.message || "已记录确认。");
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "确认失败");
    }
  }

  if (!plan || !planResult) {
    return (
      <main className="emptyState">
        <h1>没有找到这份计划</h1>
        <p>从首页重新生成，或在历史记录里打开后端保存的快照。</p>
        <Link to="/" className="primaryButton">返回规划</Link>
      </main>
    );
  }
  const activeResult = planResult;

  return (
    <main className="detail pageEnter">
      <section className="planHero">
        <div>
          <div className="sectionKicker">
            <CalendarDays size={16} /> {taskTypeLabel(taskType)} · {plan.date || "日期待确认"}
          </div>
          <h1>{plan.title || plan.goal || "LifeOps 计划详情"}</h1>
          <p>{plan.goal || activeResult.assistant_message || "已生成可执行计划。"}</p>
        </div>
        <div className="heroStats">
          <Stat icon={<WalletCards size={18} />} label="预算" value={formatMoney(plan.budget?.budget_limit)} />
          <Stat icon={<ReceiptText size={18} />} label="预计" value={formatMoney(plan.budget?.total)} />
          <Stat icon={<CloudSun size={18} />} label={taskType === "todo" ? "类型" : "天气"} value={taskType === "todo" ? "待办拆解" : weatherText(plan.weather)} />
        </div>
      </section>
      <section className="planActions">
        <button type="button" onClick={downloadPlanDocument}>
          <Download size={18} />
          下载行程单
        </button>
        <button type="button" onClick={sharePlan}>
          <Share2 size={18} />
          分享计划
        </button>
        {firstConfirmAction(plan, activeResult) && (
          <button type="button" onClick={confirmFirstAction} disabled={Boolean(confirmedAction)}>
            <BadgeCheck size={18} />
            {confirmedAction ? "已确认边界" : "确认动作"}
          </button>
        )}
        {confirmedAction?.type === "export_calendar" && (
          <button type="button" onClick={downloadCalendarFile}>
            <CalendarDays size={18} />
            导出日历
          </button>
        )}
        {actionMessage && <span>{actionMessage}</span>}
        {shareFallbackText && <textarea className="shareFallbackText" readOnly value={shareFallbackText} />}
      </section>
      <nav className="sectionTabs">
        {detailTabs(taskType).map((item) => (
          <a key={item} href={`#${item}`}>{item}</a>
        ))}
      </nav>
      {qualityWarnings.length > 0 && (
        <section className="qualityWarning">
          <div>
            <AlertCircle size={20} />
            <strong>方案需确认</strong>
          </div>
          <p>当前方案未完全满足你的要求，下面行程可先参考，但请先留意这些未满足项：</p>
          <ul>
            {qualityWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      )}
      <section id="总览" className="overviewGrid">
        <InfoCard title={taskType === "todo" ? "任务类型" : "天气节奏"} icon={<CloudSun size={18} />} text={taskType === "todo" ? "目标拆解 + 时间块" : weatherText(plan.weather)} />
        <InfoCard title={taskType === "todo" ? "外部工具" : "搜索依据"} icon={<FileSearch size={18} />} text={taskType === "todo" ? "未调用地图/天气" : searchEvidenceText(plan)} />
        <InfoCard title="吃住候选" icon={<MapPin size={18} />} text={lifestyleCandidateText(plan)} />
        <InfoCard title="预算使用" icon={<WalletCards size={18} />} text={usageText(plan.budget?.budget_usage)} />
      </section>
      <RecommendationBasis plan={plan} />
      <TrustBrief plan={plan} result={activeResult} providerHealth={providerHealth} confirmedAction={confirmedAction} />
      <IntentExecutionBrief result={activeResult} />
      <MultiAgentTrace result={activeResult} />
      <MemoryParticipation result={activeResult} events={runEvents} />
      <QualityScoreCard score={activeResult.quality_score || estimateQualityScore(plan, activeResult)} />
      <PlanStructureGrid plan={plan} result={activeResult} />
      <section id="路线" className="panel">
        <SectionTitle icon={<RouteIcon size={20} />} title={timelineTitle(taskType)} />
        <div className="routeSummary">
          <p>{planSummary(plan, activeResult) || "已生成可执行路线。"}</p>
        </div>
        <RouteMap plan={plan} />
        {groupItineraryByDay(plan.itinerary || []).map((group) => (
          <div className="dayTimeline" key={group.day}>
            <div className="dayHeading">Day {group.day}</div>
            <div className="timeline">
              {group.items.map((item, index) => (
                <ItineraryCard key={`${group.day}-${item.time}-${item.place}-${index}`} item={item} />
              ))}
            </div>
          </div>
        ))}
      </section>
      <section id="吃住" className="twoColumn">
        <PlaceList title={taskType === "meal" ? "餐饮推荐" : "餐饮候选"} items={plan.meal_candidates || plan.lifestyle_places?.foods || []} />
        <PlaceList title="住宿候选" items={plan.lifestyle_places?.hotels || []} />
      </section>
      <section id="预算" className="panel">
        <SectionTitle icon={<ReceiptText size={20} />} title="预算账本" />
        <BudgetBoard plan={plan} />
      </section>
      <section id="来源" className="panel">
        <SectionTitle icon={<FileSearch size={20} />} title="参考来源" />
        <div className="sourceList">
          {(plan.travel_research?.sources || []).map((source) => (
            <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
              <strong>{source.title}</strong>
              <span>{source.content || "查看来源"}</span>
              <ArrowUpRight size={16} />
            </a>
          ))}
          {!plan.travel_research?.sources?.length && <p className="muted">{plan.travel_research?.note || "暂无可点击来源。"}</p>}
        </div>
      </section>
      <section id="过程" className="panel">
        <SectionTitle icon={<NotebookTabs size={20} />} title="Agent 执行过程" />
        <AgentProcess events={markRunEventsDone(runEvents)} fallbackLog={activeResult.execution_log || []} />
      </section>
      <FeedbackPanel
        plan={plan}
        planResult={activeResult}
        saved={feedbackSaved}
        onSaved={() => setFeedbackSaved(true)}
      />
      <section className="replanBox">
        <input value={replanText} onChange={(event) => setReplanText(event.target.value)} placeholder="例如：太贵了 / 换轻松点 / 增加夜景" />
        <button onClick={submitReplan} disabled={loading || !replanText.trim()}>
          {loading ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
          重规划
        </button>
      </section>
    </main>
  );
}

function RecommendationBasis({ plan }: { plan: FinalPlan }) {
  const basis = plan.recommendation_basis;
  if (!basis?.answer && !basis?.selected_places?.length && !basis?.top_scored_candidates?.length) return null;
  const metrics = [
    ["网页结果", basis.web_results_count ?? 0],
    ["参考来源", basis.web_sources_count ?? plan.travel_research?.sources?.length ?? 0],
    ["餐饮候选", basis.food_candidates_count ?? plan.lifestyle_places?.foods?.length ?? 0],
    ["住宿候选", basis.hotel_candidates_count ?? plan.lifestyle_places?.hotels?.length ?? 0],
  ] as const;
  return (
    <section className="recommendationBasis panel">
      <SectionTitle icon={<Compass size={20} />} title="推荐依据" />
      <p>{basis.answer || "已综合候选评分、网页来源、预算、天气和路线顺序排序。"}</p>
      {basis.web_query && <div className="basisQuery">搜索词：{basis.web_query}</div>}
      <div className="basisMetrics">
        {metrics.map(([label, value]) => (
          <span key={label}><b>{value}</b>{label}</span>
        ))}
      </div>
      {!!basis.selected_places?.length && (
        <div className="basisBlock">
          <span>主线地点</span>
          <div>{basis.selected_places.slice(0, 6).map((item) => <i key={item}>{item}</i>)}</div>
        </div>
      )}
      {!!basis.top_scored_candidates?.length && (
        <div className="basisBlock">
          <span>评分靠前候选</span>
          <div>{basis.top_scored_candidates.slice(0, 6).map((item) => <i key={item}>{item}</i>)}</div>
        </div>
      )}
    </section>
  );
}

function QualityScoreCard({ score }: { score?: QualityScore }) {
  if (!score) {
    return (
      <section className="qualityScore panel">
        <SectionTitle icon={<Gauge size={20} />} title="计划质量评分" />
        <p className="muted">这份历史快照暂未生成评分，重新打开后端详情或新建计划后会自动补齐。</p>
      </section>
    );
  }

  return (
    <section className="qualityScore panel">
      <div className="qualityScoreHead">
        <SectionTitle icon={<Gauge size={20} />} title="计划质量评分" />
        <div className="scoreDial" style={{ "--score": `${score.overall * 3.6}deg` } as CSSProperties}>
          <span>{score.overall}</span>
          <small>综合</small>
        </div>
      </div>
      <div className="scoreGrid">
        {score.dimensions.map((item, index) => (
          <div className="scoreMetric" key={item.key} style={{ animationDelay: `${index * 55}ms` }}>
            <div>
              <b>{item.label}</b>
              <span>{item.score}</span>
            </div>
            <i><em style={{ width: `${item.score}%` }} /></i>
            <p>{item.reason}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TrustBrief({
  plan,
  result,
  providerHealth,
  confirmedAction,
}: {
  plan: FinalPlan;
  result: PlanResponse;
  providerHealth: ProviderHealthResponse | null;
  confirmedAction: ConfirmedActionState | null;
}) {
  const facts = trustFacts(plan, result, providerHealth, confirmedAction);
  const degraded = facts.filter((item) => item.level !== "ok");

  return (
    <section className="trustBrief panel">
      <div className="trustBriefHead">
        <SectionTitle icon={<BadgeCheck size={20} />} title="演示可信度说明" />
        <span className={degraded.length ? "trustBadge warn" : "trustBadge"}>{degraded.length ? "有待确认项" : "可演示"}</span>
      </div>
      <p>{trustSummary(facts)}</p>
      <div className="trustGrid">
        {facts.map((fact) => (
          <div className={`trustFact ${fact.level}`} key={fact.key}>
            <span>{fact.label}</span>
            <b>{fact.value}</b>
            <small>{fact.note}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function IntentExecutionBrief({ result }: { result: PlanResponse }) {
  const contract = result.intent_contract || result.final_plan?.intent_contract;
  const executionPlan = result.execution_plan || result.final_plan?.execution_plan || [];
  const subTasks = contract?.sub_tasks || [];
  if (!contract && !executionPlan.length) return null;

  return (
    <section className="intentBrief panel">
      <SectionTitle icon={<RouteIcon size={20} />} title="意图与执行计划" />
      <div className="intentBriefGrid">
        <div>
          <b>识别到的子任务</b>
          <div className="intentChips">
            {subTasks.map((item, index) => <span key={`${item.type}-${index}`}>{intentTaskLabel(item.type)}{item.label ? ` · ${item.label}` : ""}</span>)}
            {!subTasks.length && <small>未返回子任务结构。</small>}
          </div>
        </div>
        <div>
          <b>实际工具编排</b>
          <div className="intentChips">
            {executionPlan.map((item, index) => <span key={`${item.tool}-${index}`}>{toolLabel(String(item.tool || ""))}{item.purpose ? ` · ${item.purpose}` : ""}</span>)}
            {!executionPlan.length && <small>未返回动态工具计划。</small>}
          </div>
        </div>
      </div>
    </section>
  );
}

function MemoryParticipation({ result, events }: { result: PlanResponse; events: RunEvent[] }) {
  const resolution = memoryResolutionFromResult(result) || memoryResolutionFromEvents(events) || memoryResolutionFromLog(result.execution_log || []);
  const covered = coveredPreferencesFromEvents(events, result.execution_log || []);
  const appliedLikes = uniqueStrings([...(resolution?.applied_likes || []), ...covered]);
  const appliedDislikes = uniqueStrings(resolution?.applied_dislikes || []);
  const suppressed = [
    ...normalizeSuppressedMemory(resolution?.suppressed_likes, "偏好"),
    ...normalizeSuppressedMemory(resolution?.suppressed_dislikes, "避开项"),
  ];

  if (!appliedLikes.length && !appliedDislikes.length && !suppressed.length) return null;

  return (
    <section className="memoryResult panel">
      <SectionTitle icon={<Brain size={20} />} title="记忆参与" />
      <p className="muted">本次输入和临时开关优先，长期画像只作为默认倾向参与。</p>
      <div className="memoryResultGrid">
        <div>
          <b>本次采用</b>
          <div className="memoryResultChips">
            {[...appliedLikes, ...appliedDislikes.map((item) => `避开：${item}`)].map((item) => <span key={item}>{item}</span>)}
            {!appliedLikes.length && !appliedDislikes.length && <small>后端未返回采用项。</small>}
          </div>
        </div>
        <div>
          <b>本次覆盖</b>
          <div className="memorySuppressedList">
            {suppressed.map((item) => (
              <span key={`${item.value}-${item.reason}`}>
                <strong>{item.value}</strong>
                <small>{item.reason}</small>
              </span>
            ))}
            {!suppressed.length && <small>没有被本次输入覆盖的画像项。</small>}
          </div>
        </div>
      </div>
    </section>
  );
}

const feedbackTags = ["喜欢", "路线顺", "太赶", "太贵", "证据不足", "天气合适"];

type DisplayItem = {
  title: string;
  description?: string;
  meta?: string;
  chips?: string[];
};

function PlanStructureGrid({ plan, result }: { plan: FinalPlan; result: PlanResponse }) {
  const cards = [
    { title: "任务清单", icon: <CheckCircle2 size={18} />, items: normalizeDisplayItems(plan.todo_items || plan.errand_items) },
    { title: "时间块", icon: <CalendarDays size={18} />, items: normalizeDisplayItems(plan.time_blocks) },
    { title: "确认动作", icon: <BadgeCheck size={18} />, items: normalizeDisplayItems(result.confirmations || plan.confirm_actions) },
    { title: "验收标准", icon: <Gauge size={18} />, items: normalizeTextItems(plan.acceptance_criteria) },
    { title: "风险提示", icon: <AlertCircle size={18} />, items: normalizeTextItems(plan.risks) },
    { title: "备选方案", icon: <Compass size={18} />, items: normalizeDisplayItems(plan.alternatives || plan.fallbacks) },
  ].filter((card) => card.items.length);

  const routeFacts = [
    ...normalizeFactItems("目的地校验", plan.destination_validation),
    ...normalizeFactItems("跨城路线", plan.access_route),
    ...normalizeFactItems("本地路线", plan.local_route),
  ];

  if (!cards.length && !routeFacts.length) return null;

  return (
    <section className="panel structuredPlan">
      <SectionTitle icon={<NotebookTabs size={20} />} title="结构化结果" />
      {!!cards.length && (
        <div className="structuredGrid">
          {cards.map((card) => (
            <article className="structuredCard" key={card.title}>
              <div className="structuredCardHead">
                {card.icon}
                <strong>{card.title}</strong>
                <span>{card.items.length}</span>
              </div>
              <div className="structuredList">
                {card.items.slice(0, 6).map((item, index) => (
                  <div key={`${card.title}-${item.title}-${index}`} className="structuredItem">
                    <b>{item.title}</b>
                    {item.meta && <small>{item.meta}</small>}
                    {item.description && <p>{item.description}</p>}
                    {!!item.chips?.length && (
                      <div className="structuredChips">
                        {item.chips.slice(0, 5).map((chip) => <span key={chip}>{chip}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
      {!!routeFacts.length && (
        <div className="factGrid">
          {routeFacts.map((fact) => (
            <div key={`${fact.group}-${fact.label}`} className="factItem">
              <span>{fact.group}</span>
              <b>{fact.label}</b>
              <small>{fact.value}</small>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FeedbackPanel({
  plan,
  planResult,
  saved,
  onSaved,
}: {
  plan: FinalPlan;
  planResult: PlanResponse;
  saved: boolean;
  onSaved: () => void;
}) {
  const [rating, setRating] = useState(4);
  const [tags, setTags] = useState<string[]>(["喜欢"]);
  const [note, setNote] = useState("");
  const [itemFeedback, setItemFeedback] = useState<Record<string, "like" | "dislike" | "neutral">>({});
  const [submitting, setSubmitting] = useState(false);
  const [learned, setLearned] = useState<Array<{ type: string; content: string }>>([]);

  function toggleTag(tag: string) {
    setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload: PlanFeedbackPayload = {
        task_id: planResult.task_id || planResult.trace_id,
        trace_id: planResult.trace_id,
        rating,
        tags,
        note,
        item_feedback: Object.entries(itemFeedback)
          .filter(([, sentiment]) => sentiment !== "neutral")
          .map(([place, sentiment]) => ({ place, sentiment })),
      };
      const result = await submitFeedback(payload);
      setLearned(result.learned_preferences || []);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  const stops = (plan.itinerary || []).filter((item) => item.place).slice(0, 8);

  return (
    <section className="feedbackPanel panel">
      <div className="feedbackHeader">
        <SectionTitle icon={<Heart size={20} />} title="执行反馈" />
        {saved && <span className="savedBadge"><BadgeCheck size={15} /> 已写入个人画像</span>}
      </div>
      <div className="ratingRow" aria-label="整体评分">
        {[1, 2, 3, 4, 5].map((value) => (
          <button key={value} className={value <= rating ? "active" : ""} onClick={() => setRating(value)} aria-label={`${value} 分`}>
            <Star size={20} fill="currentColor" />
          </button>
        ))}
      </div>
      <div className="feedbackTags">
        {feedbackTags.map((tag) => (
          <button key={tag} className={tags.includes(tag) ? "selected" : ""} onClick={() => toggleTag(tag)}>
            {tag}
          </button>
        ))}
      </div>
      {!!stops.length && (
        <div className="itemFeedbackGrid">
          {stops.map((item) => {
            const place = item.place || "";
            const value = itemFeedback[place] || "neutral";
            return (
              <div key={place}>
                <span>{place}</span>
                <div>
                  <button className={value === "like" ? "selected" : ""} onClick={() => setItemFeedback({ ...itemFeedback, [place]: value === "like" ? "neutral" : "like" })}>喜欢</button>
                  <button className={value === "dislike" ? "selected warn" : ""} onClick={() => setItemFeedback({ ...itemFeedback, [place]: value === "dislike" ? "neutral" : "dislike" })}>避开</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <textarea className="feedbackNote" value={note} onChange={(event) => setNote(event.target.value)} placeholder="可选：这次计划哪里好、哪里不适合你？" />
      <div className="feedbackFooter">
        <button className="primaryButton" onClick={submit} disabled={submitting || saved}>
          {submitting ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
          {saved ? "已保存反馈" : "提交反馈"}
        </button>
        {!!learned.length && (
          <div className="learnedPreview">
            {learned.slice(0, 3).map((item) => <span key={`${item.type}-${item.content}`}>{item.content}</span>)}
          </div>
        )}
      </div>
    </section>
  );
}

function ProfilePage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch((err) => setError(err instanceof Error ? err.message : "画像加载失败"));
  }, []);

  if (error) {
    return <main className="profilePage pageEnter"><div className="error">{error}</div></main>;
  }
  if (!profile) {
    return <main className="profilePage pageEnter"><div className="panel">正在读取生活画像...</div></main>;
  }

  const axes = profileAxes(profile);
  const maxType = Math.max(...profile.stats.plan_types.map((item) => item.count), 1);
  const maxCity = Math.max(...profile.stats.common_cities.map((item) => item.count), 1);
  const conflicts = profilePreferenceConflicts(profile);

  return (
    <main className="profilePage pageEnter">
      <section className="profileHero">
        <div>
          <div className="sectionKicker">
            <UserRound size={16} /> 生活画像舱
          </div>
          <h1>让每次反馈变成下一次更懂你的规划。</h1>
          <p className="muted">这里记录长期规则和最近学习；新计划会优先听本次输入，再参考这些默认倾向。</p>
        </div>
        <div className="profilePulse">
          <span>{profile.stats.feedback_count}</span>
          <small>次反馈沉淀</small>
          <b>{profile.stats.average_rating ? `${profile.stats.average_rating} / 5` : "待积累评分"}</b>
        </div>
      </section>

      <section className="profileGrid">
        <div className="profileCard compassCard">
          <SectionTitle icon={<Compass size={20} />} title="生活罗盘" />
          <div className="compassRose">
            {axes.map((axis, index) => (
              <div key={axis.label} style={{ "--axis": `${axis.value}%`, animationDelay: `${index * 60}ms` } as CSSProperties}>
                <span>{axis.label}</span>
                <i><em /></i>
                <b>{axis.value}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="profileCard">
          <SectionTitle icon={<Brain size={20} />} title="最近学习" />
          <div className="memoryStack">
            {profile.recent_memory.length ? profile.recent_memory.map((item, index) => (
              <article key={`${item.created_at}-${item.content}-${index}`} style={{ animationDelay: `${index * 55}ms` }}>
                <span>{memoryTypeLabel(item.event_type)}</span>
                <b>{item.content}</b>
                <small>{item.created_at || "刚刚"}</small>
              </article>
            )) : <p className="muted">提交一次计划反馈后，这里会开始沉淀你的长期偏好。</p>}
          </div>
        </div>

        <div className="profileCard">
          <SectionTitle icon={<Heart size={20} />} title="长期偏好规则" />
          <p className="muted profileRuleNote">没有本次限制时，这些规则会作为默认画像参与规划；首页可临时忽略单项。</p>
          <div className="profileChips">
            {(profile.profile.likes || []).slice(-10).map((item) => <span key={item}>{item}</span>)}
            {!(profile.profile.likes || []).length && <p className="muted">暂无确认偏好。</p>}
          </div>
          <div className="profileAvoid">
            {(profile.profile.dislikes || []).slice(-8).map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>

        <div className="profileCard">
          <SectionTitle icon={<AlertCircle size={20} />} title="条件偏好待确认" />
          {conflicts.length ? (
            <div className="conflictList">
              {conflicts.map((item) => (
                <span key={item}>
                  <b>{item}</b>
                  <small>既出现喜欢也出现避开，下次规划前可在首页按本次场景开关。</small>
                </span>
              ))}
            </div>
          ) : <p className="muted">暂无明显冲突。若某个偏好只在特定场景成立，后续反馈会逐步沉淀成条件偏好。</p>}
        </div>

        <div className="profileCard">
          <SectionTitle icon={<TrendingUp size={20} />} title="反馈热度" />
          <HeatBars items={profile.stats.plan_types} max={maxType} empty="暂无计划类型统计" />
          <div className="dividerLine" />
          <HeatBars items={profile.stats.common_cities} max={maxCity} empty="暂无常见城市" />
        </div>
      </section>
    </main>
  );
}

function HeatBars({ items, max, empty }: { items: Array<{ label: string; count: number }>; max: number; empty: string }) {
  if (!items.length) return <p className="muted">{empty}</p>;
  return (
    <div className="heatBars">
      {items.map((item, index) => (
        <div key={item.label} style={{ animationDelay: `${index * 55}ms` }}>
          <span>{item.label}</span>
          <i><em style={{ width: `${Math.max(12, (item.count / max) * 100)}%` }} /></i>
          <b>{item.count}</b>
        </div>
      ))}
    </div>
  );
}

function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    getHistory(200)
      .then((result) => setItems(result.items))
      .catch((err) => setError(err instanceof Error ? err.message : "历史记录加载失败"));
  }, []);

  useEffect(() => setPage(1), [keyword, dateFrom, dateTo]);

  const filteredItems = items.filter((item) => historyMatches(item, keyword, dateFrom, dateTo));
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / HISTORY_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredItems.slice((currentPage - 1) * HISTORY_PAGE_SIZE, currentPage * HISTORY_PAGE_SIZE);

  return (
    <main className="historyPage pageEnter">
      <div className="historyHeader">
        <div>
          <h1>历史计划</h1>
          <p className="muted">共 {filteredItems.length} 条结果，每页最多 10 条。</p>
        </div>
      </div>
      <section className="historyToolbar">
        <label className="filterField keywordField">
          <Search size={16} />
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索标题、城市、需求关键词" />
        </label>
        <label className="filterField">
          <span>从</span>
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        </label>
        <label className="filterField">
          <span>到</span>
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </label>
      </section>
      {error && <div className="error">{error}</div>}
      <div className="historyList">
        {pageItems.map((item) => {
          const plan = parseHistoryPlan(item.final_plan);
          const result: PlanResponse = {
            status: "success",
            task_id: item.task_id,
            trace_id: item.task_id,
            final_plan: plan,
            assistant_message: item.user_input,
          };
          return (
            <Link key={item.task_id} to={`/plans/${item.task_id}`} state={{ result }} onClick={() => cachePlan(result)}>
              <History size={18} />
              <div>
                <strong>{plan.title || plan.goal || item.user_input}</strong>
                <span>{item.created_at || "未知时间"}{item.has_feedback ? " · 已反馈" : ""}</span>
              </div>
              {item.has_feedback ? <span className="historyFeedbackBadge">画像已更新</span> : <span className="historyFeedbackBadge mutedBadge">待反馈</span>}
            </Link>
          );
        })}
        {!pageItems.length && <div className="emptyHistory">没有匹配的历史计划。</div>}
      </div>
      <div className="pagination">
        <button className="iconButton" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage <= 1} aria-label="上一页">
          <ChevronLeft size={18} />
        </button>
        <span>第 {currentPage} / {totalPages} 页</span>
        <button className="iconButton" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage >= totalPages} aria-label="下一页">
          <ChevronRight size={18} />
        </button>
      </div>
    </main>
  );
}

function AuditPage() {
  const [items, setItems] = useState<AppAuditItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAppAudit(80)
      .then((result) => setItems(result.items))
      .catch((err) => setError(err instanceof Error ? err.message : "审计日志加载失败"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="historyPage auditPage pageEnter">
      <div className="historyHeader">
        <div>
          <h1>审计日志</h1>
          <p className="muted">只读查看系统关键动作：计划开始、确认动作、导出日历和反馈提交。</p>
        </div>
      </div>

      {loading && <section className="panel">正在读取审计日志...</section>}
      {error && (
        <section className="panel auditDenied">
          <AlertCircle size={22} />
          <div>
            <b>当前身份没有审计权限</b>
            <p className="muted">{error}</p>
          </div>
        </section>
      )}
      {!loading && !error && (
        <section className="auditList">
          {items.map((item) => (
            <article key={item.audit_id} className="auditRow">
              <FileSearch size={18} />
              <div>
                <div className="auditRowTitle">
                  <b>{auditActionLabel(item.action)}</b>
                  <span>{item.created_at || "时间未知"}</span>
                </div>
                <p>{item.actor_user_id} · {item.actor_role} · {item.resource_type}{item.resource_id ? `/${item.resource_id}` : ""}</p>
                {auditDetails(item.details) && <small>{auditDetails(item.details)}</small>}
              </div>
            </article>
          ))}
          {!items.length && <div className="emptyHistory">暂无审计日志。</div>}
        </section>
      )}
    </main>
  );
}

function ItineraryCard({ item }: { item: ItineraryItem }) {
  const unresolved = isUnresolvedPlaceItem(item);
  const displayPlace = unresolved ? "地点待确认" : item.place || "地点待确认";
  const mapUrl = !unresolved && item.map_url ? item.map_url : "";
  return (
    <article className={`ticket ${unresolved ? "unresolvedTicket" : ""}`}>
      <div className="ticketTime">{item.time || "时间待定"}</div>
      <div>
        {mapUrl ? (
          <a className="placeLink" href={mapUrl} target="_blank" rel="noreferrer">
            {displayPlace} <ArrowUpRight size={14} />
          </a>
        ) : (
          <h3>{displayPlace}</h3>
        )}
        <p>{unresolved ? `后端只返回了候选占位：${item.place || item.area || item.reason || "未命名候选"}，不能当作真实地点。` : item.address || item.area || item.reason || "暂无地点说明"}</p>
        <div className="chips">
          {(item.play_points || []).map((point) => <span key={point}>{point}</span>)}
          {unresolved && <span className="warmBadge">需要重新搜索真实地点</span>}
          <span className={item.cost_known ? "okBadge" : "warmBadge"}>{item.cost_known ? formatMoney(item.cost) : item.cost_note || "票价待确认"}</span>
        </div>
      </div>
    </article>
  );
}

function BudgetBoard({ plan }: { plan: FinalPlan }) {
  const budget = plan.budget || {};
  const rows = [
    ["活动费", budget.activity_cost],
    ["餐饮", budget.meal_budget],
    ["交通", budget.transport_budget],
  ] as const;
  const max = Math.max(Number(budget.budget_limit || budget.total || 1), 1);
  return (
    <div className="budgetRows">
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <div><i style={{ width: `${Math.min((Number(value || 0) / max) * 100, 100)}%` }} /></div>
          <b>{formatMoney(value)}</b>
        </div>
      ))}
      {!!budget.unknown_activity_cost_items?.length && <p className="notice">待确认费用：{budget.unknown_activity_cost_items.join("、")}</p>}
    </div>
  );
}

function PlaceList({ title, items }: { title: string; items: { name?: string | null; area?: string | null; address?: string | null; map_url?: string | null }[] }) {
  return (
    <section className="panel">
      <SectionTitle icon={<MapPin size={20} />} title={title} />
      {items.length ? items.map((item) => (
        <a key={`${item.name}-${item.address}`} className="placeRow" href={item.map_url || "#"} target={item.map_url ? "_blank" : undefined} rel="noreferrer">
          <b>{item.name || "名称待确认"}</b>
          <span>{item.address || item.area || "位置待确认"}</span>
        </a>
      )) : <p className="muted">暂无候选，不编造店名。</p>}
    </section>
  );
}

function RouteMap({ plan }: { plan: FinalPlan }) {
  const stops = routeStops(plan);
  if (!stops.length) {
    return (
      <div className="routeMap emptyRouteMap">
        <MapPin size={20} />
        <span>没有可标注的真实地点。当前结果可能只包含“候选/地图搜索”占位词，请补充区域或让后端重新搜索真实 POI。</span>
      </div>
    );
  }

  const points = stops.map((stop, index) => routePoint(index, stops.length));
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const coordinateStops = stops.map((stop) => ({ ...stop, coordinates: parseLocation(stop.location) })).filter((stop) => stop.coordinates);
  const canUseCoordinateMap = coordinateStops.length === stops.length;

  return (
    <div className="routeMap" aria-label="地图路线示意图">
      <div className="routeCanvas">
        <div className="routeCanvasHeader">
          <span>路线示意</span>
          <small>{stops.length} 个目标地点</small>
        </div>
        {canUseCoordinateMap ? (
          <CoordinateRouteMap stops={coordinateStops} />
        ) : (
        <div className="routeDiagram">
          {stops.map((stop, index) => (
            <div className="routeDiagramBlock" key={`diagram-${stop.place}-${index}`}>
              <a
                className={`routeDiagramStop ${!stop.map_url ? "disabled" : ""}`}
                href={stop.map_url || "#"}
                target={stop.map_url ? "_blank" : undefined}
                rel="noreferrer"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <span className="routeDiagramPin">{index + 1}</span>
                <div>
                  <b>{stop.place}</b>
                  <small>{[stop.time, stop.area || stop.address].filter(Boolean).join(" · ") || "位置待确认"}</small>
                </div>
                {stop.map_url && <ArrowUpRight size={14} />}
              </a>
              {index < stops.length - 1 && (
                <div className="routeSegment" style={{ animationDelay: `${index * 90 + 80}ms` }}>
                  <span />
                  <b>前往下一站</b>
                </div>
              )}
            </div>
          ))}
        </div>
        )}
        <svg viewBox="0 0 100 64" role="img" aria-label="按行程顺序连接的路线">
          <defs>
            <marker id="routeArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" />
            </marker>
          </defs>
          <path className="routePathShadow" d={path} />
          <path className="routePath" d={path} markerEnd={stops.length > 1 ? "url(#routeArrow)" : undefined} />
        </svg>
        {stops.map((stop, index) => {
          const point = points[index];
          const marker = (
            <span className="routeMarker" style={{ left: `${point.x}%`, top: `${point.y}%`, animationDelay: `${index * 90}ms` }}>
              {index + 1}
            </span>
          );
          return stop.map_url ? (
            <a key={`${stop.place}-${index}`} className="routeMarkerLink" href={stop.map_url} target="_blank" rel="noreferrer" aria-label={`打开地图：${stop.place}`}>
              {marker}
            </a>
          ) : (
            <span key={`${stop.place}-${index}`} className="routeMarkerLink">
              {marker}
            </span>
          );
        })}
      </div>
      <div className="routeStopList">
        {stops.map((stop, index) => (
          <a key={`${stop.place}-${index}`} href={stop.map_url || "#"} target={stop.map_url ? "_blank" : undefined} rel="noreferrer" className={!stop.map_url ? "disabled" : undefined}>
            <span>{index + 1}</span>
            <div>
              <b>{stop.place}</b>
              <small>{[stop.time, stop.area, stop.address].filter(Boolean).join(" · ") || "位置待确认"}</small>
            </div>
            {stop.map_url && <ArrowUpRight size={14} />}
          </a>
        ))}
      </div>
    </div>
  );
}

function CoordinateRouteMap({
  stops,
}: {
  stops: Array<ReturnType<typeof routeStops>[number] & { coordinates: { lon: number; lat: number } | null }>;
}) {
  const locatedStops = stops.filter((stop): stop is ReturnType<typeof routeStops>[number] & { coordinates: { lon: number; lat: number } } => !!stop.coordinates);
  const coordinateKey = locatedStops.map((stop) => `${stop.coordinates.lon},${stop.coordinates.lat}`).join(";");
  const [routeCoords, setRouteCoords] = useState<Array<{ lon: number; lat: number }>>([]);
  const [zoomDelta, setZoomDelta] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [mapSize, setMapSize] = useState({ width: 640, height: 360 });
  const mapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; pan: { x: number; y: number } } | null>(null);

  useEffect(() => {
    const element = mapRef.current;
    if (!element) return;
    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setMapSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (locatedStops.length < 2) {
      setRouteCoords([]);
      return;
    }
    const controller = new AbortController();
    fetch(osrmRouteUrl(locatedStops.map((stop) => stop.coordinates)), { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const coordinates = data?.routes?.[0]?.geometry?.coordinates;
        if (!Array.isArray(coordinates)) {
          setRouteCoords([]);
          return;
        }
        setRouteCoords(coordinates.map((item: unknown) => {
          const pair = Array.isArray(item) ? item : [];
          return { lon: Number(pair[0]), lat: Number(pair[1]) };
        }).filter((coord: { lon: number; lat: number }) => Number.isFinite(coord.lon) && Number.isFinite(coord.lat)));
      })
      .catch(() => {
        if (!controller.signal.aborted) setRouteCoords([]);
      });
    return () => controller.abort();
  }, [coordinateKey]);

  const viewport = mapViewport(locatedStops.map((stop) => stop.coordinates), zoomDelta, pan, mapSize);
  const projected = locatedStops.map((stop) => ({ ...stop, point: projectCoordinate(stop.coordinates, viewport) }));
  const projectedPoints = projected.map((stop) => stop.point);
  const markerLayouts = projected.map((stop, index) => ({ ...stop, labelOffset: coordinateLabelOffset(index, projectedPoints, mapSize) }));
  const routePoints = (routeCoords.length ? routeCoords : locatedStops.map((stop) => stop.coordinates)).map((coord) => projectCoordinate(coord, viewport));
  const path = routePoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const tiles = mapTiles(viewport);

  return (
    <div
      className="coordinateMap"
      ref={mapRef}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest("a,button")) return;
        dragRef.current = { x: event.clientX, y: event.clientY, pan };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!dragRef.current || !mapRef.current) return;
        const rect = mapRef.current.getBoundingClientRect();
        const scaleX = (viewport.maxX - viewport.minX) / Math.max(rect.width, 1);
        const scaleY = (viewport.maxY - viewport.minY) / Math.max(rect.height, 1);
        setPan({
          x: dragRef.current.pan.x - (event.clientX - dragRef.current.x) * scaleX,
          y: dragRef.current.pan.y - (event.clientY - dragRef.current.y) * scaleY,
        });
      }}
      onPointerUp={() => {
        dragRef.current = null;
      }}
      onPointerCancel={() => {
        dragRef.current = null;
      }}
    >
      <div className="mapTiles" aria-hidden="true">
        {tiles.map((tile) => (
          <img
            key={`${tile.x}-${tile.y}-${tile.z}`}
            src={amapTileUrl(tile)}
            style={{ left: tile.left, top: tile.top, width: tile.width, height: tile.height }}
            draggable={false}
            alt=""
          />
        ))}
      </div>
      <svg viewBox={`0 0 ${mapSize.width} ${mapSize.height}`} className="coordinateRouteSvg" aria-hidden="true">
        <defs>
          <marker id="coordinateRouteArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
        </defs>
        <path className="coordinateRouteShadow" d={path} />
        <path className="coordinateRoutePath" d={path} markerEnd={projected.length > 1 ? "url(#coordinateRouteArrow)" : undefined} />
      </svg>
      {markerLayouts.map((stop, index) => (
        <a
          key={`coordinate-${stop.place}-${index}`}
          className="coordinateMarker"
          href={stop.map_url || "#"}
          target={stop.map_url ? "_blank" : undefined}
          rel="noreferrer"
          style={{
            left: stop.point.x,
            top: stop.point.y,
            animationDelay: `${index * 90}ms`,
            "--label-x": `${stop.labelOffset.x}px`,
            "--label-y": `${stop.labelOffset.y}px`,
          } as CSSProperties}
        >
          <span className="coordinatePin">{index + 1}</span>
          <span className="coordinateLabel">
            <b>{stop.place}</b>
          </span>
        </a>
      ))}
      <div
        className="coordinateMapControls"
        aria-label="地图缩放"
        onPointerDown={(event) => event.stopPropagation()}
        onPointerMove={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setZoomDelta((value) => Math.min(value + 1, 3));
          }}
          aria-label="放大地图"
        >
          <Plus size={14} />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setZoomDelta((value) => Math.max(value - 1, -3));
          }}
          aria-label="缩小地图"
        >
          <Minus size={14} />
        </button>
      </div>
      <div className="coordinateMapBadge">{routeCoords.length ? "道路路线" : "坐标地图"}</div>
    </div>
  );
}

function AgentProcess({ events, fallbackLog = [], keepResult = false }: { events: RunEvent[]; fallbackLog?: ExecutionLogItem[]; keepResult?: boolean }) {
  const processEvents = events.length ? events : fallbackLogToRunEvents(fallbackLog);
  const toolGroups = buildToolGroups(processEvents);
  const visibleSteps = withPendingRunSteps(
    normalizeParentStepStatus(buildRunSteps(processEvents, keepResult), toolGroups),
    processEvents,
    Boolean(events.length),
  );

  return (
    <div className="runTimeline">
      {visibleSteps.map((step) => (
        <RunStep key={step.stepKey} event={step} tools={toolGroups[step.stepKey] || []} />
      ))}
      {!visibleSteps.length && (
        <div className="runStep pending">
          <Circle size={18} />
          <div>
            <b>等待后端事件</b>
            <span>任务已创建，正在连接执行流。</span>
          </div>
        </div>
      )}
      {!events.length && !!fallbackLog.length && <p className="muted">这是基于历史 execution_log 的基础过程，旧记录不含工具展开详情。</p>}
    </div>
  );
}

const BASE_RUN_NODE_FLOW = [
  "run",
  "constraint_extractor",
  "date_resolver",
  "load_memory",
  "need_clarification",
  "planner",
  "task_router",
];

const DYNAMIC_RUN_NODE_FLOW = [
  "run",
  "constraint_extractor",
  "date_resolver",
  "load_memory",
  "need_clarification",
  "planner",
  "execute_plan",
  "synthesize_plan",
  "risk_checker",
  "reflection",
  "final_response",
];

const BRANCH_NODE_FLOW: Record<string, string[]> = {
  travel: ["travel_tool_router", "travel_candidate_scorer", "travel_plan_generator"],
  errand: ["errand_tool_router", "errand_candidate_scorer", "errand_plan_generator"],
  meal: ["meal_tool_router", "meal_candidate_scorer", "meal_plan_generator"],
  todo: ["todo_decomposer", "todo_plan_generator"],
};

const TAIL_RUN_NODE_FLOW = [
  "risk_checker",
  "reflection",
  "final_response",
];

function withPendingRunSteps(steps: RunStepState[], events: RunEvent[], showPending: boolean): RunStepState[] {
  if (!showPending || !events.length || hasTerminalRunEvent(events)) return steps;
  const existing = new Set(steps.map((step) => step.node));
  const traceId = events[0]?.trace_id || "pending";
  const pendingSteps = runNodeFlow(events)
    .filter((node) => !existing.has(node))
    .map((node) => ({
      trace_id: traceId,
      phase: "node",
      node,
      summary: pendingStepSummary(node),
      status: "pending",
      progress: 0,
      stepKey: `${node}:initial`,
    } as RunStepState));
  return [...steps, ...pendingSteps].sort((a, b) => stepRank(a) - stepRank(b));
}

function runNodeFlow(events: RunEvent[]) {
  if (events.some((event) => event.node === "execute_plan" || event.node === "synthesize_plan")) return DYNAMIC_RUN_NODE_FLOW;
  const taskType = taskTypeFromEvents(events);
  return [...BASE_RUN_NODE_FLOW, ...(BRANCH_NODE_FLOW[taskType] || BRANCH_NODE_FLOW.travel), ...TAIL_RUN_NODE_FLOW];
}

function taskTypeFromEvents(events: RunEvent[]) {
  for (const event of events) {
    const record = asRecord(event.details);
    const taskType = record?.task_type;
    if (typeof taskType === "string" && BRANCH_NODE_FLOW[taskType]) return taskType;
  }
  return "travel";
}

function hasTerminalRunEvent(events: RunEvent[]) {
  return events.some((event) => event.phase === "result" || event.node === "final_response" || Boolean(event.result));
}

function pendingStepSummary(node: string) {
  return {
    run: "等待任务启动",
    constraint_extractor: "等待理解用户需求",
    date_resolver: "等待解析日期",
    load_memory: "等待读取偏好",
    need_clarification: "等待检查信息是否完整",
    planner: "等待生成执行步骤",
    task_router: "等待选择任务分支",
    tool_router: "等待调用天气、搜索和地点工具",
    travel_tool_router: "等待旅行工具调用",
    travel_candidate_scorer: "等待旅行候选排序",
    travel_plan_generator: "等待生成旅行计划",
    errand_tool_router: "等待跑腿地点候选",
    errand_candidate_scorer: "等待整理跑腿候选",
    errand_plan_generator: "等待生成跑腿计划",
    meal_tool_router: "等待餐饮地点候选",
    meal_candidate_scorer: "等待整理餐饮候选",
    meal_plan_generator: "等待生成餐饮计划",
    todo_decomposer: "等待拆解待办",
    todo_plan_generator: "等待生成待办计划",
    candidate_scorer: "等待筛选地点候选",
    plan_generator: "等待生成路线和预算",
    risk_checker: "等待检查风险和约束",
    reflection: "等待质量复核",
    final_response: "等待组装最终结果",
  }[node] || "等待执行";
}

function normalizeParentStepStatus(steps: RunStepState[], toolGroups: Record<string, ToolStepState[]>): RunStepState[] {
  const startedRanks = new Set(steps.map((step) => phaseRank(step.node)).filter((rank) => rank >= 0));
  return steps.map((step) => {
    if (step.status !== "running") return step;
    const tools = toolGroups[step.stepKey] || [];
    if (!tools.length) return step;
    const hasRunningTool = tools.some((tool) => tool.status === "running" || tool.status === "pending");
    const hasFailedTool = tools.some((tool) => tool.status === "error");
    const allVisibleToolsSettled = tools.every((tool) => tool.status === "done" || tool.status === "error");
    const nextStepStarted = [...startedRanks].some((rank) => rank > phaseRank(step.node));
    const terminalToolDone = parentTerminalTools(step.node).some((toolName) =>
      tools.some((tool) => (tool.tool_name || tool.node) === toolName && tool.status === "done"),
    );
    if (!hasRunningTool && (allVisibleToolsSettled || nextStepStarted || terminalToolDone)) {
      return {
        ...step,
        status: hasFailedTool ? "error" : "done",
        summary: parentDoneSummary(step.node, step.summary),
        progress: Math.max(Number(step.progress || 0), 70),
      };
    }
    return step;
  });
}

function parentTerminalTools(node: string) {
  return {
    tool_router: ["place_filter", "place_search_tool"],
    travel_tool_router: ["place_filter", "place_search_tool"],
    errand_tool_router: ["place_search_tool"],
    meal_tool_router: ["place_search_tool"],
    execute_plan: ["confirm_action", "budget_tool"],
    plan_generator: ["budget_tool"],
    travel_plan_generator: ["budget_tool"],
    errand_plan_generator: ["budget_tool"],
    meal_plan_generator: ["budget_tool"],
  }[node] || [];
}

function parentDoneSummary(node: string, fallback: string) {
  return {
    tool_router: "天气、搜索和地点工具已完成",
    execute_plan: "动态工具编排已完成",
    synthesize_plan: "已按意图生成计划",
    travel_tool_router: "旅行工具链已完成",
    errand_tool_router: "跑腿候选准备已完成",
    meal_tool_router: "餐饮候选准备已完成",
    plan_generator: "路线和预算计算已完成",
    travel_plan_generator: "旅行路线和预算已完成",
    errand_plan_generator: "跑腿时间轴已完成",
    meal_plan_generator: "餐饮计划已完成",
  }[node] || fallback;
}

function RunStep({ event, tools = [] }: { event: RunEvent; tools?: ToolStepState[] }) {
  const icon = event.status === "error" ? <AlertCircle size={18} /> : event.status === "done" ? <CheckCircle2 size={18} /> : event.status === "pending" ? <Circle size={18} /> : <Loader2 className="spin" size={18} />;
  const hasDetails = hasRunStepDetails(event.node, event.details) || tools.length > 0;
  const header = (
    <>
      {icon}
      <div>
        <b>{event.node === "reflection_replan" ? "自动重排" : nodeLabel(event.node)}</b>
        <span>{event.summary}</span>
      </div>
      <time>{event.status === "done" ? "完成" : event.timestamp || ""}</time>
    </>
  );
  if (!hasDetails) {
    return <div className={`runStep ${event.status}`}>{header}</div>;
  }
  return (
    <details className={`runStep runStepExpandable ${event.status}`}>
      <summary>{header}</summary>
      <div className="runStepBody">
        <RunStepDetails node={event.node} details={event.details} />
        {!!tools.length && <ToolEventGroup tools={tools} />}
      </div>
    </details>
  );
}

function hasRunStepDetails(node: string, details: unknown) {
  const record = asRecord(details);
  if (!record) return false;
  return detailChips(node, record).length > 0 || detailList(node, record).length > 0;
}

function RunStepDetails({ node, details }: { node: string; details: unknown }) {
  const record = asRecord(details);
  if (!record) return null;
  const chips = detailChips(node, record);
  const list = detailList(node, record);
  if (!chips.length && !list.length) return null;
  return (
    <div className="runDetails">
      {!!chips.length && <div className="runDetailChips">{chips.map((chip) => <span key={chip}>{chip}</span>)}</div>}
      {!!list.length && <ul>{list.map((item) => <li key={item}>{item}</li>)}</ul>}
    </div>
  );
}

function ToolEventGroup({ tools }: { tools: ToolStepState[] }) {
  return (
    <div className="toolGroup">
      {tools.map((tool) => (
        <details className={`toolCard ${tool.status}`} key={`${tool.parent_node}-${tool.agent_name || "shared"}-${tool.task_id || "task"}-${tool.tool_name || tool.node}`}>
          <summary>
            <span className="toolStatus">
              {tool.status === "done" ? <CheckCircle2 size={16} /> : tool.status === "error" ? <AlertCircle size={16} /> : <Loader2 className="spin" size={16} />}
            </span>
            <b>{toolLabel(tool.tool_name || tool.node)}</b>
            {tool.agent_name && <i>{tool.agent_name} Agent</i>}
            <span>{tool.summary}</span>
          </summary>
          <ToolCardBody tool={tool} />
        </details>
      ))}
    </div>
  );
}

function ToolCardBody({ tool }: { tool: ToolStepState }) {
  const output = asRecord(tool.output_summary);
  const input = asRecord(tool.input);
  const preview = Array.isArray(tool.preview_items) ? tool.preview_items : [];
  return (
    <div className="toolBody">
      {input && <ToolMeta title="请求参数" record={input} />}
      {output && <ToolMeta title="返回摘要" record={output} />}
      <ToolPreview tool={tool} preview={preview} />
      {!output && !preview.length && <p className="muted">工具正在执行，等待返回数据。</p>}
    </div>
  );
}

function ToolMeta({ title, record }: { title: string; record: Record<string, unknown> }) {
  return (
    <div className="toolMeta">
      <strong>{title}</strong>
      <div>
        {Object.entries(record).filter(([, value]) => value !== undefined && value !== null && value !== "").map(([key, value]) => (
          <span key={key}>{metaLabel(key)}：{formatMetaValue(value)}</span>
        ))}
      </div>
    </div>
  );
}

function ToolPreview({ tool, preview }: { tool: ToolStepState; preview: unknown[] }) {
  if (!preview.length) return tool.status === "done" ? <div className="emptyToolPreview">没有可展示的预览项。</div> : null;
  const name = tool.tool_name || tool.node;
  if (name === "web_search_tool") {
    return (
      <div className="toolPreviewList">
        {preview.map((item, index) => {
          const record = asRecord(item) || {};
          return (
            <a href={String(record.url || "#")} target="_blank" rel="noreferrer" key={`${record.title}-${index}`}>
              <b>{String(record.title || "搜索结果")}</b>
              <span>{String(record.content || record.site || "查看来源")}</span>
            </a>
          );
        })}
      </div>
    );
  }
  if (name.includes("place")) {
    return (
      <div className="toolPreviewGrid">
        {preview.map((item, index) => {
          const record = asRecord(item) || {};
          return (
            <a href={String(record.map_url || "#")} target={record.map_url ? "_blank" : undefined} rel="noreferrer" key={`${record.name}-${index}`}>
              <b>{String(record.name || "地点")}</b>
              <span>{[record.area, record.address].filter(Boolean).map(String).join(" · ") || "位置待确认"}</span>
              <small>{Array.isArray(record.tags) ? record.tags.map(String).join("、") : String(record.cost_note || "")}</small>
            </a>
          );
        })}
      </div>
    );
  }
  return (
    <div className="toolPreviewGrid compact">
      {preview.map((item, index) => {
        const record = asRecord(item) || {};
        return (
          <div key={index}>
            <b>{String(record.label || record.place || record.name || `项目 ${index + 1}`)}</b>
            <span>{formatMetaValue(record.value ?? record.area ?? record.travel_from_previous ?? record.cost_note ?? "")}</span>
          </div>
        );
      })}
    </div>
  );
}

function InfoCard({ title, text, icon }: { title: string; text: string; icon: ReactNode }) {
  return <div className="infoCard">{icon}<b>{title}</b><span>{text}</span></div>;
}

function SectionTitle({ title, icon }: { title: string; icon: ReactNode }) {
  return <h2 className="sectionTitle">{icon}{title}</h2>;
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div><span>{icon}{label}</span><b>{value}</b></div>;
}

function fallbackLogToRunEvents(log: ExecutionLogItem[]): RunEvent[] {
  return log.map((item, index) => ({
    trace_id: "history",
    phase: "node",
    node: item.node || `step_${index + 1}`,
    summary: item.summary || "已执行",
    details: item.details,
    status: "done",
    progress: 100,
  }));
}

function markRunEventsDone(events: RunEvent[]): RunEvent[] {
  return events.map((event) => ({ ...event, status: event.status === "error" ? "error" : "done", progress: event.progress ?? 100 }));
}

function appendUniqueEvent(items: RunEvent[], event: RunEvent) {
  const key = runEventKey(event);
  if (items.some((item) => runEventKey(item) === key)) return items;
  return [...items, event];
}

function isMissingRunEvent(event: RunEvent) {
  return event.phase === "error" && event.node === "run" && event.summary.includes("未找到运行任务");
}

function readStatePlan(state: unknown): PlanResponse | null {
  if (!state || typeof state !== "object" || !("result" in state)) return null;
  const result = (state as { result?: unknown }).result;
  if (!result || typeof result !== "object") return null;
  return result as PlanResponse;
}

function buildRunSteps(events: RunEvent[], keepResult = false): RunStepState[] {
  const map = new Map<string, RunStepState>();
  for (const event of events) {
    if (event.phase === "tool") continue;
    if (event.phase === "result" && !keepResult) continue;
    const key = runStepKey(event);
    const current = map.get(key);
    const next: RunStepState = current ? { ...current, ...event, stepKey: key } : { ...event, stepKey: key };
    if (event.status === "running" && !current?.startedAt) next.startedAt = event.timestamp;
    if (event.status === "done") next.finishedAt = event.timestamp;
    if (event.phase === "result" && event.result) next.result = event.result;
    map.set(key, next);
  }
  return Array.from(map.values()).sort((a, b) => stepRank(a) - stepRank(b));
}

function buildToolGroups(events: RunEvent[]) {
  const groups: Record<string, ToolStepState[]> = {};
  const byKey = new Map<string, ToolStepState>();
  for (const event of events) {
    if (event.phase !== "tool" || !event.parent_node) continue;
    const key = `${runStepKey({ ...event, phase: "node", node: event.parent_node })}:${event.agent_name || "shared"}:${event.task_id || "task"}:${event.tool_name || event.node}`;
    byKey.set(key, { ...(byKey.get(key) || {}), ...event });
  }
  for (const tool of byKey.values()) {
    const parent = runStepKey({ ...tool, phase: "node", node: tool.parent_node || "tool_router" });
    groups[parent] = [...(groups[parent] || []), tool];
  }
  for (const parent of Object.keys(groups)) {
    groups[parent].sort((a, b) => toolRank(a.tool_name || a.node) - toolRank(b.tool_name || b.node));
  }
  return groups;
}

function runStepKey(event: RunEvent) {
  if (event.node === "run") return "run";
  return `${event.node}:${eventRound(event)}`;
}

function eventRound(event: RunEvent) {
  const details = asRecord(event.details);
  if (details?.round) return String(details.round);
  return event.revision_round ? `revision_${event.revision_round}` : "initial";
}

function stepRank(event: RunEvent) {
  return roundRank(eventRound(event)) * 100 + phaseRank(event.node);
}

function roundRank(round: string) {
  return round === "auto_replan" || round.startsWith("revision_") ? 1 : 0;
}

function runEventKey(event: RunEvent) {
  return [event.phase, event.parent_node, event.tool_name, event.node, eventRound(event), event.status, event.summary, event.timestamp].join("|");
}

function phaseRank(node: string) {
  return {
    run: -1,
    constraint_extractor: 0,
    date_resolver: 1,
    load_memory: 2,
    need_clarification: 3,
    planner: 4,
    execute_plan: 5,
    synthesize_plan: 8,
    task_router: 5,
    tool_router: 6,
    travel_tool_router: 6,
    errand_tool_router: 6,
    meal_tool_router: 6,
    todo_decomposer: 6,
    candidate_scorer: 7,
    travel_candidate_scorer: 7,
    errand_candidate_scorer: 7,
    meal_candidate_scorer: 7,
    plan_generator: 8,
    travel_plan_generator: 8,
    errand_plan_generator: 8,
    meal_plan_generator: 8,
    todo_plan_generator: 8,
    risk_checker: 9,
    reflection: 10,
    reflection_replan: 5,
    final_response: 11,
  }[node] ?? 99;
}

function toolRank(tool: string) {
  return {
    weather_tool: 0,
    web_search_tool: 1,
    place_search_tool: 2,
    place_evidence_merge: 3,
    place_filter: 4,
    route_tool: 5,
    budget_tool: 6,
  }[tool] ?? 99;
}

function nodeLabel(node: string) {
  return {
    run: "任务启动",
    constraint_extractor: "理解需求",
    date_resolver: "日期解析",
    load_memory: "读取偏好",
    need_clarification: "信息检查",
    planner: "步骤规划",
    execute_plan: "动态工具编排",
    synthesize_plan: "意图计划生成",
    task_router: "任务路由",
    tool_router: "工具调用",
    travel_tool_router: "旅行工具",
    travel_candidate_scorer: "旅行候选",
    travel_plan_generator: "旅行计划",
    errand_tool_router: "跑腿工具",
    errand_candidate_scorer: "跑腿候选",
    errand_plan_generator: "跑腿计划",
    meal_tool_router: "餐饮工具",
    meal_candidate_scorer: "餐饮候选",
    meal_plan_generator: "餐饮计划",
    todo_decomposer: "待办拆解",
    todo_plan_generator: "待办计划",
    candidate_scorer: "地点筛选",
    plan_generator: "生成计划",
    risk_checker: "风险检查",
    reflection: "质量复核",
    final_response: "最终结果",
  }[node] || node;
}

function toolLabel(tool: string) {
  return {
    todo_decompose: "待办拆解",
    weather: "天气",
    place_search: "地点",
    search: "网页来源",
    meal_pick: "餐饮筛选",
    errand_parse: "跑腿整理",
    route: "路线",
    budget: "预算",
    confirm_action: "确认边界",
    weather_tool: "天气查询",
    web_search_tool: "网页搜索",
    place_search_tool: "地点搜索",
    place_evidence_merge: "证据合并",
    place_filter: "地点过滤",
    route_tool: "路线估算",
    budget_tool: "预算计算",
  }[tool] || tool;
}

function metaLabel(key: string) {
  return {
    city: "城市",
    date: "日期",
    condition: "天气",
    temperature: "温度",
    precipitation_probability: "降雨概率",
    outdoor_risk: "户外风险",
    provider: "数据源",
    provider_warning: "降级提示",
    query: "关键词",
    max_results: "数量",
    results_count: "结果数",
    note: "说明",
    raw_places_count: "原始地点",
    city_places_count: "同城地点",
    places_count: "地点数",
    travel_places_count: "行程地点",
    food_places_count: "餐饮候选",
    hotel_places_count: "住宿候选",
    matched_places_count: "命中证据",
    sources_count: "来源数",
    selected_places: "已选地点",
    legs_count: "路段数",
    travel_minutes: "交通分钟",
    budget_limit: "预算上限",
    budget_usage: "预算使用",
    activity_cost: "活动费",
    meal_budget: "餐饮",
    transport_budget: "交通",
    total: "合计",
    unknown_activity_cost_items: "待确认费用",
  }[key] || key;
}

function formatMetaValue(value: unknown) {
  if (Array.isArray(value)) return value.map(String).join("、") || "无";
  if (typeof value === "object" && value) return JSON.stringify(value);
  if (value === true) return "是";
  if (value === false) return "否";
  return String(value ?? "");
}

function asRecord(details: unknown): Record<string, unknown> | null {
  if (!details || typeof details !== "object") return null;
  return details as Record<string, unknown>;
}

function memoryResolutionFromResult(result: PlanResponse): MemoryResolution | null {
  const constraints = asRecord(result.constraints);
  return normalizeMemoryResolution(constraints?.memory_resolution || constraints?.memory);
}

function memoryResolutionFromEvents(events: RunEvent[]): MemoryResolution | null {
  for (const event of [...events].reverse()) {
    const details = asRecord(event.details);
    const direct = normalizeMemoryResolution(details?.memory_resolution || details?.memory);
    if (direct) return direct;
    if (event.node === "load_memory") {
      const fallback = normalizeMemoryResolution({
        applied_likes: details?.likes,
        applied_dislikes: details?.dislikes,
        suppressed_likes: details?.suppressed_likes,
        suppressed_dislikes: details?.suppressed_dislikes,
        source: "profile",
      });
      if (fallback) return fallback;
    }
  }
  return null;
}

function memoryResolutionFromLog(log: ExecutionLogItem[]): MemoryResolution | null {
  for (const item of [...log].reverse()) {
    const details = asRecord(item.details);
    const direct = normalizeMemoryResolution(details?.memory_resolution || details?.memory);
    if (direct) return direct;
    if (item.node === "load_memory") {
      const fallback = normalizeMemoryResolution({
        applied_likes: details?.likes,
        applied_dislikes: details?.dislikes,
        suppressed_likes: details?.suppressed_likes,
        suppressed_dislikes: details?.suppressed_dislikes,
        source: "profile",
      });
      if (fallback) return fallback;
    }
  }
  return null;
}

function normalizeMemoryResolution(value: unknown): MemoryResolution | null {
  const record = asRecord(value);
  if (!record) return null;
  const resolution: MemoryResolution = {
    applied_likes: normalizeStringArray(record.applied_likes || record.likes || record.covered_preferences),
    applied_dislikes: normalizeStringArray(record.applied_dislikes || record.dislikes),
    suppressed_likes: normalizeSuppressedArray(record.suppressed_likes || record.suppressed_preferences),
    suppressed_dislikes: normalizeSuppressedArray(record.suppressed_dislikes),
    source: typeof record.source === "string" ? record.source : undefined,
  };
  if (!resolution.applied_likes?.length && !resolution.applied_dislikes?.length && !resolution.suppressed_likes?.length && !resolution.suppressed_dislikes?.length) return null;
  return resolution;
}

function coveredPreferencesFromEvents(events: RunEvent[], log: ExecutionLogItem[]) {
  const fromEvents = events.flatMap((event) => normalizeStringArray(asRecord(event.details)?.covered_preferences));
  const fromLog = log.flatMap((item) => normalizeStringArray(asRecord(item.details)?.covered_preferences));
  return uniqueStrings([...fromEvents, ...fromLog]);
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? uniqueStrings(value.map(String)) : [];
}

function normalizeSuppressedArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string" || (typeof item === "object" && item));
}

function normalizeSuppressedMemory(items: MemoryResolution["suppressed_likes"], label: string) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (typeof item === "string") return { value: item, reason: `${label}被本次输入或临时开关覆盖` };
    return {
      value: String(item.value || label),
      reason: item.reason || `${label}被本次输入或临时开关覆盖`,
    };
  }).filter((item) => item.value);
}

function normalizeTextItems(items?: unknown[]): DisplayItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .map((title) => ({ title }));
}

function normalizeDisplayItems(items?: unknown[]): DisplayItem[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap((item, index) => {
    if (typeof item === "string") return item.trim() ? [{ title: item.trim() }] : [];
    const record = asRecord(item);
    if (!record) return [];
    const title = firstText(record, ["title", "name", "task", "action", "place", "summary", "label"]) || `项目 ${index + 1}`;
    const meta = firstText(record, ["time", "date", "deadline", "duration", "area", "status", "type"]);
    const description = firstText(record, ["description", "detail", "details", "reason", "note", "content"]);
    const chips = ["priority", "cost", "owner", "tool", "source", "confidence"]
      .map((key) => compactFact(key, record[key]))
      .filter(Boolean) as string[];
    return [{ title, meta, description, chips }];
  });
}

function normalizeFactItems(group: string, value: unknown) {
  const record = asRecord(value);
  if (!record) return [];
  return Object.entries(record)
    .filter(([key, item]) => !["geometry", "polyline", "raw", "raw_response"].includes(key) && isCompactValue(item))
    .slice(0, 8)
    .map(([key, item]) => ({
      group,
      label: metaLabel(key),
      value: formatCompactValue(item),
    }));
}

function firstText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function compactFact(key: string, value: unknown) {
  if (!isCompactValue(value)) return "";
  return `${metaLabel(key)}：${formatCompactValue(value)}`;
}

function isCompactValue(value: unknown) {
  if (value === null || value === undefined || value === "") return false;
  if (["string", "number", "boolean"].includes(typeof value)) return true;
  if (Array.isArray(value)) return value.length > 0 && value.length <= 5 && value.every((item) => typeof item !== "object");
  return false;
}

function formatCompactValue(value: unknown) {
  if (Array.isArray(value)) return value.map(String).join("、");
  if (value === true) return "是";
  if (value === false) return "否";
  return String(value);
}

function detailChips(node: string, record: Record<string, unknown>) {
  const chips: string[] = [];
  if (node === "constraint_extractor") {
    if (record.task_type) chips.push(`任务：${String(record.task_type)}`);
    if (Array.isArray(record.missing_fields) && record.missing_fields.length) chips.push(`缺失：${record.missing_fields.join("、")}`);
    if (record.confidence !== undefined) chips.push(`置信度：${String(record.confidence)}`);
  }
  if (node === "date_resolver") {
    if (record.input) chips.push(`输入：${String(record.input)}`);
    if (record.date_iso) chips.push(`日期：${String(record.date_iso)}`);
    if (record.date_weekday) chips.push(`星期：${String(record.date_weekday)}`);
  }
  if (node === "load_memory") {
    if (Array.isArray(record.likes) && record.likes.length) chips.push(`喜好：${record.likes.slice(0, 3).join("、")}`);
    if (Array.isArray(record.dislikes) && record.dislikes.length) chips.push(`避免：${record.dislikes.slice(0, 3).join("、")}`);
  }
  if (node === "planner" && Array.isArray(record.steps)) chips.push(`步骤数：${record.steps.length}`);
  if (node === "task_router" && record.task_type) chips.push(`分支：${taskTypeLabel(record.task_type)}`);
  if (["tool_router", "travel_tool_router", "errand_tool_router", "meal_tool_router"].includes(node)) {
    if (record.search_provider) chips.push(`搜索源：${String(record.search_provider)}`);
    if (record.place_provider) chips.push(`地点源：${String(record.place_provider)}`);
    if (record.search_results_count !== undefined) chips.push(`网页：${String(record.search_results_count)} 条`);
    if (record.research_sources !== undefined) chips.push(`可用来源：${String(record.research_sources)} 条`);
    if (record.raw_places_count !== undefined) chips.push(`原始地点：${String(record.raw_places_count)} 个`);
    if (record.city_places_count !== undefined) chips.push(`同城地点：${String(record.city_places_count)} 个`);
    if (record.places_count !== undefined) chips.push(`地点：${String(record.places_count)} 个`);
    if (record.food_places_count !== undefined) chips.push(`餐饮：${String(record.food_places_count)} 个`);
  }
  if (["candidate_scorer", "travel_candidate_scorer"].includes(node) && Array.isArray(record.top_candidates)) chips.push(`Top：${record.top_candidates.slice(0, 3).join("、")}`);
  if (["errand_candidate_scorer", "meal_candidate_scorer"].includes(node) && record.candidates_count !== undefined) chips.push(`候选：${String(record.candidates_count)}`);
  if (["plan_generator", "travel_plan_generator", "errand_plan_generator", "meal_plan_generator", "todo_plan_generator"].includes(node)) {
    if (record.budget_total !== undefined) chips.push(`预算总计：¥${String(record.budget_total)}`);
    if (Array.isArray(record.selected_places)) chips.push(`已选地点：${record.selected_places.length}`);
    if (record.items_count !== undefined) chips.push(`事项：${String(record.items_count)}`);
    if (record.candidates_count !== undefined) chips.push(`候选：${String(record.candidates_count)}`);
    if (record.tasks_count !== undefined) chips.push(`任务：${String(record.tasks_count)}`);
  }
  if (node === "risk_checker") {
    if (Array.isArray(record.risks) && record.risks.length) chips.push(`风险：${record.risks.length} 项`);
    if (Array.isArray(record.fallbacks) && record.fallbacks.length) chips.push(`备选：${record.fallbacks.length} 项`);
  }
  if (node === "reflection") {
    if (record.passed !== undefined) chips.push(`通过：${String(record.passed)}`);
    if (record.next_action) chips.push(`下一步：${String(record.next_action)}`);
  }
  if (node === "reflection_replan") {
    chips.push("补充中");
    if (record.next_action) chips.push(`下一步：${String(record.next_action)}`);
  }
  return chips;
}

function detailList(node: string, record: Record<string, unknown>) {
  const lines: string[] = [];
  if (["tool_router", "travel_tool_router", "errand_tool_router", "meal_tool_router"].includes(node)) {
    if (record.city) lines.push(`搜索城市：${String(record.city)}`);
    if (record.search_query) lines.push(`搜索关键词：${String(record.search_query)}`);
    if (record.place_query) lines.push(`地点关键词：${String(record.place_query)}`);
    if (record.provider_warning) lines.push(`数据源提示：${String(record.provider_warning)}`);
    if (record.error) lines.push(`工具错误：${String(record.error)}`);
    if (Array.isArray(record.avoid) && record.avoid.length) lines.push(`过滤项：${record.avoid.join("、")}`);
    if (Array.isArray(record.skipped_tools) && record.skipped_tools.length) lines.push(`跳过工具：${record.skipped_tools.join("、")}`);
  }
  if (["candidate_scorer", "travel_candidate_scorer"].includes(node) && Array.isArray(record.top_candidates)) {
    lines.push(...record.top_candidates.slice(0, 5).map((item) => `候选地点：${String(item)}`));
  }
  if (["plan_generator", "travel_plan_generator"].includes(node) && Array.isArray(record.covered_preferences)) lines.push(`覆盖偏好：${record.covered_preferences.join("、")}`);
  if (["plan_generator", "travel_plan_generator", "errand_plan_generator", "meal_plan_generator", "todo_plan_generator"].includes(node) && Array.isArray(record.suppressed_preferences)) {
    lines.push(`本次覆盖画像：${record.suppressed_preferences.map((item) => {
      const recordItem = asRecord(item);
      return recordItem ? `${String(recordItem.value || "偏好")}（${String(recordItem.reason || "本次覆盖")}）` : String(item);
    }).join("、")}`);
  }
  if (node === "risk_checker" && Array.isArray(record.risks)) lines.push(...record.risks.map((item) => `风险：${String(item)}`));
  if (node === "reflection" && Array.isArray(record.issues)) lines.push(...record.issues.map((item) => `问题：${String(item)}`));
  if (node === "reflection_replan") {
    if (record.review) lines.push(`复核结论：${String(record.review)}`);
    if (Array.isArray(record.issues)) lines.push(...record.issues.map((item) => `待补齐：${String(item)}`));
  }
  return lines;
}

function profileAxes(profile: ProfileResponse) {
  const likes = profile.profile.likes || [];
  const dislikes = profile.profile.dislikes || [];
  const tagLabels = profile.stats.tag_counts.map((item) => item.label).join(" ");
  const budgetStyle = profile.profile.budget_style || "";
  const pace = profile.profile.pace || "";
  return [
    { label: "省钱", value: budgetStyle.includes("省") || tagLabels.includes("太贵") ? 86 : 62 },
    { label: "舒适", value: pace.includes("轻松") || dislikes.some((item) => item.includes("太赶")) ? 88 : 66 },
    { label: "新鲜感", value: Math.min(92, 54 + likes.length * 3) },
    { label: "低体力", value: dislikes.some((item) => item.includes("爬山") || item.includes("太赶")) ? 82 : 58 },
    { label: "高效率", value: tagLabels.includes("路线顺") ? 84 : 64 },
  ];
}

function profilePreferenceConflicts(profile: ProfileResponse) {
  const likes = new Set((profile.profile.likes || []).map((item) => item.trim()).filter(Boolean));
  return uniqueStrings((profile.profile.dislikes || []).filter((item) => likes.has(item.trim()))).slice(0, 8);
}

function estimateQualityScore(plan: FinalPlan, result: PlanResponse): QualityScore {
  if (plan.task_type && plan.task_type !== "travel") return estimateLifeTaskQualityScore(plan, result);
  const sources = plan.travel_research?.sources?.length || 0;
  const itinerary = plan.itinerary || [];
  const unknownCosts = plan.budget?.unknown_activity_cost_items?.length || 0;
  const warnings = qualityWarningList(result).length;
  const dimensions = [
    scoreMetric("evidence", "证据充分度", 58 + Math.min(sources, 5) * 7 + (itinerary.some((item) => item.evidence?.length) ? 8 : 0), "来源、地点证据和票价依据的完整程度"),
    scoreMetric("route", "路线顺畅度", itinerary.length ? 66 + Math.min(itinerary.length, 5) * 5 : 40, "行程点数量、路线信息和折返风险的综合估计"),
    scoreMetric("budget", "预算可信度", 82 - Math.min(unknownCosts, 4) * 7, "预算是否命中上限，以及未确认费用是否过多"),
    scoreMetric("weather", "天气适配", plan.weather ? 86 : 58, "是否结合天气并给出对应兜底"),
    scoreMetric("preference", "偏好命中", 76, "是否覆盖用户偏好并避开明确排斥项"),
    scoreMetric("risk", "风险兜底", 70 + Math.min(plan.fallbacks?.length || 0, 3) * 7 - Math.min(warnings, 4) * 7, "风险提示、备选方案和质量警告情况"),
  ];
  return {
    overall: Math.round(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length),
    dimensions,
  };
}

function trustFacts(
  plan: FinalPlan,
  result: PlanResponse,
  providerHealth: ProviderHealthResponse | null,
  confirmedAction: ConfirmedActionState | null,
) {
  const items = plan.itinerary || [];
  const sources = plan.travel_research?.sources?.length || 0;
  const realPlaces = items.filter((item) => !isUnresolvedPlaceItem(item) && !isFallbackProviderItem(item)).length;
  const fallbackPlaces = items.filter(isFallbackProviderItem).length;
  const unknownCosts = plan.budget?.unknown_activity_cost_items?.length || items.filter((item) => !item.cost_known).length;
  const hasConfirm = Boolean(result.confirmations?.length || plan.confirm_actions?.length);
  const providerIssues = providerHealth?.providers.filter((item) => item.status !== "ok") || [];
  const warnings = qualityWarningList(result).length;

  return [
    {
      key: "sources",
      label: "网页/资料来源",
      value: `${sources} 条`,
      note: sources ? "计划引用了可点击来源。" : "当前主要依赖地图、天气或规则兜底。",
      level: sources ? "ok" : "warn",
    },
    {
      key: "places",
      label: "可导航地点",
      value: `${realPlaces}/${items.length || 0}`,
      note: fallbackPlaces ? `${fallbackPlaces} 个地点来自兜底候选，出发前要再确认。` : "地点未标记为兜底占位。",
      level: fallbackPlaces || !realPlaces ? "warn" : "ok",
    },
    {
      key: "budget",
      label: "未知费用",
      value: `${unknownCosts} 项`,
      note: unknownCosts ? "票价/消费未完全确认，预算是保守参考。" : "预算项没有明显未知费用。",
      level: unknownCosts ? "warn" : "ok",
    },
    {
      key: "providers",
      label: "工具健康",
      value: providerIssues.length ? `${providerIssues.length} 项降级` : "正常",
      note: providerIssues.length ? providerIssues.map((item) => `${providerLabel(item.name)}=${item.provider}`).join("，") : "关键 provider 配置可用于演示。",
      level: providerIssues.length ? "warn" : "ok",
    },
    {
      key: "confirm",
      label: "确认边界",
      value: confirmedAction ? "已确认" : hasConfirm ? "待确认" : "无需确认",
      note: confirmedAction ? "已记录确认，但不会自动执行外部动作。" : hasConfirm ? "日历、提醒、订座、发消息、支付等不会自动执行。" : "当前计划没有外部副作用动作。",
      level: confirmedAction || !hasConfirm ? "ok" : "warn",
    },
    {
      key: "warnings",
      label: "质量警告",
      value: `${warnings} 条`,
      note: warnings ? "存在未满足项或自动复核提示。" : "反思节点未返回额外警告。",
      level: warnings ? "warn" : "ok",
    },
  ] as Array<{ key: string; label: string; value: string; note: string; level: "ok" | "warn" }>;
}

function trustSummary(facts: Array<{ level: "ok" | "warn" }>) {
  const warnings = facts.filter((item) => item.level === "warn").length;
  if (!warnings) return "这份计划具备来源、地点、预算和确认边界说明，适合直接作为演示结果展示。";
  return `这份计划可以演示，但还有 ${warnings} 类信息需要标注为待确认，避免把兜底结果误当成已验证事实。`;
}

function isFallbackProviderItem(item: ItineraryItem | Record<string, unknown>) {
  const provider = String((item as Record<string, unknown>).provider || "");
  const sourceTitle = String((item as Record<string, unknown>).source_title || "");
  const text = [item.place, item.address, item.area, sourceTitle].filter(Boolean).join(" ");
  return ["city_seed", "city_fallback", "mock"].includes(provider) || /兜底|候选|待确认|mock/i.test(text);
}

function providerLabel(name: string) {
  return {
    llm: "LLM",
    weather: "天气",
    place: "地点",
    search: "搜索",
    route: "路线",
  }[name] || name;
}

function auditActionLabel(action: string) {
  return {
    plan_start: "开始规划",
    plan_generated: "生成计划",
    plan_replanned: "重规划",
    action_confirmed: "确认动作",
    calendar_exported: "导出日历",
    feedback_submitted: "提交反馈",
  }[action] || action;
}

function auditDetails(value?: string | null) {
  if (!value) return "";
  try {
    const record = JSON.parse(value) as Record<string, unknown>;
    return Object.entries(record)
      .filter(([, item]) => item !== null && item !== undefined && item !== "")
      .slice(0, 4)
      .map(([key, item]) => `${metaLabel(key)}：${formatCompactValue(item)}`)
      .join(" · ");
  } catch {
    return value;
  }
}

function estimateLifeTaskQualityScore(plan: FinalPlan, result: PlanResponse): QualityScore {
  const hasTimeline = Boolean(plan.itinerary?.length);
  const hasConfirm = Boolean(result.confirmations?.length || plan.confirm_actions?.length);
  const taskCount = Number(plan.todo_items?.length || plan.errand_items?.length || plan.meal_candidates?.length || 0);
  const warnings = qualityWarningList(result).length;
  const dimensions = [
    scoreMetric("task_fit", "场景识别", plan.task_type ? 88 : 55, "是否识别为跑腿、餐饮或待办场景"),
    scoreMetric("execution", "可执行性", hasTimeline ? 84 : 52, "是否给出时间轴、时间块或候选安排"),
    scoreMetric("coverage", "任务覆盖", 62 + Math.min(taskCount, 5) * 6, "拆解出的事项、候选或任务数量"),
    scoreMetric("confirmation", "确认边界", hasConfirm ? 92 : 50, "日历、提醒、订座、支付等外部动作是否只生成待确认项"),
    scoreMetric("risk", "风险提示", 82 - Math.min(warnings, 4) * 8, "质量警告和待确认信息情况"),
  ];
  return {
    overall: Math.round(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length),
    dimensions,
  };
}

function scoreMetric(key: string, label: string, score: number, reason: string) {
  return { key, label, score: clamp(Math.round(score), 0, 100), reason };
}

function memoryTypeLabel(type: string) {
  return {
    like: "喜欢",
    dislike: "避开",
    pace: "节奏",
    budget_style: "预算",
  }[type] || "记忆";
}

function readSettings(): AppSettings {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return defaultSettings;
  try {
    return { ...defaultSettings, ...JSON.parse(raw) } as AppSettings;
  } catch {
    return defaultSettings;
  }
}

async function buildRequestContext(input: string, defaultCity: string, memoryOverrides?: MemoryOverrides): Promise<PlanRequestContext> {
  const context: PlanRequestContext = {};
  const city = defaultCity.trim();
  if (city && !mentionsLocation(input, city)) context.default_city = city;
  if (memoryOverrides && hasMemoryOverrides(memoryOverrides)) context.memory_overrides = memoryOverrides;
  if (!mentionsCurrentLocation(input)) return context;
  const location = await getBrowserLocation();
  if (location) context.origin_location = `${location.longitude},${location.latitude}`;
  return context;
}

function buildMemoryOverrides({
  disabledLikes,
  disabledDislikes,
}: {
  disabledLikes: string[];
  disabledDislikes: string[];
}): MemoryOverrides {
  return {
    disabled_likes: uniqueStrings(disabledLikes),
    disabled_dislikes: uniqueStrings(disabledDislikes),
  };
}

function hasMemoryOverrides(overrides: MemoryOverrides) {
  return Boolean(
    overrides.disabled_likes?.length
    || overrides.disabled_dislikes?.length
  );
}

function splitPreferenceText(value: string) {
  return uniqueStrings(value.split(/[、，,;\n]/).map((item) => item.trim()).filter(Boolean));
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function toggleString(items: string[], value: string) {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}

function extractExplicitConstraints(input: string) {
  const patterns = [
    /(?:不要|不想|别|避开|避免|不喝|不吃|不去)([^，。；;,.、\n]{1,16})/g,
    /预算\s*([0-9]{2,6})/g,
  ];
  return uniqueStrings(patterns.flatMap((pattern) => [...input.matchAll(pattern)].map((match) => match[0].trim()))).slice(0, 5);
}

function mentionsCurrentLocation(input: string) {
  return ["当前位置", "现在这个地方", "我这里", "从这里", "从我这", "附近"].some((word) => input.includes(word));
}

function getBrowserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: Number(position.coords.latitude.toFixed(6)),
        longitude: Number(position.coords.longitude.toFixed(6)),
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 300000 },
    );
  });
}

function mentionsLocation(input: string, defaultCity: string) {
  if (input.includes(defaultCity)) return true;
  const commonCities = ["北京", "上海", "天津", "重庆", "广州", "深圳", "杭州", "南京", "苏州", "成都", "武汉", "西安", "长沙", "厦门", "福州", "泉州", "青岛", "宁波", "郑州", "合肥", "昆明"];
  if (commonCities.some((city) => input.includes(city))) return true;
  return /[\u4e00-\u9fa5]{2,8}(市|县|区|镇|乡|岛|山|湖|湾|路|园|街)/.test(input);
}

function parseHistoryPlan(value: HistoryItem["final_plan"]): FinalPlan {
  if (!value) return {};
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as FinalPlan;
  } catch {
    return {};
  }
}

function hasPlanContent(plan?: FinalPlan | null) {
  if (!plan) return false;
  return Boolean(
    plan.title
    || plan.goal
    || plan.summary
    || plan.assistant_message
    || plan.itinerary?.length
    || plan.travel_research?.sources?.length
    || plan.budget?.total
  );
}

function firstConfirmAction(plan: FinalPlan, result?: PlanResponse | null) {
  const [standardAction] = result?.confirmations || [];
  if (standardAction) return standardAction;
  const [action] = plan.confirm_actions || [];
  return isRecord(action) ? action : null;
}

function buildShareText(plan: FinalPlan, result: PlanResponse) {
  const title = plan.title || plan.goal || "LifeOps 计划";
  const date = plan.date ? `日期：${plan.date}` : "";
  const summary = truncateText(agentPlanBrief(plan, result) || planSummary(plan, result), 96);
  const route = groupItineraryByDay(plan.itinerary || [])
    .flatMap((group) => group.items)
    .slice(0, 5)
    .map((item) => `${item.time || ""} ${item.place || item.address || item.area || ""}`.trim())
    .filter(Boolean)
    .join("\n");
  const budget = typeof plan.budget?.total === "number" ? `预计：${formatMoney(plan.budget.total)}` : "";
  const risk = (plan.risks?.[0] || plan.fallbacks?.[0]) ? `提醒：${truncateText(plan.risks?.[0] || plan.fallbacks?.[0] || "", 64)}` : "";
  return [title, date, summary, route, budget, risk].filter(Boolean).join("\n\n");
}

function truncateText(value: string, limit: number) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function buildPlanDocumentHtml(plan: FinalPlan, result: PlanResponse) {
  const title = escapeHtml(plan.title || plan.goal || "LifeOps 可执行计划");
  const summary = escapeHtml(agentPlanBrief(plan, result) || planSummary(plan, result) || "这是一份 LifeOps 生成的可执行计划。");
  const date = escapeHtml(String(plan.date || "日期待确认"));
  const taskType = escapeHtml(taskTypeLabel(plan.task_type));
  const budgetTotal = escapeHtml(formatMoney(plan.budget?.total));
  const budgetLimit = escapeHtml(formatMoney(plan.budget?.budget_limit));
  const days = groupItineraryByDay(plan.itinerary || []);
  const timeline = days.length
    ? days.map((group) => `
      <section class="day">
        <h2>Day ${escapeHtml(group.day)}</h2>
        ${group.items.map((item) => `
          <article class="stop">
            <time>${escapeHtml(item.time || "时间待确认")}</time>
            <div>
              <h3>${escapeHtml(item.place || item.address || item.area || "地点待确认")}</h3>
              <p>${escapeHtml(item.reason || item.play_points?.[0] || "")}</p>
              ${item.address ? `<small>${escapeHtml(item.address)}</small>` : ""}
            </div>
            <b>${escapeHtml(item.cost_known ? formatMoney(item.cost) : item.cost_note || "费用待确认")}</b>
          </article>
        `).join("")}
      </section>
    `).join("")
    : `<p class="empty">暂无时间线。</p>`;
  const risks = [...(plan.risks || []), ...(plan.fallbacks || [])].slice(0, 8);
  const sources = (plan.travel_research?.sources || []).slice(0, 8);
  const todos = normalizeDisplayItems(plan.todo_items || plan.errand_items || result.confirmations || plan.confirm_actions).slice(0, 8);
  const trust = trustFacts(plan, result, null, null);

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root { color-scheme: light; --ink:#243026; --muted:#6b766d; --line:#dbe4dc; --paper:#fbfaf5; --green:#2f735d; --accent:#d5532f; }
    * { box-sizing: border-box; }
    body { margin: 0; font: 15px/1.65 "Microsoft YaHei", "PingFang SC", sans-serif; color: var(--ink); background: #eef3ee; }
    main { max-width: 980px; margin: 0 auto; padding: 34px 24px 56px; }
    .hero { padding: 34px; border-radius: 18px; background: var(--paper); border: 1px solid var(--line); box-shadow: 0 22px 60px rgba(30,45,34,.12); }
    .kicker { color: var(--green); font-weight: 800; letter-spacing: .02em; }
    h1 { margin: 10px 0 14px; font-size: clamp(30px, 5vw, 54px); line-height: 1.05; }
    h2 { margin: 0 0 14px; font-size: 22px; }
    h3, p { margin: 0; }
    .summary { max-width: 760px; color: var(--muted); font-size: 17px; }
    .stats { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; margin-top: 22px; }
    .stat, .panel, .day { background: rgba(255,255,255,.76); border: 1px solid var(--line); border-radius: 14px; padding: 18px; }
    .stat span { display:block; color: var(--muted); font-size: 12px; }
    .stat b { font-size: 18px; }
    .grid { display: grid; grid-template-columns: 1.3fr .7fr; gap: 18px; margin-top: 18px; }
    .day { margin-bottom: 14px; }
    .stop { display: grid; grid-template-columns: 116px 1fr auto; gap: 16px; padding: 16px 0; border-top: 1px solid var(--line); }
    .stop:first-of-type { border-top: 0; }
    time { color: var(--accent); font-weight: 900; }
    small { display:block; color: var(--muted); margin-top: 5px; }
    .stop b { white-space: nowrap; color: var(--green); }
    ul { margin: 0; padding-left: 20px; }
    li { margin: 7px 0; }
    a { color: var(--green); text-decoration: none; }
    .empty { color: var(--muted); }
    .footer { margin-top: 18px; color: var(--muted); font-size: 12px; text-align: center; }
    @media (max-width: 760px) { .stats, .grid { grid-template-columns: 1fr; } .stop { grid-template-columns: 1fr; } main { padding: 16px; } }
    @media print { body { background: white; } main { padding: 0; } .hero, .panel, .day { box-shadow: none; break-inside: avoid; } }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div class="kicker">LifeOps 可执行计划 / ${taskType}</div>
      <h1>${title}</h1>
      <p class="summary">${summary}</p>
      <div class="stats">
        <div class="stat"><span>日期</span><b>${date}</b></div>
        <div class="stat"><span>预算上限</span><b>${budgetLimit}</b></div>
        <div class="stat"><span>预计花费</span><b>${budgetTotal}</b></div>
        <div class="stat"><span>天气</span><b>${escapeHtml(weatherText(plan.weather))}</b></div>
      </div>
    </section>
    <section class="grid">
      <div>${timeline}</div>
      <aside>
        <section class="panel">
          <h2>可信度说明</h2>
          <ul>${trust.map((item) => `<li><b>${escapeHtml(item.label)}：${escapeHtml(item.value)}</b><br/><small>${escapeHtml(item.note)}</small></li>`).join("")}</ul>
        </section>
        <section class="panel">
          <h2>任务/确认</h2>
          ${todos.length ? `<ul>${todos.map((item) => `<li><b>${escapeHtml(item.title)}</b>${item.description ? `<br/><small>${escapeHtml(item.description)}</small>` : ""}</li>`).join("")}</ul>` : `<p class="empty">暂无确认动作。</p>`}
        </section>
        <section class="panel">
          <h2>风险和备选</h2>
          ${risks.length ? `<ul>${risks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : `<p class="empty">暂无明显风险。</p>`}
        </section>
        <section class="panel">
          <h2>参考来源</h2>
          ${sources.length ? `<ul>${sources.map((source) => `<li><a href="${escapeHtml(source.url)}">${escapeHtml(source.title)}</a></li>`).join("")}</ul>` : `<p class="empty">${escapeHtml(plan.travel_research?.note || "暂无来源。")}</p>`}
        </section>
      </aside>
    </section>
    <div class="footer">Generated by LifeOps. Open this file in a browser, or print it to PDF.</div>
  </main>
</body>
</html>`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function historyMatches(item: HistoryItem, keyword: string, dateFrom: string, dateTo: string) {
  const plan = parseHistoryPlan(item.final_plan);
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (normalizedKeyword) {
    const haystack = [item.user_input, item.created_at, plan.title, plan.goal, plan.date].filter(Boolean).join(" ").toLowerCase();
    if (!haystack.includes(normalizedKeyword)) return false;
  }
  const createdDate = toDateOnly(item.created_at);
  if (dateFrom && (!createdDate || createdDate < dateFrom)) return false;
  if (dateTo && (!createdDate || createdDate > dateTo)) return false;
  return true;
}

function toDateOnly(value?: string) {
  return value ? value.slice(0, 10) : "";
}

function routeStops(plan: FinalPlan) {
  const items = groupItineraryByDay(plan.itinerary || []).flatMap((group) => group.items);
  const seen = new Set<string>();
  return items
    .filter((item) => item.place || item.address || item.area)
    .filter((item) => !isUnresolvedPlaceItem(item))
    .map((item) => ({
      time: item.time || "",
      place: item.place || item.address || item.area || "地点待确认",
      area: item.area || "",
      address: item.address || "",
      location: item.location || "",
      map_url: item.map_url || "",
    }))
    .filter((item) => {
      const key = `${item.place}-${item.address}-${item.time}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function isUnresolvedPlaceItem(item: ItineraryItem | { place?: string | null; area?: string | null; address?: string | null }) {
  return isUnresolvedPlaceText([item.place, item.address, item.area].filter(Boolean).join(" "));
}

function isUnresolvedPlaceText(value: unknown) {
  if (typeof value !== "string") return false;
  const text = value.trim();
  if (!text) return false;
  return /候选|地图搜索|核心游玩区|夜景.?步行街|待搜索|待确认|未找到|泛化|占位/.test(text);
}

function routePoint(index: number, total: number) {
  if (total <= 1) return { x: 50, y: 32 };
  const columns = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(total))));
  const rows = Math.ceil(total / columns);
  const row = Math.floor(index / columns);
  const column = index % columns;
  const rowSize = row === rows - 1 ? total - row * columns || columns : columns;
  const visualColumn = row % 2 === 0 ? column : rowSize - 1 - column;
  const xGap = rowSize > 1 ? 72 / (rowSize - 1) : 0;
  const yGap = rows > 1 ? 42 / (rows - 1) : 0;
  return {
    x: rowSize > 1 ? 14 + visualColumn * xGap : 50,
    y: rows > 1 ? 11 + row * yGap : 32,
  };
}

function parseLocation(location?: string | null) {
  if (!location || !location.includes(",")) return null;
  const [lonText, latText] = location.split(",", 2);
  const lon = Number(lonText);
  const lat = Number(latText);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  if (lon < -180 || lon > 180 || lat < -90 || lat > 90) return null;
  return { lon, lat };
}

function osrmRouteUrl(coords: Array<{ lon: number; lat: number }>) {
  const path = coords.map((coord) => `${coord.lon},${coord.lat}`).join(";");
  return `https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson`;
}

function mapViewport(
  coords: Array<{ lon: number; lat: number }>,
  zoomDelta = 0,
  pan = { x: 0, y: 0 },
  size = { width: 640, height: 360 },
) {
  const lons = coords.map((coord) => coord.lon);
  const lats = coords.map((coord) => coord.lat);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const zoom = clamp(mapZoom(Math.max(maxLon - minLon, maxLat - minLat)) + zoomDelta, 8, 17);
  const pixels = coords.map((coord) => lonLatToPixel(coord.lon, coord.lat, zoom));
  const minX = Math.min(...pixels.map((point) => point.x));
  const maxX = Math.max(...pixels.map((point) => point.x));
  const minY = Math.min(...pixels.map((point) => point.y));
  const maxY = Math.max(...pixels.map((point) => point.y));
  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  const aspect = Math.max(size.width, 1) / Math.max(size.height, 1);
  let width = Math.max((maxX - minX) * 1.65, 560);
  let height = Math.max((maxY - minY) * 1.65, 320);
  if (width / height < aspect) {
    width = height * aspect;
  } else {
    height = width / aspect;
  }
  return {
    zoom,
    minX: center.x - width / 2 + pan.x,
    maxX: center.x + width / 2 + pan.x,
    minY: center.y - height / 2 + pan.y,
    maxY: center.y + height / 2 + pan.y,
    width: Math.max(size.width, 1),
    height: Math.max(size.height, 1),
  };
}

function mapZoom(span: number) {
  if (span > 0.25) return 10;
  if (span > 0.12) return 11;
  if (span > 0.06) return 12;
  if (span > 0.025) return 13;
  if (span > 0.012) return 14;
  return 15;
}

function coordinateLabelOffset(index: number, points: Array<{ x: number; y: number }>, size = { width: 640, height: 360 }) {
  const point = points[index];
  const nearby = points.filter((other, otherIndex) => {
    if (otherIndex === index) return false;
    return Math.hypot(other.x - point.x, other.y - point.y) < 86;
  }).length;
  const clusterOffsets = [
    { x: 14, y: -48 },
    { x: 14, y: 18 },
    { x: -136, y: -48 },
    { x: -136, y: 18 },
    { x: 14, y: -78 },
    { x: -136, y: -78 },
  ];
  if (nearby) return clusterOffsets[index % clusterOffsets.length];
  const x = point.x > size.width - 150 ? -136 : 14;
  const y = point.y > size.height - 86 ? -48 : 14;
  return { x, y };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function projectCoordinate(coord: { lon: number; lat: number }, viewport: ReturnType<typeof mapViewport>) {
  const pixel = lonLatToPixel(coord.lon, coord.lat, viewport.zoom);
  return {
    x: ((pixel.x - viewport.minX) / (viewport.maxX - viewport.minX)) * viewport.width,
    y: ((pixel.y - viewport.minY) / (viewport.maxY - viewport.minY)) * viewport.height,
  };
}

function mapTiles(viewport: ReturnType<typeof mapViewport>) {
  const minTileX = Math.floor(viewport.minX / 256);
  const maxTileX = Math.floor(viewport.maxX / 256);
  const minTileY = Math.floor(viewport.minY / 256);
  const maxTileY = Math.floor(viewport.maxY / 256);
  const tiles: Array<{ x: number; y: number; z: number; left: number; top: number; width: number; height: number }> = [];
  const scale = 2 ** viewport.zoom;
  for (let x = minTileX; x <= maxTileX; x += 1) {
    for (let y = minTileY; y <= maxTileY; y += 1) {
      if (y < 0 || y >= scale) continue;
      tiles.push({
        x: ((x % scale) + scale) % scale,
        y,
        z: viewport.zoom,
        left: ((x * 256 - viewport.minX) / (viewport.maxX - viewport.minX)) * viewport.width - 1,
        top: ((y * 256 - viewport.minY) / (viewport.maxY - viewport.minY)) * viewport.height - 1,
        width: (256 / (viewport.maxX - viewport.minX)) * viewport.width + 2,
        height: (256 / (viewport.maxY - viewport.minY)) * viewport.height + 2,
      });
    }
  }
  return tiles;
}

function amapTileUrl(tile: { x: number; y: number; z: number }) {
  const subdomain = ((tile.x + tile.y) % 4) + 1;
  return `https://webrd0${subdomain}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x=${tile.x}&y=${tile.y}&z=${tile.z}`;
}

function lonLatToPixel(lon: number, lat: number, zoom: number) {
  const size = 256 * 2 ** zoom;
  const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const sinLat = Math.sin((clampedLat * Math.PI) / 180);
  return {
    x: ((lon + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * size,
  };
}

function formatMoney(value: unknown) {
  return typeof value === "number" ? `¥${value}` : "待确认";
}

function taskTypeLabel(value: unknown) {
  return {
    travel: "旅行/本地出行",
    errand: "跑腿任务",
    meal: "餐饮计划",
    todo: "待办拆解",
    mixed: "综合生活任务",
    replan: "重规划",
  }[String(value || "travel")] || "生活规划";
}

function intentTaskLabel(value: unknown) {
  return {
    travel: "出行",
    errand: "跑腿",
    meal: "餐饮",
    todo: "待办",
  }[String(value || "")] || "任务";
}

function timelineTitle(value: unknown) {
  return {
    errand: "跑腿时间轴",
    meal: "餐饮候选时间轴",
    todo: "待办时间块",
  }[String(value || "")] || "路线时间轴";
}

function detailTabs(value: unknown) {
  if (value === "todo") return ["总览", "路线", "预算", "过程"];
  if (value === "meal") return ["总览", "路线", "吃住", "预算", "来源", "过程"];
  if (value === "errand") return ["总览", "路线", "预算", "来源", "过程"];
  return ["总览", "路线", "吃住", "预算", "来源", "过程"];
}

function qualityWarningList(result: PlanResponse | null) {
  return (result?.quality_warnings || []).filter(Boolean);
}

function groupItineraryByDay(items: ItineraryItem[]) {
  const groups = new Map<number, ItineraryItem[]>();
  let inferredDay = 1;
  let previousStart: number | null = null;
  for (const item of items) {
    const start = itineraryStart(item.time);
    if (!item.day && previousStart !== null && start + 90 < previousStart) {
      inferredDay += 1;
    }
    const day = item.day ? normalizeDay(item.day) : inferredDay;
    groups.set(day, [...(groups.get(day) || []), item]);
    if (start < 24 * 60) previousStart = start;
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, groupItems]) => ({
      day,
      items: [...groupItems].sort((a, b) => itineraryStart(a.time) - itineraryStart(b.time)),
    }));
}

function normalizeDay(value: ItineraryItem["day"]) {
  const parsed = Number(value || 1);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function itineraryStart(value?: string | null) {
  if (!value) return 24 * 60;
  const [hourText, minuteText] = value.split("-", 1)[0].split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 24 * 60;
  return hour * 60 + minute;
}

function planSummary(plan: FinalPlan, result: PlanResponse) {
  const raw = plan.summary || cleanUserSummary(plan.assistant_message || result.assistant_message || "");
  if (raw) {
    return raw
      .replace(/\*\*/g, "")
      .split(/\n+/)
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .filter((line) => line && !isProcessLine(line))
      .slice(0, 3)
      .join("\n");
  }
  const groups = groupItineraryByDay(plan.itinerary || []);
  const placeCount = groups.reduce((total, group) => total + group.items.length, 0);
  const realPlaceCount = groups.reduce((total, group) => total + group.items.filter((item) => !isUnresolvedPlaceItem(item)).length, 0);
  const days = groups.length || 1;
  const title = plan.title || plan.goal || "这份行程";
  if (!realPlaceCount && placeCount) return `${title}目前只有候选占位，还没有解析出可导航的真实地点；需要重新搜索或补充更具体的区域、偏好后再生成路线。`;
  return `${title}已按 ${days} 天安排，共 ${placeCount} 个主要停留点；每一天会按时间顺序展开，方便你直接照着走或挑选其中一段执行。`;
}

function agentPlanBrief(plan: FinalPlan, result: PlanResponse) {
  const raw = plan.summary || cleanUserSummary(plan.assistant_message || result.assistant_message || "");
  if (raw) {
    const cleaned = raw
      .replace(/\*\*/g, "")
      .split(/\n+/)
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .filter((line) => line && !isProcessLine(line))
      .slice(0, 2)
      .join(" ");
    if (cleaned) return cleaned;
  }

  if (plan.task_type === "todo") {
    const tasks = normalizeDisplayItems(plan.todo_items).map((item) => item.title).slice(0, 4);
    const blocks = normalizeDisplayItems(plan.time_blocks).map((item) => item.title).slice(0, 3);
    const confirms = normalizeDisplayItems(result.confirmations || plan.confirm_actions).map((item) => item.title).slice(0, 2);
    return [
      tasks.length ? `这次会先处理 ${tasks.join("、")}。` : "这次计划会把目标拆成可执行任务。",
      blocks.length ? `时间上按 ${blocks.join("、")} 推进。` : "",
      confirms.length ? `需要你最后确认 ${confirms.join("、")}。` : "",
    ].filter(Boolean).join("");
  }

  const groups = groupItineraryByDay(plan.itinerary || []);
  const items = groups.flatMap((group) => group.items);
  const places = items.filter((item) => !isUnresolvedPlaceItem(item)).map((item) => item.place || item.area).filter(Boolean).slice(0, 4) as string[];
  const activities = items.flatMap((item) => item.play_points || []).filter(Boolean).slice(0, 5);
  const foods = (plan.meal_candidates || plan.lifestyle_places?.foods || []).map((item) => item.name).filter(Boolean).slice(0, 2) as string[];
  const weather = plan.weather ? `当天参考天气是${weatherText(plan.weather)}，` : "";
  const budget = typeof plan.budget?.total === "number" ? `预计花费约 ${formatMoney(plan.budget.total)}。` : "";

  if (places.length || activities.length || foods.length) {
    return [
      places.length ? `这次计划围绕${places.join("、")}展开。` : "这次计划还没有拿到可导航的真实地点，需要补齐 POI 后才能形成可靠路线。",
      activities.length ? `主要活动包括${activities.join("、")}。` : "",
      foods.length ? `餐饮候选有${foods.join("、")}。` : "",
      `${weather}${budget}`,
    ].filter(Boolean).join("");
  }

  return plan.goal || result.assistant_message || "";
}

function cleanUserSummary(raw: string) {
  return raw
    .replace(/\*\*/g, "")
    .split(/\n+/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter((line) => line && !isProcessLine(line))
    .slice(0, 3)
    .join("\n");
}

function isProcessLine(line: string) {
  return /duckduckgo|检索|搜索|工具|来源|我先用|Agent|执行过程/i.test(line);
}

function usageText(value: unknown) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "待确认";
}

function searchEvidenceText(plan: FinalPlan) {
  const basis = plan.recommendation_basis;
  const resultCount = basis?.web_results_count;
  const sourceCount = basis?.web_sources_count ?? plan.travel_research?.sources?.length ?? 0;
  if (typeof resultCount === "number") return `${resultCount} 条网页 / ${sourceCount} 条来源`;
  return `${sourceCount} 条来源`;
}

function lifestyleCandidateText(plan: FinalPlan) {
  const basis = plan.recommendation_basis;
  const foods = basis?.food_candidates_count ?? plan.meal_candidates?.length ?? plan.lifestyle_places?.foods?.length ?? 0;
  const hotels = basis?.hotel_candidates_count ?? plan.lifestyle_places?.hotels?.length ?? 0;
  return `餐饮 ${foods} 个 / 住宿 ${hotels} 个`;
}

function weatherText(value: unknown) {
  if (!value) return "天气待确认";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record.summary || record.weather || record.condition || record.description || "天气已获取");
  }
  return "天气已获取";
}

export default App;
