import { RISK_CATEGORIES } from '../types';
import type {
  Criticality,
  Effectiveness,
  Role,
  RiskCategory,
  RiskLevel,
  RiskStatus,
  TreatmentStatus,
} from '../types';

export const riskLevelStyles: Record<RiskLevel, string> = {
  LOW: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-amber-200',
  HIGH: 'bg-orange-50 text-orange-700 ring-orange-200',
  CRITICAL: 'bg-red-50 text-red-700 ring-red-200',
};

/** Solid fills for the heat-map grid (needs stronger contrast than the pill badges). */
export const riskLevelFill: Record<RiskLevel, string> = {
  LOW: 'bg-emerald-200 text-emerald-900',
  MEDIUM: 'bg-amber-200 text-amber-900',
  HIGH: 'bg-orange-300 text-orange-950',
  CRITICAL: 'bg-red-400 text-red-950',
};

export const criticalityStyles: Record<Criticality, string> = {
  LOW: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-amber-200',
  HIGH: 'bg-orange-50 text-orange-700 ring-orange-200',
  CRITICAL: 'bg-red-50 text-red-700 ring-red-200',
};

/** Effectiveness reads the opposite way: HIGH effectiveness is the good outcome. */
export const effectivenessStyles: Record<Effectiveness, string> = {
  LOW: 'bg-red-50 text-red-700 ring-red-200',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-amber-200',
  HIGH: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

export const riskStatusStyles: Record<RiskStatus, string> = {
  IDENTIFIED: 'bg-slate-100 text-slate-700 ring-slate-200',
  ASSESSED: 'bg-sky-50 text-sky-700 ring-sky-200',
  MITIGATING: 'bg-amber-50 text-amber-700 ring-amber-200',
  MONITORING: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  CLOSED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

export const treatmentStatusStyles: Record<TreatmentStatus, string> = {
  OPEN: 'bg-slate-100 text-slate-700 ring-slate-200',
  IN_PROGRESS: 'bg-sky-50 text-sky-700 ring-sky-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 ring-red-200',
};

export const roleStyles: Record<Role, string> = {
  ADMIN: 'bg-violet-50 text-violet-700 ring-violet-200',
  RISK_MANAGER: 'bg-sky-50 text-sky-700 ring-sky-200',
  ASSET_OWNER: 'bg-teal-50 text-teal-700 ring-teal-200',
  AUDITOR: 'bg-amber-50 text-amber-700 ring-amber-200',
  VIEWER: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export const activeStyles: Record<'true' | 'false', string> = {
  true: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  false: 'bg-slate-100 text-slate-500 ring-slate-200',
};

/** Fixed-order categorical palette for Recharts — never cycled, assigned by position. */
export const chartPalette = ['#6366f1', '#0ea5e9', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6'];

/** Status palette (severity): reserved meaning, not reused for identity series. */
export const riskLevelChartColor: Record<RiskLevel, string> = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};

export const riskStatusChartColor: Record<RiskStatus, string> = {
  IDENTIFIED: '#94a3b8',
  ASSESSED: '#0ea5e9',
  MITIGATING: '#f59e0b',
  MONITORING: '#6366f1',
  CLOSED: '#10b981',
};

export const riskCategoryChartColor: Record<RiskCategory, string> = Object.fromEntries(
  RISK_CATEGORIES.map((category, i) => [category, chartPalette[i % chartPalette.length]]),
) as Record<RiskCategory, string>;
