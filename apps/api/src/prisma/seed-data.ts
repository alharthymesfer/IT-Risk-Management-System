import {
  AssetCategory,
  ControlType,
  Criticality,
  Effectiveness,
  RiskCategory,
  RiskStatus,
  Role,
  ThreatCategory,
  TreatmentStatus,
} from '@prisma/client';

/**
 * Deterministic, human-readable demo UUIDs (Postgres `uuid` only needs valid
 * hex-dash formatting, not real randomness). Fixed IDs let the seed script
 * upsert-by-id, which is what makes re-running it idempotent.
 */
function demoId(category: number, index: number): string {
  const firstSegment = `${category}0000000`;
  const lastSegment = index.toString().padStart(12, '0');
  return `${firstSegment}-0000-4000-8000-${lastSegment}`;
}

// Clearly-labeled, non-production demo credential — never a real secret.
// Every seeded user shares it so the README can document a single demo login flow.
export const DEMO_PASSWORD = 'Demo#Passw0rd!';

export interface DemoUser {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export const DEMO_USERS: DemoUser[] = [
  { email: 'admin@demo.itrms.local', firstName: 'Amina', lastName: 'Admin', role: Role.ADMIN },
  {
    email: 'risk.manager@demo.itrms.local',
    firstName: 'Ravi',
    lastName: 'Manager',
    role: Role.RISK_MANAGER,
  },
  {
    email: 'asset.owner1@demo.itrms.local',
    firstName: 'Olivia',
    lastName: 'Owens',
    role: Role.ASSET_OWNER,
  },
  {
    email: 'asset.owner2@demo.itrms.local',
    firstName: 'Omar',
    lastName: 'Osei',
    role: Role.ASSET_OWNER,
  },
  {
    email: 'auditor@demo.itrms.local',
    firstName: 'Aisha',
    lastName: 'Auditor',
    role: Role.AUDITOR,
  },
  { email: 'viewer@demo.itrms.local', firstName: 'Victor', lastName: 'Viewer', role: Role.VIEWER },
];

const OWNER1_EMAIL = 'asset.owner1@demo.itrms.local';
const OWNER2_EMAIL = 'asset.owner2@demo.itrms.local';
const RISK_MANAGER_EMAIL = 'risk.manager@demo.itrms.local';

export const ASSET_IDS = {
  payrollDb: demoId(2, 1),
  crmApp: demoId(2, 2),
  coreSwitch: demoId(2, 3),
  hrFileServer: demoId(2, 4),
  dataCenter: demoId(2, 5),
  laptopFleet: demoId(2, 6),
};

export interface DemoAsset {
  id: string;
  name: string;
  description: string;
  category: AssetCategory;
  criticality: Criticality;
  ownerEmail: string;
}

export const DEMO_ASSETS: DemoAsset[] = [
  {
    id: ASSET_IDS.payrollDb,
    name: 'Payroll Database',
    description: 'Primary PostgreSQL instance storing employee payroll and banking records.',
    category: AssetCategory.DATABASE,
    criticality: Criticality.HIGH,
    ownerEmail: OWNER1_EMAIL,
  },
  {
    id: ASSET_IDS.crmApp,
    name: 'Customer CRM Application',
    description: 'Web application used by sales and support teams to manage customer records.',
    category: AssetCategory.APPLICATION,
    criticality: Criticality.HIGH,
    ownerEmail: OWNER2_EMAIL,
  },
  {
    id: ASSET_IDS.coreSwitch,
    name: 'Core Network Switch',
    description: 'Primary switch routing traffic between all office network segments.',
    category: AssetCategory.NETWORK,
    criticality: Criticality.CRITICAL,
    ownerEmail: OWNER1_EMAIL,
  },
  {
    id: ASSET_IDS.hrFileServer,
    name: 'HR File Server',
    description: 'File share hosting HR policies, contracts, and onboarding documents.',
    category: AssetCategory.SOFTWARE,
    criticality: Criticality.MEDIUM,
    ownerEmail: OWNER2_EMAIL,
  },
  {
    id: ASSET_IDS.dataCenter,
    name: 'Primary Data Center',
    description: 'On-premise facility hosting production servers and network equipment.',
    category: AssetCategory.FACILITY,
    criticality: Criticality.CRITICAL,
    ownerEmail: OWNER1_EMAIL,
  },
  {
    id: ASSET_IDS.laptopFleet,
    name: 'Employee Laptop Fleet',
    description: 'Company-issued laptops used by remote and hybrid staff.',
    category: AssetCategory.HARDWARE,
    criticality: Criticality.LOW,
    ownerEmail: OWNER2_EMAIL,
  },
];

export const THREAT_IDS = {
  phishing: demoId(3, 1),
  ransomware: demoId(3, 2),
  accidentalDeletion: demoId(3, 3),
  powerOutage: demoId(3, 4),
  hardwareFailure: demoId(3, 5),
  vendorBreach: demoId(3, 6),
  deviceLossOrTheft: demoId(3, 7),
};

export interface DemoThreat {
  id: string;
  name: string;
  description: string;
  category: ThreatCategory;
}

export const DEMO_THREATS: DemoThreat[] = [
  {
    id: THREAT_IDS.phishing,
    name: 'Phishing Attack',
    description: 'Targeted emails attempting to steal employee credentials.',
    category: ThreatCategory.MALICIOUS,
  },
  {
    id: THREAT_IDS.ransomware,
    name: 'Ransomware Attack',
    description: 'Malware that encrypts systems and demands payment for recovery.',
    category: ThreatCategory.MALICIOUS,
  },
  {
    id: THREAT_IDS.accidentalDeletion,
    name: 'Accidental Data Deletion',
    description: 'Staff unintentionally deleting or overwriting business-critical records.',
    category: ThreatCategory.ACCIDENTAL,
  },
  {
    id: THREAT_IDS.powerOutage,
    name: 'Power Outage',
    description: 'Loss of utility power affecting on-premise infrastructure.',
    category: ThreatCategory.ENVIRONMENTAL,
  },
  {
    id: THREAT_IDS.hardwareFailure,
    name: 'Hardware Component Failure',
    description: 'Unexpected failure of physical server or network hardware.',
    category: ThreatCategory.TECHNICAL_FAILURE,
  },
  {
    id: THREAT_IDS.vendorBreach,
    name: 'Third-Party Vendor Breach',
    description: 'A supplier or vendor with system access suffers a security incident.',
    category: ThreatCategory.THIRD_PARTY,
  },
  {
    id: THREAT_IDS.deviceLossOrTheft,
    name: 'Device Loss or Theft',
    description: 'A company device is lost or stolen while containing business data.',
    category: ThreatCategory.ACCIDENTAL,
  },
];

export const VULNERABILITY_IDS = {
  unpatchedDbEngine: demoId(4, 1),
  weakPasswordPolicy: demoId(4, 2),
  outdatedSwitchFirmware: demoId(4, 3),
  missingAutomatedBackups: demoId(4, 4),
  noUpsRedundancy: demoId(4, 5),
  unencryptedLocalDrives: demoId(4, 6),
};

export interface DemoVulnerability {
  id: string;
  name: string;
  description: string;
  severity: Criticality;
  assetId: string;
}

export const DEMO_VULNERABILITIES: DemoVulnerability[] = [
  {
    id: VULNERABILITY_IDS.unpatchedDbEngine,
    name: 'Unpatched Database Engine',
    description: 'The database engine is several versions behind the latest security patch.',
    severity: Criticality.HIGH,
    assetId: ASSET_IDS.payrollDb,
  },
  {
    id: VULNERABILITY_IDS.weakPasswordPolicy,
    name: 'Weak Password Policy',
    description: 'CRM accounts do not enforce minimum password complexity or MFA.',
    severity: Criticality.MEDIUM,
    assetId: ASSET_IDS.crmApp,
  },
  {
    id: VULNERABILITY_IDS.outdatedSwitchFirmware,
    name: 'Outdated Switch Firmware',
    description: 'Core switch firmware has known, unpatched remote-exploit advisories.',
    severity: Criticality.HIGH,
    assetId: ASSET_IDS.coreSwitch,
  },
  {
    id: VULNERABILITY_IDS.missingAutomatedBackups,
    name: 'Missing Automated Backups',
    description: 'The HR file server has no scheduled, verified backup process.',
    severity: Criticality.MEDIUM,
    assetId: ASSET_IDS.hrFileServer,
  },
  {
    id: VULNERABILITY_IDS.noUpsRedundancy,
    name: 'No UPS Redundancy',
    description: 'The data center has a single UPS unit with no failover.',
    severity: Criticality.CRITICAL,
    assetId: ASSET_IDS.dataCenter,
  },
  {
    id: VULNERABILITY_IDS.unencryptedLocalDrives,
    name: 'Unencrypted Local Drives',
    description: 'Laptop disks are not encrypted at rest.',
    severity: Criticality.MEDIUM,
    assetId: ASSET_IDS.laptopFleet,
  },
];

export const RISK_IDS = {
  payrollUnauthorizedAccess: demoId(5, 1),
  crmCredentialBreach: demoId(5, 2),
  switchFirmwareOutage: demoId(5, 3),
  hrRecordsDeletion: demoId(5, 4),
  dataCenterPowerLoss: demoId(5, 5),
  laptopDataExposure: demoId(5, 6),
  switchHardwareFailure: demoId(5, 7),
  vendorComplianceLapse: demoId(5, 8),
  outageBudgetOverrun: demoId(5, 9),
  singleVendorDependency: demoId(5, 10),
};

export interface DemoRisk {
  id: string;
  title: string;
  description: string;
  category: RiskCategory;
  status: RiskStatus;
  likelihood: number;
  impact: number;
  assetId: string;
  threatId: string;
  vulnerabilityId: string | null;
  ownerEmail: string;
}

export const DEMO_RISKS: DemoRisk[] = [
  {
    id: RISK_IDS.payrollUnauthorizedAccess,
    title: 'Unauthorized access to payroll data via unpatched database engine',
    description: 'Ransomware exploiting the unpatched engine could encrypt or exfiltrate payroll data.',
    category: RiskCategory.CYBERSECURITY,
    status: RiskStatus.IDENTIFIED,
    likelihood: 4,
    impact: 5,
    assetId: ASSET_IDS.payrollDb,
    threatId: THREAT_IDS.ransomware,
    vulnerabilityId: VULNERABILITY_IDS.unpatchedDbEngine,
    ownerEmail: RISK_MANAGER_EMAIL,
  },
  {
    id: RISK_IDS.crmCredentialBreach,
    title: 'Customer data breach via weak CRM credentials',
    description: 'Phishing combined with weak password rules could expose customer records.',
    category: RiskCategory.CYBERSECURITY,
    status: RiskStatus.ASSESSED,
    likelihood: 3,
    impact: 4,
    assetId: ASSET_IDS.crmApp,
    threatId: THREAT_IDS.phishing,
    vulnerabilityId: VULNERABILITY_IDS.weakPasswordPolicy,
    ownerEmail: RISK_MANAGER_EMAIL,
  },
  {
    id: RISK_IDS.switchFirmwareOutage,
    title: 'Network-wide outage from switch firmware exploit',
    description: 'A vendor-supplied firmware flaw in the core switch could take the network offline.',
    category: RiskCategory.OPERATIONAL,
    status: RiskStatus.MITIGATING,
    likelihood: 3,
    impact: 5,
    assetId: ASSET_IDS.coreSwitch,
    threatId: THREAT_IDS.vendorBreach,
    vulnerabilityId: VULNERABILITY_IDS.outdatedSwitchFirmware,
    ownerEmail: OWNER1_EMAIL,
  },
  {
    id: RISK_IDS.hrRecordsDeletion,
    title: 'Accidental deletion of HR records',
    description: 'Without backups, accidental deletion on the HR file server is unrecoverable.',
    category: RiskCategory.OPERATIONAL,
    status: RiskStatus.MONITORING,
    likelihood: 2,
    impact: 3,
    assetId: ASSET_IDS.hrFileServer,
    threatId: THREAT_IDS.accidentalDeletion,
    vulnerabilityId: VULNERABILITY_IDS.missingAutomatedBackups,
    ownerEmail: OWNER2_EMAIL,
  },
  {
    id: RISK_IDS.dataCenterPowerLoss,
    title: 'Data center downtime due to power outage',
    description: 'A power outage with no UPS redundancy could bring down all production systems.',
    category: RiskCategory.OPERATIONAL,
    status: RiskStatus.IDENTIFIED,
    likelihood: 2,
    impact: 5,
    assetId: ASSET_IDS.dataCenter,
    threatId: THREAT_IDS.powerOutage,
    vulnerabilityId: VULNERABILITY_IDS.noUpsRedundancy,
    ownerEmail: RISK_MANAGER_EMAIL,
  },
  {
    id: RISK_IDS.laptopDataExposure,
    title: 'Data exposure from lost or stolen unencrypted laptops',
    description: 'An unencrypted laptop that is lost or stolen would expose local business data.',
    category: RiskCategory.CYBERSECURITY,
    status: RiskStatus.IDENTIFIED,
    likelihood: 2,
    impact: 2,
    assetId: ASSET_IDS.laptopFleet,
    threatId: THREAT_IDS.deviceLossOrTheft,
    vulnerabilityId: VULNERABILITY_IDS.unencryptedLocalDrives,
    ownerEmail: OWNER2_EMAIL,
  },
  {
    id: RISK_IDS.switchHardwareFailure,
    title: 'Extended service disruption from switch hardware failure',
    description: 'A past hardware failure that has since been remediated and closed out.',
    category: RiskCategory.OPERATIONAL,
    status: RiskStatus.CLOSED,
    likelihood: 1,
    impact: 3,
    assetId: ASSET_IDS.coreSwitch,
    threatId: THREAT_IDS.hardwareFailure,
    vulnerabilityId: null,
    ownerEmail: RISK_MANAGER_EMAIL,
  },
  {
    id: RISK_IDS.vendorComplianceLapse,
    title: 'Regulatory non-compliance due to third-party vendor security lapse',
    description: 'A CRM vendor security lapse could trigger data-protection compliance findings.',
    category: RiskCategory.COMPLIANCE,
    status: RiskStatus.ASSESSED,
    likelihood: 2,
    impact: 4,
    assetId: ASSET_IDS.crmApp,
    threatId: THREAT_IDS.vendorBreach,
    vulnerabilityId: VULNERABILITY_IDS.weakPasswordPolicy,
    ownerEmail: RISK_MANAGER_EMAIL,
  },
  {
    id: RISK_IDS.outageBudgetOverrun,
    title: 'Budget overrun risk from prolonged data center outage',
    description: 'Extended recovery from a power event could exceed the disaster-recovery budget.',
    category: RiskCategory.FINANCIAL,
    status: RiskStatus.MONITORING,
    likelihood: 1,
    impact: 4,
    assetId: ASSET_IDS.dataCenter,
    threatId: THREAT_IDS.powerOutage,
    vulnerabilityId: VULNERABILITY_IDS.noUpsRedundancy,
    ownerEmail: OWNER1_EMAIL,
  },
  {
    id: RISK_IDS.singleVendorDependency,
    title: 'Strategic dependency risk on a single core network vendor',
    description: 'Relying on one vendor for core network hardware limits negotiating and recovery options.',
    category: RiskCategory.STRATEGIC,
    status: RiskStatus.IDENTIFIED,
    likelihood: 2,
    impact: 3,
    assetId: ASSET_IDS.coreSwitch,
    threatId: THREAT_IDS.vendorBreach,
    vulnerabilityId: null,
    ownerEmail: RISK_MANAGER_EMAIL,
  },
];

export const CONTROL_IDS = {
  mfaEnforcement: demoId(6, 1),
  edr: demoId(6, 2),
  dbPatchManagement: demoId(6, 3),
  automatedBackups: demoId(6, 4),
  upsWithGenerator: demoId(6, 5),
  diskEncryption: demoId(6, 6),
  vendorSecurityAssessment: demoId(6, 7),
};

export interface DemoControl {
  id: string;
  name: string;
  description: string;
  type: ControlType;
  effectiveness: Effectiveness;
}

export const DEMO_CONTROLS: DemoControl[] = [
  {
    id: CONTROL_IDS.mfaEnforcement,
    name: 'Multi-Factor Authentication Enforcement',
    description: 'Requires a second factor for all administrative and remote logins.',
    type: ControlType.PREVENTIVE,
    effectiveness: Effectiveness.HIGH,
  },
  {
    id: CONTROL_IDS.edr,
    name: 'Endpoint Detection & Response',
    description: 'Monitors endpoints for malicious activity and alerts the security team.',
    type: ControlType.DETECTIVE,
    effectiveness: Effectiveness.HIGH,
  },
  {
    id: CONTROL_IDS.dbPatchManagement,
    name: 'Automated Database Patch Management',
    description: 'Applies vetted security patches to database engines on a monthly cycle.',
    type: ControlType.PREVENTIVE,
    effectiveness: Effectiveness.MEDIUM,
  },
  {
    id: CONTROL_IDS.automatedBackups,
    name: 'Daily Automated Backups',
    description: 'Nightly backups with off-site replication and periodic restore testing.',
    type: ControlType.CORRECTIVE,
    effectiveness: Effectiveness.HIGH,
  },
  {
    id: CONTROL_IDS.upsWithGenerator,
    name: 'UPS with Generator Backup',
    description: 'Uninterruptible power supply paired with an on-site generator failover.',
    type: ControlType.PREVENTIVE,
    effectiveness: Effectiveness.MEDIUM,
  },
  {
    id: CONTROL_IDS.diskEncryption,
    name: 'Full-Disk Encryption Policy',
    description: 'Mandatory full-disk encryption enforced on all company-issued laptops.',
    type: ControlType.PREVENTIVE,
    effectiveness: Effectiveness.HIGH,
  },
  {
    id: CONTROL_IDS.vendorSecurityAssessment,
    name: 'Vendor Security Assessment Program',
    description: 'Manual compensating review of vendor security posture where automated coverage is limited.',
    type: ControlType.COMPENSATING,
    effectiveness: Effectiveness.MEDIUM,
  },
];

export interface DemoRiskControl {
  riskId: string;
  controlId: string;
}

export const DEMO_RISK_CONTROLS: DemoRiskControl[] = [
  { riskId: RISK_IDS.payrollUnauthorizedAccess, controlId: CONTROL_IDS.mfaEnforcement },
  { riskId: RISK_IDS.payrollUnauthorizedAccess, controlId: CONTROL_IDS.dbPatchManagement },
  { riskId: RISK_IDS.crmCredentialBreach, controlId: CONTROL_IDS.mfaEnforcement },
  { riskId: RISK_IDS.crmCredentialBreach, controlId: CONTROL_IDS.edr },
  { riskId: RISK_IDS.switchFirmwareOutage, controlId: CONTROL_IDS.vendorSecurityAssessment },
  { riskId: RISK_IDS.hrRecordsDeletion, controlId: CONTROL_IDS.automatedBackups },
  { riskId: RISK_IDS.dataCenterPowerLoss, controlId: CONTROL_IDS.upsWithGenerator },
  { riskId: RISK_IDS.laptopDataExposure, controlId: CONTROL_IDS.diskEncryption },
  { riskId: RISK_IDS.vendorComplianceLapse, controlId: CONTROL_IDS.vendorSecurityAssessment },
  { riskId: RISK_IDS.outageBudgetOverrun, controlId: CONTROL_IDS.upsWithGenerator },
];

export const TREATMENT_PLAN_IDS = {
  patchPayrollDb: demoId(7, 1),
  enforceCrmMfa: demoId(7, 2),
  upgradeSwitchFirmware: demoId(7, 3),
  automateHrBackups: demoId(7, 4),
  installRedundantUps: demoId(7, 5),
  retireLegacySwitch: demoId(7, 6),
};

export interface DemoTreatmentPlan {
  id: string;
  riskId: string;
  action: string;
  ownerEmail: string;
  dueInDays: number;
  status: TreatmentStatus;
}

export const DEMO_TREATMENT_PLANS: DemoTreatmentPlan[] = [
  {
    id: TREATMENT_PLAN_IDS.patchPayrollDb,
    riskId: RISK_IDS.payrollUnauthorizedAccess,
    action: 'Apply emergency security patch to the payroll database engine and rotate credentials.',
    ownerEmail: RISK_MANAGER_EMAIL,
    dueInDays: 14,
    status: TreatmentStatus.OPEN,
  },
  {
    id: TREATMENT_PLAN_IDS.enforceCrmMfa,
    riskId: RISK_IDS.crmCredentialBreach,
    action: 'Enforce a strong password policy and mandatory MFA for CRM access.',
    ownerEmail: OWNER2_EMAIL,
    dueInDays: 21,
    status: TreatmentStatus.IN_PROGRESS,
  },
  {
    id: TREATMENT_PLAN_IDS.upgradeSwitchFirmware,
    riskId: RISK_IDS.switchFirmwareOutage,
    action: 'Upgrade core switch firmware and validate vendor patch signing.',
    ownerEmail: OWNER1_EMAIL,
    dueInDays: -5, // deliberately overdue, to exercise the dashboard's overdue metric
    status: TreatmentStatus.IN_PROGRESS,
  },
  {
    id: TREATMENT_PLAN_IDS.automateHrBackups,
    riskId: RISK_IDS.hrRecordsDeletion,
    action: 'Implement automated nightly backups with off-site replication for the HR file server.',
    ownerEmail: OWNER2_EMAIL,
    dueInDays: 10,
    status: TreatmentStatus.COMPLETED,
  },
  {
    id: TREATMENT_PLAN_IDS.installRedundantUps,
    riskId: RISK_IDS.dataCenterPowerLoss,
    action: 'Install a redundant UPS and validate generator failover quarterly.',
    ownerEmail: RISK_MANAGER_EMAIL,
    dueInDays: 45,
    status: TreatmentStatus.OPEN,
  },
  {
    id: TREATMENT_PLAN_IDS.retireLegacySwitch,
    riskId: RISK_IDS.switchHardwareFailure,
    action: 'Retire the legacy switch hardware after failure remediation.',
    ownerEmail: RISK_MANAGER_EMAIL,
    dueInDays: -60, // past due, but cancelled — must not count as "overdue"
    status: TreatmentStatus.CANCELLED,
  },
];
