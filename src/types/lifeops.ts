export type Budget = {
  activity_cost?: number;
  meal_budget?: number;
  transport_budget?: number;
  total?: number;
  budget_limit?: number | null;
  budget_usage?: number | null;
  unknown_activity_cost_items?: string[];
};

export type Source = {
  title: string;
  url: string;
  content?: string;
};

export type ItineraryItem = {
  day?: number | string | null;
  time?: string | null;
  place?: string | null;
  area?: string | null;
  address?: string | null;
  location?: string | null;
  map_url?: string | null;
  play_points?: string[];
  reason?: string | null;
  cost?: number;
  cost_known?: boolean;
  cost_note?: string | null;
  evidence?: string[];
};

export type TaskType = "travel" | "errand" | "meal" | "todo" | "replan" | "unknown" | string;

export type LifestylePlace = {
  name?: string | null;
  address?: string | null;
  area?: string | null;
  map_url?: string | null;
};

export type RecommendationBasis = {
  answer?: string;
  selected_places?: string[];
  top_scored_candidates?: string[];
  web_sources_count?: number;
  web_query?: string | null;
  web_results_count?: number;
  food_candidates_count?: number;
  hotel_candidates_count?: number;
};

export type FinalPlan = {
  task_type?: TaskType;
  title?: string;
  goal?: string | null;
  date?: string | null;
  weather?: unknown;
  travel_research?: {
    sources?: Source[];
    note?: string;
  };
  itinerary?: ItineraryItem[];
  route?: unknown[];
  access_route?: Record<string, unknown>;
  local_route?: Record<string, unknown>;
  destination_validation?: Record<string, unknown>;
  budget?: Budget;
  lifestyle_places?: {
    foods?: LifestylePlace[];
    hotels?: LifestylePlace[];
  };
  recommendation_basis?: RecommendationBasis;
  alternatives?: unknown[];
  risks?: string[];
  fallbacks?: string[];
  summary?: string;
  assistant_message?: string;
  errand_items?: unknown[];
  meal_candidates?: LifestylePlace[];
  todo_items?: unknown[];
  time_blocks?: unknown[];
  acceptance_criteria?: string[];
  confirm_actions?: unknown[];
  intent_contract?: PlanIntentContract;
  execution_plan?: ExecutionPlanStep[];
};

export type PlanIntentContract = {
  goal?: string;
  primary_task_type?: string;
  sub_tasks?: Array<{ type?: string; label?: string; source?: string }>;
  hard_constraints?: Record<string, unknown>;
  soft_preferences?: Record<string, unknown>;
  required_outputs?: string[];
  missing_fields?: string[];
};

export type ExecutionPlanStep = { id?: string; tool?: string; purpose?: string };

export type QualityScore = {
  overall: number;
  dimensions: Array<{
    key: string;
    label: string;
    score: number;
    reason: string;
  }>;
};

export type ExecutionLogItem = {
  node?: string | null;
  summary?: string | null;
  details?: unknown;
};

export type PlanResponse = {
  status?: string;
  task_id?: string;
  trace_id?: string;
  constraints?: Record<string, unknown>;
  intent_contract?: PlanIntentContract;
  execution_plan?: ExecutionPlanStep[];
  final_plan?: FinalPlan;
  assistant_message?: string;
  quality_warnings?: string[];
  quality_score?: QualityScore;
  execution_log?: ExecutionLogItem[];
  tool_results?: unknown[];
  question?: string;
};

export type PlanFeedbackPayload = {
  task_id?: string;
  trace_id?: string;
  rating: number;
  tags: string[];
  note?: string;
  item_feedback: Array<{
    place: string;
    sentiment: "like" | "dislike" | "neutral";
  }>;
};

export type ProfileResponse = {
  user_id: string;
  profile: {
    user_id: string;
    likes: string[];
    dislikes: string[];
    pace?: string | null;
    budget_style?: string | null;
    updated_at?: string | null;
  };
  stats: {
    feedback_count: number;
    average_rating?: number | null;
    tag_counts: Array<{ label: string; count: number }>;
    common_cities: Array<{ label: string; count: number }>;
    plan_types: Array<{ label: string; count: number }>;
  };
  recent_memory: Array<{
    event_type: string;
    content: string;
    source_task_id?: string | null;
    source_trace_id?: string | null;
    created_at?: string | null;
  }>;
};

export type RunEvent = {
  trace_id: string;
  phase: "run" | "node" | "result" | "error" | string;
  parent_node?: string;
  node: string;
  tool_name?: string;
  summary: string;
  details?: unknown;
  input?: unknown;
  output_summary?: unknown;
  preview_items?: unknown[];
  status: "pending" | "running" | "done" | "error" | string;
  timestamp?: string;
  progress?: number;
  result?: PlanResponse;
};

export type RunStatus = {
  trace_id: string;
  status: "running" | "done" | "error" | "unknown" | string;
  events: RunEvent[];
  result?: PlanResponse | null;
  error?: string | null;
};

export type ProviderHealthItem = {
  name: "llm" | "weather" | "place" | "search" | "route" | string;
  provider: string;
  configured: boolean;
  status: "ok" | "degraded" | "unconfigured";
  message: string;
};

export type ProviderHealthResponse = {
  status: string;
  providers: ProviderHealthItem[];
};

export type HistoryItem = {
  task_id: string;
  user_id?: string;
  user_input: string;
  final_plan?: string | FinalPlan;
  feedback?: string | null;
  has_feedback?: boolean | number;
  created_at?: string;
};
