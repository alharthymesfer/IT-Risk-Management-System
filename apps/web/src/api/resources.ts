import { api } from './client';
import type {
  Asset,
  AuditLog,
  Control,
  CreateAssetInput,
  CreateControlInput,
  CreateRiskInput,
  CreateThreatInput,
  CreateTreatmentPlanInput,
  CreateUserInput,
  CreateVulnerabilityInput,
  DashboardSummary,
  LoginInput,
  Risk,
  RiskHeatmap,
  SafeUser,
  Threat,
  TreatmentPlan,
  UpdateAssetInput,
  UpdateControlInput,
  UpdateRiskInput,
  UpdateThreatInput,
  UpdateTreatmentPlanInput,
  UpdateUserInput,
  UpdateVulnerabilityInput,
  Vulnerability,
} from '../types';

export const authApi = {
  login: (input: LoginInput) => api.post<SafeUser>('/auth/login', input),
  logout: () => api.post<{ success: true }>('/auth/logout'),
  me: () => api.get<SafeUser>('/auth/me'),
};

export const dashboardApi = {
  summary: () => api.get<DashboardSummary>('/dashboard/summary'),
  heatmap: () => api.get<RiskHeatmap>('/dashboard/heatmap'),
};

export const assetsApi = {
  list: () => api.get<Asset[]>('/assets'),
  get: (id: string) => api.get<Asset>(`/assets/${id}`),
  create: (input: CreateAssetInput) => api.post<Asset>('/assets', input),
  update: (id: string, input: UpdateAssetInput) => api.patch<Asset>(`/assets/${id}`, input),
  remove: (id: string) => api.delete<void>(`/assets/${id}`),
};

export const threatsApi = {
  list: () => api.get<Threat[]>('/threats'),
  get: (id: string) => api.get<Threat>(`/threats/${id}`),
  create: (input: CreateThreatInput) => api.post<Threat>('/threats', input),
  update: (id: string, input: UpdateThreatInput) => api.patch<Threat>(`/threats/${id}`, input),
  remove: (id: string) => api.delete<void>(`/threats/${id}`),
};

export const vulnerabilitiesApi = {
  list: () => api.get<Vulnerability[]>('/vulnerabilities'),
  get: (id: string) => api.get<Vulnerability>(`/vulnerabilities/${id}`),
  create: (input: CreateVulnerabilityInput) => api.post<Vulnerability>('/vulnerabilities', input),
  update: (id: string, input: UpdateVulnerabilityInput) =>
    api.patch<Vulnerability>(`/vulnerabilities/${id}`, input),
  remove: (id: string) => api.delete<void>(`/vulnerabilities/${id}`),
};

export const risksApi = {
  list: () => api.get<Risk[]>('/risks'),
  get: (id: string) => api.get<Risk>(`/risks/${id}`),
  create: (input: CreateRiskInput) => api.post<Risk>('/risks', input),
  update: (id: string, input: UpdateRiskInput) => api.patch<Risk>(`/risks/${id}`, input),
  remove: (id: string) => api.delete<void>(`/risks/${id}`),
};

export const controlsApi = {
  list: () => api.get<Control[]>('/controls'),
  get: (id: string) => api.get<Control>(`/controls/${id}`),
  create: (input: CreateControlInput) => api.post<Control>('/controls', input),
  update: (id: string, input: UpdateControlInput) => api.patch<Control>(`/controls/${id}`, input),
  remove: (id: string) => api.delete<void>(`/controls/${id}`),
  risksFor: (controlId: string) => api.get<Risk[]>(`/controls/${controlId}/risks`),
  linkRisk: (controlId: string, riskId: string) =>
    api.post<void>(`/controls/${controlId}/risks/${riskId}`),
  unlinkRisk: (controlId: string, riskId: string) =>
    api.delete<void>(`/controls/${controlId}/risks/${riskId}`),
};

export const treatmentPlansApi = {
  list: () => api.get<TreatmentPlan[]>('/treatment-plans'),
  get: (id: string) => api.get<TreatmentPlan>(`/treatment-plans/${id}`),
  create: (input: CreateTreatmentPlanInput) => api.post<TreatmentPlan>('/treatment-plans', input),
  update: (id: string, input: UpdateTreatmentPlanInput) =>
    api.patch<TreatmentPlan>(`/treatment-plans/${id}`, input),
  remove: (id: string) => api.delete<void>(`/treatment-plans/${id}`),
};

export const usersApi = {
  list: () => api.get<SafeUser[]>('/users'),
  get: (id: string) => api.get<SafeUser>(`/users/${id}`),
  create: (input: CreateUserInput) => api.post<SafeUser>('/users', input),
  update: (id: string, input: UpdateUserInput) => api.patch<SafeUser>(`/users/${id}`, input),
  remove: (id: string) => api.delete<void>(`/users/${id}`),
};

export const auditLogsApi = {
  list: () => api.get<AuditLog[]>('/audit-logs'),
  get: (id: string) => api.get<AuditLog>(`/audit-logs/${id}`),
};
