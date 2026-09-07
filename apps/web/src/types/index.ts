// Mirrors apps/api/prisma/schema.prisma and the API's DTOs/response shapes.
// See docs/api-reference.md and docs/erd.md for the source of truth.

export const ROLES = ['ADMIN', 'RISK_MANAGER', 'ASSET_OWNER', 'AUDITOR', 'VIEWER'] as const;
export type Role = (typeof ROLES)[number];

export const ASSET_CATEGORIES = [
  'HARDWARE',
  'SOFTWARE',
  'DATABASE',
  'NETWORK',
  'APPLICATION',
  'FACILITY',
  'OTHER',
] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export const CRITICALITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type Criticality = (typeof CRITICALITY_LEVELS)[number];

export const THREAT_CATEGORIES = [
  'MALICIOUS',
  'ACCIDENTAL',
  'ENVIRONMENTAL',
  'TECHNICAL_FAILURE',
  'THIRD_PARTY',
] as const;
export type ThreatCategory = (typeof THREAT_CATEGORIES)[number];

export const RISK_CATEGORIES = [
  'CYBERSECURITY',
  'OPERATIONAL',
  'COMPLIANCE',
  'FINANCIAL',
  'STRATEGIC',
  'THIRD_PARTY',
] as const;
export type RiskCategory = (typeof RISK_CATEGORIES)[number];

export const RISK_STATUSES = [
  'IDENTIFIED',
  'ASSESSED',
  'MITIGATING',
  'MONITORING',
  'CLOSED',
] as const;
export type RiskStatus = (typeof RISK_STATUSES)[number];

export const CONTROL_TYPES = ['PREVENTIVE', 'DETECTIVE', 'CORRECTIVE', 'COMPENSATING'] as const;
export type ControlType = (typeof CONTROL_TYPES)[number];

export const EFFECTIVENESS_LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type Effectiveness = (typeof EFFECTIVENESS_LEVELS)[number];

export const TREATMENT_STATUSES = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export type TreatmentStatus = (typeof TREATMENT_STATUSES)[number];

export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  name: string;
  description: string | null;
  category: AssetCategory;
  criticality: Criticality;
  ownerId: string;
  owner: SafeUser;
  createdAt: string;
  updatedAt: string;
}

export interface Threat {
  id: string;
  name: string;
  description: string | null;
  category: ThreatCategory;
  createdAt: string;
  updatedAt: string;
}

export interface Vulnerability {
  id: string;
  name: string;
  description: string | null;
  severity: Criticality;
  assetId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Risk {
  id: string;
  title: string;
  description: string | null;
  category: RiskCategory;
  status: RiskStatus;
  likelihood: number;
  impact: number;
  assetId: string;
  threatId: string;
  vulnerabilityId: string | null;
  ownerId: string;
  score: number;
  level: RiskLevel;
  createdAt: string;
  updatedAt: string;
}

export interface Control {
  id: string;
  name: string;
  description: string | null;
  type: ControlType;
  effectiveness: Effectiveness;
  createdAt: string;
  updatedAt: string;
}

export interface TreatmentPlan {
  id: string;
  riskId: string;
  action: string;
  ownerId: string;
  dueDate: string;
  status: TreatmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
}

export interface DashboardSummary {
  totals: {
    assets: number;
    threats: number;
    vulnerabilities: number;
    risks: number;
    controls: number;
    treatmentPlans: number;
  };
  risksByLevel: Record<RiskLevel, number>;
  risksByStatus: Record<RiskStatus, number>;
  risksByCategory: Record<RiskCategory, number>;
  treatmentPlans: {
    open: number;
    overdue: number;
  };
}

export interface RiskHeatmapCell {
  likelihood: number;
  impact: number;
  score: number;
  level: RiskLevel;
  count: number;
}

export interface RiskHeatmap {
  totalRisks: number;
  cells: RiskHeatmapCell[];
}

// ---- Write DTOs (mirror apps/api/src/**/dto/*.ts) ----

export interface CreateAssetInput {
  name: string;
  description?: string;
  category: AssetCategory;
  criticality: Criticality;
  ownerId: string;
}
export type UpdateAssetInput = Partial<CreateAssetInput>;

export interface CreateThreatInput {
  name: string;
  description?: string;
  category: ThreatCategory;
}
export type UpdateThreatInput = Partial<CreateThreatInput>;

export interface CreateVulnerabilityInput {
  name: string;
  description?: string;
  severity: Criticality;
  assetId: string;
}
export type UpdateVulnerabilityInput = Partial<CreateVulnerabilityInput>;

export interface CreateRiskInput {
  title: string;
  description?: string;
  category: RiskCategory;
  status?: RiskStatus;
  likelihood: number;
  impact: number;
  assetId: string;
  threatId: string;
  vulnerabilityId?: string;
  ownerId: string;
}
export interface UpdateRiskInput extends Omit<Partial<CreateRiskInput>, 'vulnerabilityId'> {
  vulnerabilityId?: string | null;
}

export interface CreateControlInput {
  name: string;
  description?: string;
  type: ControlType;
  effectiveness: Effectiveness;
}
export type UpdateControlInput = Partial<CreateControlInput>;

export interface CreateTreatmentPlanInput {
  action: string;
  riskId: string;
  ownerId: string;
  dueDate: string;
  status?: TreatmentStatus;
}
export type UpdateTreatmentPlanInput = Partial<CreateTreatmentPlanInput>;

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive?: boolean;
}
export interface UpdateUserInput {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: Role;
  isActive?: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}
