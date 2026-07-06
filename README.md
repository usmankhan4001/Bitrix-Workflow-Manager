<div align="center">
  <img src="https://img.shields.io/badge/Bitrix24-00AEEF?style=for-the-badge&logo=bitrix24&logoColor=white" alt="Bitrix24" />
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
</div>

<h1 align="center">BitrixFlow Platform</h1>

<p align="center">
  <strong>Advanced Sales Operations & Lead Distribution Engine for Bitrix24</strong><br/>
  <em>A highly configurable, external workflow manager designed to solve operational challenges in high-volume sales environments.</em>
</p>

<p align="center">
  <a href="https://your-app-domain.com"><strong>🔗 View Live App</strong></a>
</p>

---

## 📖 Overview

**BitrixFlow** is a custom automation engine that acts as the brain behind Bitrix24 CRM. It controls the logic for lead assignments, SLA enforcement, escalations, source routing, and agent notifications, separating the business logic from the CRM data layer.

### Why BitrixFlow?
- **Zero Hardcoding**: All agent lists, routing teams, working hours, and SLA rules are managed dynamically via a sleek React dashboard.
- **Fair Distribution**: Advanced algorithms (Round Robin, Load-Balanced, Weighted) prevent lead theft and ensure equal opportunity.
- **Strict SLA Enforcement**: Automatically monitors follow-ups and escalates delayed leads to workflow managers.
- **Real-time Visibility**: Gives managers live operations panels to see active queues and SLA breaches instantly.

---

## 🏗️ Architecture

The system splits responsibilities between the primary CRM workspace and the workflow automation engine. Bitrix24 remains the system of record, while BitrixFlow executes the rules.

```mermaid
graph TD
    subgraph Client CRM
        B24[Bitrix24 CRM]
    end
    
    subgraph BitrixFlow Platform
        UI[React Vite Dashboard]
        API[NestJS API Server]
        DB[(PostgreSQL)]
    end
    
    subgraph External Integrations
        WA[WhatsApp Provider API]
    end

    B24 <-->|OAuth / Webhooks| API
    UI <-->|REST API| API
    API <-->|Prisma ORM| DB
    API -->|WhatsApp Alerts| WA
```

---

## ⚡ Core Modules

| Module | Core Responsibility |
|---|---|
| **Lead Distribution** | Routes leads using Round Robin, Load-Balanced, Weighted, and Hybrid algorithms. |
| **Agent Management** | Tracks statuses (Available, Busy, Break, Leave, Offline). Only available agents receive leads. |
| **Follow-up SLA** | Enforces response deadlines based on lead source (e.g., Meta Ads: 15 mins, Referral: 2 hours). |
| **Duplicate Detection** | Scans CNIC, phone, and email to merge or flag duplicate leads for review. |
| **Lead Ownership** | Locks lead ownership to an agent for a configurable window to prevent "lead theft". |
| **Notification Engine** | Direct integration with WhatsApp APIs to notify agents of assignments and escalate delayed responses. |
| **Rule Builder** | No-code interface for complex routing (e.g., `IF Source = Meta AND Project = Box Park THEN Assign Telesales`). |

---

## 🚀 Setup & Local Development

This project uses a monorepo structure containing the `api` (NestJS) and `dashboard` (React).

### 1. Configure Environment Variables

**Backend (`apps/api/.env`):**
```env
PORT=3000
DATABASE_URL="postgresql://user:password@localhost:5432/bitrixflow"

# Bitrix24 Application Credentials
BITRIX_PORTAL_URL=https://your-crm.bitrix24.com
BITRIX_CLIENT_ID=your_client_id
BITRIX_CLIENT_SECRET=your_client_secret
BITRIX_REDIRECT_URI="http://localhost:3000/api/bitrix/oauth/callback"
BITRIX_WEBHOOK_TOKEN=your_inbound_webhook_url

# Frontend Dashboard URL
FRONTEND_URL="http://localhost:5173"

# WhatsApp API
ONCLOUD_API_TOKEN=your_oncloud_token
```

**Frontend (`apps/dashboard/.env`):**
```env
VITE_API_URL="http://localhost:3000"
```

### 2. Database Migrations

Navigate to the API folder and sync the Prisma schema:
```bash
cd apps/api
npx prisma db push
# or to generate the client:
npx prisma generate
```

### 3. Run the Applications

From the root directory:
```bash
# Install root and workspace dependencies
npm install

# Start Backend (NestJS)
cd apps/api
npm run start:dev

# Start Frontend (React)
cd apps/dashboard
npm run dev
```

---

## 🐳 Deployment (Dokploy / Docker)

The platform is container-ready. 

**Using Docker Compose:**
1. Connect your Git repository to your deployment orchestrator (like Dokploy).
2. Point it to the root `docker-compose.yml`.
3. The orchestrator will automatically build the `api` and `dashboard` services based on their respective `Dockerfile`s.

**Separate Services (Recommended):**
* **API**: Set Context Path to `apps/api` and expose port `3000`.
* **Dashboard**: Set Context Path to `apps/dashboard` and expose port `80`.

---

## 🔗 Bitrix24 Webhooks Integration

Configure the following outbound webhooks in your Bitrix24 Developer portal to link the CRM to your deployed API:

1.  **Lead Assignment** (`ONCRMLEADADD`) ➔ `https://your-domain.com/api/workflow/assign-lead`
2.  **Task Comments** (`ONTASKCOMMENTADD`) ➔ `https://your-domain.com/api/workflow/webhook/task-comment`
3.  **Lead Reassignment** (`ONCRMLEADUPDATE`) ➔ `https://your-domain.com/api/workflow/webhook/lead-change`

---
*Developed and maintained by usmankhan4001.*
