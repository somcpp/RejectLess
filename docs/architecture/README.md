# RejectLess — System Architecture

Rendered: [architecture-mermaid.png](architecture-mermaid.png) · Detailed version: [architecture.png](architecture.png) / [index.html](index.html)

```mermaid
flowchart TB
  subgraph DEV["📱 Citizen device · PWA"]
    direction LR
    UI["Next.js · React UI"] --> CAP["Scanner / Upload"] --> READ["pdf.js · Tesseract (WASM)"] --> ENG["Rule engine"] --> AF["Autofill"]
    VAULT[("IndexedDB · encrypted")]
    ENG <--> VAULT
  end

  subgraph EDGE["🌐 Edge"]
    direction LR
    R2[("R2 · rules & models")] --> CDN["Vercel CDN · WAF"]
  end

  subgraph SVC["⚙️ App services"]
    direction LR
    GW["AI gateway"] ~~~ KAPI["Knowledge API"] ~~~ BRK["Integration broker"]
  end

  subgraph EXT["🔗 External"]
    direction LR
    GROQ["Groq LLM"] ~~~ DL["DigiLocker"] ~~~ BH["Bhashini"] ~~~ PORT["Official portals"]
  end

  subgraph OPS["📚 Knowledge ops"]
    direction LR
    SRC["Gov sources"] --> DET["Change detect"] --> DRAFT["AI draft"] --> REV["Human review"] --> CI["CI tests"] --> PUB["Sign & publish"] --> DB[("Postgres")]
  end

  EDGE == "app · rules · models" ==> DEV
  DEV -. "redacted summary" .-> EDGE
  EDGE ==> SVC
  SVC -. "consented calls" .-> EXT
  DEV == "autofill" ==> EXT
  OPS == "signed rule packs" ==> EDGE

  classDef device fill:#e8effc,stroke:#1f3d7a,color:#1c2230
  classDef edge fill:#efe9fb,stroke:#6b4fbb,color:#1c2230
  classDef svc fill:#e5f4ea,stroke:#1b7a46,color:#1c2230
  classDef ext fill:#fdefdf,stroke:#d9771f,color:#1c2230
  classDef ops fill:#eef0f3,stroke:#6f7787,color:#1c2230
  classDef ai fill:#fff4e8,stroke:#d9771f,stroke-dasharray:4 3,color:#1c2230
  class UI,CAP,READ,ENG,AF,VAULT device
  class CDN,R2 edge
  class KAPI,BRK svc
  class DL,BH,PORT ext
  class SRC,DET,REV,CI,PUB,DB ops
  class GW,GROQ,DRAFT ai
  style DEV fill:#f6f9ff,stroke:#1f3d7a,stroke-width:2px
  style EDGE fill:#faf8ff,stroke:#6b4fbb,stroke-width:2px
  style SVC fill:#f5fbf7,stroke:#1b7a46,stroke-width:2px
  style EXT fill:#fffaf3,stroke:#d9771f,stroke-width:2px
  style OPS fill:#fafafa,stroke:#6f7787,stroke-width:2px
```

Regenerate the PNG by opening `mermaid.html` (headless Chrome with `--allow-file-access-from-files`), or paste `architecture.mmd` into https://mermaid.live.
