import { RiskLevel } from '@itrms/shared';

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
