# Dora 🧭

> **Personal Jira Management Dashboard & Strategic Execution Roadmap**  
> *Transform high-noise Jira boards into structured personal workstreams, clear weekly priorities, and disciplined execution.*

---

## 💡 Core Philosophy

> ### **"The application should assist our thinking, not replace our thinking."**
> 
> **Dora** is engineered as a **cognitive exoskeleton**, not an autonomous micromanager. Traditional productivity suites often try to replace human thinking by enforcing rigid, black-box algorithms, opaque automated schedules, and bureaucratic workflows.
> 
> Dora takes the opposite approach:
> - **Transparent Situational Clarity**: Surfaces deadlines, buffer margins, subtask dependencies, and multi-workspace loads cleanly so **you** can evaluate trade-offs and decide where to focus.
> - **High-Agency Sandboxing**: The Strategic Roadmap and Custom Groupings are strictly isolated from Jira's team boards, giving you a private strategic scratchpad to structure, sequence (`Step 1: Active Focus`, `Step 2: Planned Next`), and execute work according to your own mental model.
> - **Self-Directed Discipline**: Compare external corporate deadlines against your internal self-target commitments, write rapid timestamped thoughts, and practice technical systems without corporate noise.

---


## 🌟 Overview

**Dora** is a high-performance personal command center built on top of Jira Cloud and Supabase. While Jira boards can quickly become cluttered with hundreds of tickets and complex team workflows, **Dora** introduces a clean personal execution layer:

- **Strategic Roadmapping**: Create custom groups, weekly milestones, and sequential workstreams via drag-and-drop without altering live team Jira data.
- **Personal Discipline**: Set your own target deadlines, track real-time buffer days, log timestamped notes, and maintain focus with Pomodoro timers.
- **Multi-Workspace Ingestion**: Seamlessly switch between multiple Jira Cloud domains with live cursor-based REST API synchronization.
- **3-Level Visual Hierarchy**: Traverse from Epics down to Stories and Subtasks with integrated progress metrics.

---

## 🚀 Key Features

### 1. 🗺️ Strategic Roadmap & Custom Grouping
- **Drag-and-Drop Sandbox**: Organize tasks into custom workstream buckets (e.g. *Week 1: Server Setup*, *Splunk Ingestion*, *Upcoming Deliverables*).
- **Auto-Aligned Source Queue**: Feed of all tasks auto-sorted by timeline (due dates) and priority.
- **Step Progression Engine**: Tasks automatically compute execution stages:
  - `Step X: Done` (Predecessor / Completed)
  - `Step X: Active Focus` (Current focus item)
  - `Step X: Planned Next` (Upcoming step)
- **100% Isolated**: Changes remain strictly in your private Supabase configuration, never polluting team Jira boards.

### 2. ⚡ Live Jira Cloud Synchronization
- Modern Jira Cloud REST API v3 cursor pagination (`/rest/api/3/search/jql`).
- Domain-isolated ingestion supporting multiple Atlassian Cloud accounts.
- Preserves full parent-child relationships across Epics, Stories, and Subtasks.

### 3. 👥 Multi-Account & Workspace Switcher
- Instantly switch between multiple company/personal Jira domains (e.g. *Softmania PS* vs *Personal Workspace*).
- Header profile menu scopes the hierarchy, assignees, reporters, and analytics dynamically.

### 4. 🎯 Personal Discipline & Tracking Overlays
- **Task Nicknames / Aliases**: Assign friendly short names to complex Jira tickets.
- **Self-Target Deadlines & Buffer Days**: Compare official Jira deadlines against your personal commitment dates.
- **Timestamped Notes & Daily Logs**: Rapid note taking with `Ctrl + Enter` keyboard shortcuts.
- **Jira-Style Subtasks Table**: Subtask progress bar with `% Done`, work links, priority badges, and assignees.

### 5. 📊 Executive Dashboard & Productivity Matrix
- **Status Distribution Donut**: Color-coded SVG chart with live status filtering and priority breakdown.
- **Focus Timer**: Configurable Pomodoro timer with SVG progress ring and session logger.
- **Quick To-Do**: Lightweight local checklist for ad-hoc daily tasks.
- **Recent Activity Feed**: Centralized stream of the latest 8 timestamped notes across all tasks.
- **Deep Analysis Graphs**: Interactive Network Graphs, Process Funnels, and Hierarchy Sunbursts powered by `@nivo`.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) with Turbopack
- **UI Library**: [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/)
- **Icons & Styling**: [Lucide Icons](https://lucide.dev/), `class-variance-authority`, `clsx`
- **Charts & Graphs**: Native SVG, [@nivo](https://nivo.rocks/) (Funnel, Network, Sunburst)
- **Database & ORM**: [Supabase PostgreSQL](https://supabase.com/), [Drizzle ORM](https://orm.drizzle.team/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)

---

## 🏁 Quick Start

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/rsnarsna/dora.git
cd dora
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your Supabase database credentials and Jira Cloud API credentials:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
DATABASE_URL=postgresql://postgres:your_password@db.supabase.co:5432/postgres

# Jira Cloud API Configuration
JIRA_EMAIL=your_email@example.com
JIRA_TOKEN=your_atlassian_api_token
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Security & Privacy

- All API keys, tokens, and database connection strings are kept exclusively on the server in `.env.local` and `.gitignore`.
- Personal notes, self-targets, and custom roadmap groupings are stored in your private Supabase database and are never published to team Jira comments.

---

## 📄 License
MIT © [rsnarsna](https://github.com/rsnarsna)