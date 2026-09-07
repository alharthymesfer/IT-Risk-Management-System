import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/users/password.util';
import {
  DEMO_ASSETS,
  DEMO_CONTROLS,
  DEMO_PASSWORD,
  DEMO_RISK_CONTROLS,
  DEMO_RISKS,
  DEMO_THREATS,
  DEMO_TREATMENT_PLANS,
  DEMO_USERS,
  DEMO_VULNERABILITIES,
} from '../src/prisma/seed-data';

const prisma = new PrismaClient();

function dueDateFromNow(offsetDays: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date;
}

function requireUserId(userIdByEmail: Map<string, string>, email: string): string {
  const id = userIdByEmail.get(email);
  if (!id) {
    throw new Error(`Seed data error: no seeded user found for email "${email}"`);
  }
  return id;
}

async function seedUsers(): Promise<Map<string, string>> {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const userIdByEmail = new Map<string, string>();

  for (const user of DEMO_USERS) {
    const record = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: true,
      },
      create: {
        email: user.email,
        passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: true,
      },
    });
    userIdByEmail.set(user.email, record.id);
  }

  return userIdByEmail;
}

async function seedAssets(userIdByEmail: Map<string, string>): Promise<void> {
  for (const asset of DEMO_ASSETS) {
    const ownerId = requireUserId(userIdByEmail, asset.ownerEmail);
    const data = {
      name: asset.name,
      description: asset.description,
      category: asset.category,
      criticality: asset.criticality,
      ownerId,
    };
    await prisma.asset.upsert({
      where: { id: asset.id },
      update: data,
      create: { id: asset.id, ...data },
    });
  }
}

async function seedThreats(): Promise<void> {
  for (const threat of DEMO_THREATS) {
    const data = { name: threat.name, description: threat.description, category: threat.category };
    await prisma.threat.upsert({
      where: { id: threat.id },
      update: data,
      create: { id: threat.id, ...data },
    });
  }
}

async function seedVulnerabilities(): Promise<void> {
  for (const vulnerability of DEMO_VULNERABILITIES) {
    const data = {
      name: vulnerability.name,
      description: vulnerability.description,
      severity: vulnerability.severity,
      assetId: vulnerability.assetId,
    };
    await prisma.vulnerability.upsert({
      where: { id: vulnerability.id },
      update: data,
      create: { id: vulnerability.id, ...data },
    });
  }
}

async function seedRisks(userIdByEmail: Map<string, string>): Promise<void> {
  for (const risk of DEMO_RISKS) {
    const ownerId = requireUserId(userIdByEmail, risk.ownerEmail);
    const data = {
      title: risk.title,
      description: risk.description,
      category: risk.category,
      status: risk.status,
      likelihood: risk.likelihood,
      impact: risk.impact,
      assetId: risk.assetId,
      threatId: risk.threatId,
      vulnerabilityId: risk.vulnerabilityId,
      ownerId,
    };
    await prisma.risk.upsert({
      where: { id: risk.id },
      update: data,
      create: { id: risk.id, ...data },
    });
  }
}

async function seedControls(): Promise<void> {
  for (const control of DEMO_CONTROLS) {
    const data = {
      name: control.name,
      description: control.description,
      type: control.type,
      effectiveness: control.effectiveness,
    };
    await prisma.control.upsert({
      where: { id: control.id },
      update: data,
      create: { id: control.id, ...data },
    });
  }
}

async function seedRiskControls(): Promise<void> {
  for (const link of DEMO_RISK_CONTROLS) {
    await prisma.riskControl.upsert({
      where: { riskId_controlId: { riskId: link.riskId, controlId: link.controlId } },
      update: {},
      create: { riskId: link.riskId, controlId: link.controlId },
    });
  }
}

async function seedTreatmentPlans(userIdByEmail: Map<string, string>): Promise<void> {
  for (const plan of DEMO_TREATMENT_PLANS) {
    const ownerId = requireUserId(userIdByEmail, plan.ownerEmail);
    const data = {
      riskId: plan.riskId,
      action: plan.action,
      ownerId,
      dueDate: dueDateFromNow(plan.dueInDays),
      status: plan.status,
    };
    await prisma.treatmentPlan.upsert({
      where: { id: plan.id },
      update: data,
      create: { id: plan.id, ...data },
    });
  }
}

async function main(): Promise<void> {
  console.log('Seeding demo data...');

  const userIdByEmail = await seedUsers();
  console.log(`  users: ${DEMO_USERS.length}`);

  await seedAssets(userIdByEmail);
  console.log(`  assets: ${DEMO_ASSETS.length}`);

  await seedThreats();
  console.log(`  threats: ${DEMO_THREATS.length}`);

  await seedVulnerabilities();
  console.log(`  vulnerabilities: ${DEMO_VULNERABILITIES.length}`);

  await seedRisks(userIdByEmail);
  console.log(`  risks: ${DEMO_RISKS.length}`);

  await seedControls();
  console.log(`  controls: ${DEMO_CONTROLS.length}`);

  await seedRiskControls();
  console.log(`  risk-control links: ${DEMO_RISK_CONTROLS.length}`);

  await seedTreatmentPlans(userIdByEmail);
  console.log(`  treatment plans: ${DEMO_TREATMENT_PLANS.length}`);

  console.log('Seed complete. Safe to re-run — every row is upserted by a fixed id.');
  console.log(`Demo login password for every seeded user: ${DEMO_PASSWORD}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
