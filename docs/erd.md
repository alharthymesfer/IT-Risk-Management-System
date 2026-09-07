# Entity-Relationship Diagram

Source of truth: [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma). Nine tables,
no more — the MVP scope deliberately excludes compliance-framework, attachment, and notification
tables.

```mermaid
erDiagram
    USER ||--o{ ASSET : "owns"
    USER ||--o{ RISK : "owns"
    USER ||--o{ TREATMENT_PLAN : "owns"
    USER ||--o{ AUDIT_LOG : "acted (optional)"

    ASSET ||--o{ VULNERABILITY : "has"
    ASSET ||--o{ RISK : "is subject of"

    THREAT ||--o{ RISK : "is threat of"

    VULNERABILITY |o--o{ RISK : "is exploited by (optional)"

    RISK ||--o{ RISK_CONTROL : "mitigated by"
    CONTROL ||--o{ RISK_CONTROL : "mitigates"

    RISK ||--o{ TREATMENT_PLAN : "treated by"

    USER {
        uuid id PK
        string email UK
        string password_hash
        string first_name
        string last_name
        enum role
        boolean is_active
    }

    ASSET {
        uuid id PK
        string name
        enum category
        enum criticality
        uuid owner_id FK
    }

    THREAT {
        uuid id PK
        string name
        enum category
    }

    VULNERABILITY {
        uuid id PK
        string name
        enum severity
        uuid asset_id FK
    }

    RISK {
        uuid id PK
        string title
        enum category
        enum status
        int likelihood "1-5, NOT score/level"
        int impact "1-5, NOT score/level"
        uuid asset_id FK
        uuid threat_id FK
        uuid vulnerability_id FK "nullable"
        uuid owner_id FK
    }

    CONTROL {
        uuid id PK
        string name
        enum type
        enum effectiveness
    }

    RISK_CONTROL {
        uuid risk_id PK_FK
        uuid control_id PK_FK
    }

    TREATMENT_PLAN {
        uuid id PK
        uuid risk_id FK
        string action
        uuid owner_id FK
        datetime due_date
        enum status
    }

    AUDIT_LOG {
        uuid id PK
        uuid user_id FK "nullable, SET NULL on user delete"
        string action
        string entity_type
        uuid entity_id
        json old_value "nullable"
        json new_value "nullable"
        datetime created_at
    }
```

## Notes

- **`risk.likelihood` / `risk.impact` are the only persisted risk-scoring inputs.** There is no
  `score` or `level` column anywhere in the schema — both are always derived at read time via
  `packages/shared`. See [`architecture.md`](./architecture.md).
- **`risk_control`** is a pure many-to-many join table with a composite primary key
  (`risk_id`, `control_id`) and no surrogate `id` — a risk can have many mitigating controls, and a
  control can mitigate many risks.
- **`risk.vulnerability_id` is optional** (`ON DELETE SET NULL`) — a risk can exist without a
  specific known vulnerability (e.g. a strategic or compliance risk).
- **`audit_log.user_id` is optional** (`ON DELETE SET NULL`) — deleting a user preserves the
  historical audit trail of their actions instead of cascading the delete into it.
- Every other foreign key (`asset.owner_id`, `vulnerability.asset_id`, `risk.asset_id`,
  `risk.threat_id`, `risk.owner_id`, `treatment_plan.risk_id`, `treatment_plan.owner_id`) is
  `ON DELETE RESTRICT` or `CASCADE` as appropriate — e.g. deleting an `Asset` that still has
  `Vulnerability` or `Risk` rows pointing at it is rejected (`409 Conflict`) rather than silently
  cascading, and deleting a `Risk` cascades to its `risk_control` links and `treatment_plan` rows.
