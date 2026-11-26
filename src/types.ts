export type AgentId = 'sef' | 'arastirmaci' | 'icerikci' | 'yazilimci' | 'siberci';

export type EngineId = 'gemini' | 'qwen' | 'deepseek';

export type AgentActivityState = 'idle' | 'walking_to_desk' | 'working' | 'returning' | 'completed';

export type OfficeLevel = 1 | 2 | 3;

export type SceneTheme = 'day' | 'sunset' | 'night';

export interface AgentProgress {
  xp: number;
  tasksCompleted: number;
  memories: string[];
}

export interface ProgressionState {
  officeXp: number;
  totalTasksCompleted: number;
  agents: Record<AgentId, AgentProgress>;
}

export interface AgentConfig {
  id: AgentId;
  name: string;
  role: string;
  shortRole: string;
  description: string;
  color: string;
  accentColor: string;
  lightBg: string;
  borderColor: string;
  deskPosition: [number, number, number];
  seatPosition: [number, number, number];
  deskRotationY: number;
  loungeAnchor: [number, number, number];
  workingLabel: string;
  systemPrompt: string;
  locked?: boolean;
}

export interface AgentRuntimeState {
  id: AgentId;
  activity: AgentActivityState;
  statusText: string;
  currentTaskTitle?: string;
}

export interface WorkflowPlanStep {
  agentId: Exclude<AgentId, 'sef'>;
  subtask: string;
  reason: string;
}

export interface WorkflowPlan {
  summary: string;
  steps: WorkflowPlanStep[];
}

export interface AgentOutputItem {
  id: string;
  taskId: string;
  userPrompt: string;
  agentId: AgentId;
  title: string;
  content: string;
  createdAt: string;
  isDemo?: boolean;
  engineId?: EngineId;
  modelUsed?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | AgentId | 'system';
  text: string;
  title?: string;
  createdAt: string;
  taskId?: string;
  isDemo?: boolean;
  engineId?: EngineId;
  modelUsed?: string;
}

export interface TaskRun {
  id: string;
  prompt: string;
  createdAt: string;
  status: 'running' | 'completed' | 'error';
  plan?: WorkflowPlan;
  completedAgents: AgentId[];
  activeAgent?: AgentId;
  activeAgents?: AgentId[];
  isDemo?: boolean;
  errorMessage?: string;
}

export type ActiveTab = 'ofis' | 'pano' | 'ayarlar';

export interface AppSettings {
  apiKey: string;
  openRouterApiKey: string;
  model: string;
  qwenModel: string;
  deepseekModel: string;
  agentEngines: Record<AgentId, EngineId>;
  parallelMode: boolean;
  demoMode: boolean;
  sceneTheme: SceneTheme;
  soundEnabled: boolean;
}
