import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  assetsApi,
  auditLogsApi,
  controlsApi,
  dashboardApi,
  risksApi,
  threatsApi,
  treatmentPlansApi,
  usersApi,
  vulnerabilitiesApi,
} from '../api/resources';
import type {
  CreateAssetInput,
  CreateControlInput,
  CreateRiskInput,
  CreateThreatInput,
  CreateTreatmentPlanInput,
  CreateUserInput,
  CreateVulnerabilityInput,
  UpdateAssetInput,
  UpdateControlInput,
  UpdateRiskInput,
  UpdateThreatInput,
  UpdateTreatmentPlanInput,
  UpdateUserInput,
  UpdateVulnerabilityInput,
} from '../types';

export const queryKeys = {
  dashboardSummary: ['dashboard', 'summary'] as const,
  dashboardHeatmap: ['dashboard', 'heatmap'] as const,
  assets: ['assets'] as const,
  threats: ['threats'] as const,
  vulnerabilities: ['vulnerabilities'] as const,
  risks: ['risks'] as const,
  controls: ['controls'] as const,
  controlRisks: (controlId: string) => ['controls', controlId, 'risks'] as const,
  treatmentPlans: ['treatment-plans'] as const,
  users: ['users'] as const,
  auditLogs: ['audit-logs'] as const,
};

/** Every mutation writes an audit-log row, so keep that list fresh too. */
function invalidate(qc: QueryClient, ...keys: ReadonlyArray<readonly unknown[]>) {
  for (const key of keys) {
    qc.invalidateQueries({ queryKey: key });
  }
  qc.invalidateQueries({ queryKey: queryKeys.auditLogs });
  qc.invalidateQueries({ queryKey: queryKeys.dashboardSummary });
  qc.invalidateQueries({ queryKey: queryKeys.dashboardHeatmap });
}

// ---- Dashboard ----

export function useDashboardSummary() {
  return useQuery({ queryKey: queryKeys.dashboardSummary, queryFn: dashboardApi.summary });
}

export function useDashboardHeatmap() {
  return useQuery({ queryKey: queryKeys.dashboardHeatmap, queryFn: dashboardApi.heatmap });
}

// ---- Assets ----

export function useAssets() {
  return useQuery({ queryKey: queryKeys.assets, queryFn: assetsApi.list });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAssetInput) => assetsApi.create(input),
    onSuccess: () => invalidate(qc, queryKeys.assets),
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAssetInput }) =>
      assetsApi.update(id, input),
    onSuccess: () => invalidate(qc, queryKeys.assets),
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => assetsApi.remove(id),
    onSuccess: () => invalidate(qc, queryKeys.assets),
  });
}

// ---- Threats ----

export function useThreats() {
  return useQuery({ queryKey: queryKeys.threats, queryFn: threatsApi.list });
}

export function useCreateThreat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateThreatInput) => threatsApi.create(input),
    onSuccess: () => invalidate(qc, queryKeys.threats),
  });
}

export function useUpdateThreat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateThreatInput }) =>
      threatsApi.update(id, input),
    onSuccess: () => invalidate(qc, queryKeys.threats),
  });
}

export function useDeleteThreat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => threatsApi.remove(id),
    onSuccess: () => invalidate(qc, queryKeys.threats),
  });
}

// ---- Vulnerabilities ----

export function useVulnerabilities() {
  return useQuery({ queryKey: queryKeys.vulnerabilities, queryFn: vulnerabilitiesApi.list });
}

export function useCreateVulnerability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVulnerabilityInput) => vulnerabilitiesApi.create(input),
    onSuccess: () => invalidate(qc, queryKeys.vulnerabilities),
  });
}

export function useUpdateVulnerability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateVulnerabilityInput }) =>
      vulnerabilitiesApi.update(id, input),
    onSuccess: () => invalidate(qc, queryKeys.vulnerabilities),
  });
}

export function useDeleteVulnerability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vulnerabilitiesApi.remove(id),
    onSuccess: () => invalidate(qc, queryKeys.vulnerabilities),
  });
}

// ---- Risks ----

export function useRisks() {
  return useQuery({ queryKey: queryKeys.risks, queryFn: risksApi.list });
}

export function useCreateRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRiskInput) => risksApi.create(input),
    onSuccess: () => invalidate(qc, queryKeys.risks),
  });
}

export function useUpdateRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRiskInput }) =>
      risksApi.update(id, input),
    onSuccess: () => invalidate(qc, queryKeys.risks),
  });
}

export function useDeleteRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => risksApi.remove(id),
    onSuccess: () => invalidate(qc, queryKeys.risks),
  });
}

// ---- Controls ----

export function useControls() {
  return useQuery({ queryKey: queryKeys.controls, queryFn: controlsApi.list });
}

export function useCreateControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateControlInput) => controlsApi.create(input),
    onSuccess: () => invalidate(qc, queryKeys.controls),
  });
}

export function useUpdateControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateControlInput }) =>
      controlsApi.update(id, input),
    onSuccess: () => invalidate(qc, queryKeys.controls),
  });
}

export function useDeleteControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => controlsApi.remove(id),
    onSuccess: () => invalidate(qc, queryKeys.controls),
  });
}

export function useControlRisks(controlId: string | null) {
  return useQuery({
    queryKey: queryKeys.controlRisks(controlId ?? ''),
    queryFn: () => controlsApi.risksFor(controlId as string),
    enabled: controlId !== null,
  });
}

export function useLinkControlRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ controlId, riskId }: { controlId: string; riskId: string }) =>
      controlsApi.linkRisk(controlId, riskId),
    onSuccess: (_data, { controlId }) =>
      invalidate(qc, queryKeys.controls, queryKeys.risks, queryKeys.controlRisks(controlId)),
  });
}

export function useUnlinkControlRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ controlId, riskId }: { controlId: string; riskId: string }) =>
      controlsApi.unlinkRisk(controlId, riskId),
    onSuccess: (_data, { controlId }) =>
      invalidate(qc, queryKeys.controls, queryKeys.risks, queryKeys.controlRisks(controlId)),
  });
}

// ---- Treatment plans ----

export function useTreatmentPlans() {
  return useQuery({ queryKey: queryKeys.treatmentPlans, queryFn: treatmentPlansApi.list });
}

export function useCreateTreatmentPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTreatmentPlanInput) => treatmentPlansApi.create(input),
    onSuccess: () => invalidate(qc, queryKeys.treatmentPlans),
  });
}

export function useUpdateTreatmentPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTreatmentPlanInput }) =>
      treatmentPlansApi.update(id, input),
    onSuccess: () => invalidate(qc, queryKeys.treatmentPlans),
  });
}

export function useDeleteTreatmentPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => treatmentPlansApi.remove(id),
    onSuccess: () => invalidate(qc, queryKeys.treatmentPlans),
  });
}

// ---- Users (ADMIN only) ----

export function useUsers(enabled = true) {
  return useQuery({ queryKey: queryKeys.users, queryFn: usersApi.list, enabled });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => usersApi.create(input),
    onSuccess: () => invalidate(qc, queryKeys.users),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) =>
      usersApi.update(id, input),
    onSuccess: () => invalidate(qc, queryKeys.users),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => invalidate(qc, queryKeys.users),
  });
}

// ---- Audit logs (ADMIN/AUDITOR only) ----

export function useAuditLogs(enabled = true) {
  return useQuery({ queryKey: queryKeys.auditLogs, queryFn: auditLogsApi.list, enabled });
}
