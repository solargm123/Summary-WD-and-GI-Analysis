# Summary WD & GI Workflow Note

## Skill router

```mermaid
flowchart TD
    A[New request] --> B{Which layer?}
    B -->|WD GI PR Yield Formula| C[Calculation Lock]
    B -->|Popup Layout Province Plant TH EN| D[UI Consistency]
    B -->|Table RLS Migration Permission| E[Supabase Safety]
    B -->|Unknown bug| F[Bug Triage]
    C --> G[Regression Guard]
    D --> G
    E --> G
    F --> G
    G --> H[Targeted test]
    H --> I[Diff review]
    I --> J[One coherent commit]
```

## Data and calculation boundary

```mermaid
flowchart LR
    R[Raw Data] --> N[Normalization]
    N --> W[Working Day]
    N --> GI[Global Irradiance]
    W --> P[PR / Yield]
    GI --> P
    P --> D[Dashboard]
    UI[UI / Popup / Language] -. presentation only .-> D
    UI -. do not modify .-> P
```

## Database safety path

```mermaid
flowchart LR
    S[Current Schema + RLS] --> M[Additive Migration]
    M --> C[Existing Data Compatibility]
    C --> R[Role/RLS Check]
    R --> F[Frontend Compatibility]
    F --> A[Apply]
```

## Short operating note
Treat formulas as locked unless the request explicitly changes them. For visual changes, stay in the UI layer. For Supabase work, prefer additive migrations and preserve RLS. When a bug is vague, classify its layer before opening large files.
