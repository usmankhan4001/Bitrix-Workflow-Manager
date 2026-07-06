# Implementation Plan: Workflow Manager — v2 (Updated 2026-06-02)

## Status: ✅ Core Implementation Complete

---

## What Was Built

### Backend (NestJS — `apps/api/`)

#### Prisma Schema Changes
- `Agent` — added `whatsapp_phone` (optional)
- `AssignmentLog` — new model tracking every round-robin assignment (lead_id, agent, team, WA notified flag)
- Settings seeded with new keys: `WHATSAPP_ENABLED`, `ONCLOUD_ASSIGN_TEMPLATE`, `ONCLOUD_OVERDUE_TEMPLATE`, `ONCLOUD_TEMPLATE_LANGUAGE`, `SLA_HOURS`

#### New: `WhatsappService` (`src/whatsapp/`)
- Integrates **OnCloud API** (`apps.oncloudapi.com`)
- `sendTemplateMessage()` — sends approved WA template with body params
- `sendLeadAssignedNotification()` — fires on new lead assignment
- `sendOverdueNotification()` — fires on SLA breach
- `testConnection()` — validates token by calling `getTemplates`
- `getTemplates()` — fetches available templates from OnCloud

#### Expanded: `WorkflowService`
- `fetchBitrixUsers(token, domain)` — calls `user.get` + `department.get`, maps users with dept names, supports pagination
- `fetchBitrixDepartments(token, domain)` — returns flat department list
- `createBitrixTask(...)` — `tasks.task.add` with deadline, title, CRM link
- `assignLeadInBitrix(...)` — `crm.lead.update` to set `ASSIGNED_BY_ID`
- `pickNextAgent(team)` — true round-robin: finds last assigned agent in team, picks next in creation order
- `processLeadAssignment(leadId, team, token, domain)` — full pipeline: assign lead → create task → log → WhatsApp notify
- `handleTaskCommentWebhook(payload)` — processes Bitrix24 outbound webhook for task comments
- `handleSlaBreachCheck(leadId, assignedAt)` — checks if SLA expired, fires overdue WA
- `getAssignmentLog(limit)` + `getAssignedTodayCount()`
- `updateAgent()` — PATCH support for name/team/phone

#### Expanded: `WorkflowController` — New Endpoints
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/workflow/bitrix-users` | Fetch Bitrix24 users grouped by dept |
| GET | `/api/workflow/bitrix-departments` | Fetch departments |
| POST | `/api/workflow/assign-lead` | Round-robin assign + task + WA |
| POST | `/api/workflow/webhook/task-comment` | Bitrix24 webhook receiver |
| GET | `/api/workflow/assignment-log` | Assignment history |
| GET | `/api/workflow/assigned-today` | Count assigned today |
| PUT | `/api/workflow/agents/:id` | Update agent details |
| POST | `/api/workflow/whatsapp/test` | Test OnCloud connection |
| GET | `/api/workflow/whatsapp/templates` | List WA templates |

---

### Frontend (React — `apps/dashboard/`)

#### UI Redesign: Bitrix24 Light Theme
- CSS completely redesigned to match Bitrix24's actual embedded app look:
  - Dark sidebar (`#1a2332`) + Light content area (`#eef2f5` bg, `#fff` cards)
  - Primary blue: `#2dbcf5`
  - Proper Bitrix24 typography, spacing, component styles
- All pages rebuilt with `card`, `btn-primary`, `badge-*`, `table-header`, `page-header` utility classes

#### Updated Pages
- **DashboardHome** — KPI cards, late leads table with Force Assign button, live `assigned-today` counter
- **TeamManagement** — dynamic Bitrix24 user picker (grouped by department with search), WhatsApp phone field, inline edit support
- **WorkflowSettings** — visual day picker for off-days, SLA hours setting, toast feedback
- **NotificationSettings** (new) — WhatsApp enable toggle, template pickers (auto-populated from OnCloud API), connection test
- **ActivityLog** (new) — full assignment history with WA notified status

#### New Routes
- `/dashboard/notifications` → WhatsApp Alerts settings
- `/dashboard/activity` → Assignment Log

---

## Setup Instructions

### 1. Configure Environment

Edit `apps/api/.env`:
```
ONCLOUD_API_TOKEN=your_token_from_oncloudapi_dashboard
```

### 2. Run Migrations
```bash
cd apps/api
npx prisma db push
```

### 3. Start Both Apps
```bash
# Terminal 1
cd apps/api && npm run start:dev

# Terminal 2
cd apps/dashboard && npm run dev
```

### 4. Configure Bitrix24 Webhook
In Bitrix24 → Developer Resources → Outbound Webhooks:
- Event: `ONTASKCOMMENTADD`
- Handler URL: `https://your-domain.com/api/workflow/webhook/task-comment`

### 5. WhatsApp Template Requirements
Your OnCloud API account must have approved templates with:
- **Assignment template** — body params: `{{1}}` = Agent Name, `{{2}}` = Lead ID
- **Overdue template** — body params: `{{1}}` = Agent Name, `{{2}}` = Lead ID

---

## Open Items / Next Steps
- [ ] Scheduled SLA breach checker (cron job to periodically scan assignment logs)
- [ ] Refresh token handling for Bitrix24 OAuth
- [ ] Multi-team assignment routing (determine team from lead source/pipeline)
- [ ] Bitrix24 app manifest for production embedding
