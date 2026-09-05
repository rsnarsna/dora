# Dora 🧭

> **Personal Command Center, 2D → 3D Knowledge Universe & Kubernetes Architecture Studio**  
> *Transform complex projects, cloud systems, and learning goals into clear, visual 3D spaces that help you think better.*

---

## 💡 Core Philosophy

> ### **"The application should assist our thinking, not replace our thinking."**
> 
> Most software tries to decide things for you. It builds black-box schedules, enforces rigid steps, or floods you with automated alerts that take away your judgment.
> 
> **Dora is built as an intellectual workbench and cognitive exoskeleton:**
> - **You stay in control**: The software shows you clear context, dependencies, and trade-offs. You make the strategic decisions.
> - **Visual thinking first**: Whether you are breaking down Jira tickets, learning distributed systems, or designing software, you organize thoughts visually in 2D and 3D.
> - **Private and sandboxed**: Your personal notes, goals, and roadmaps live in your private database and never pollute official corporate boards.

---

## 🌟 Simple Feature Tour (What Dora Does)

Here is a simple, plain-English breakdown of every major feature in Dora:

### 1. 🧠 2D → 3D Knowledge Universe
> *Turn ideas, topics, and skills into interactive 3D objects instead of static flat notes.*

- **The Idea**: Traditional notes get buried in folders. In Dora, **each topic is a reusable 3D object** (like a building block).
- **Create Once, Reuse Everywhere**:
  - For example, you can create a concept called **`[Indexer]`**.
  - That exact same `[Indexer]` can live simultaneously in your **Splunk Cluster**, your **Monitoring Setup**, and your **Learning Goals**.
  - Change it once, and it updates everywhere with zero duplicate files.
- **2D Canvas Mode**: Work quickly on a clean flat canvas. Drag nodes, connect them with relationship wires (`depends on`, `monitors`, `feeds`), and write quick notes.
- **3D Universe Mode**: Flip a switch to turn your 2D thoughts into a full 3D spatial world with glowing rings, 3D meshes, and flowing particle streams.

---

### 2. 🎨 K8s 3D Architecture Studio & Cloud Environment
> *Design, map, and inspect distributed cloud architectures directly in 3D.*

- **Interactive 3D Workspace**: Pick real cloud components from the palette (Pods, Deployments, Services, Ingresses, Databases, Storage Volumes) and place them onto the 3D grid.
- **Draw Connections**: Click one resource and click another to establish networking and traffic flows.
- **Cursor-Focused Zoom**: Zoom in and out exactly where your mouse is pointing—inspecting fine details or flying out for the big picture.
- **Export & Portability**: Save your architecture as a clean PNG image, share it with a link, or export it to standard Kubernetes YAML.

---

### 3. 🗺️ Strategic Roadmap & Execution Sequencing
> *Organize your tasks step-by-step without altering team Jira boards.*

- **Independent Swimlanes**: Group Jira tasks into your own logical buckets (e.g. *Week 1: Foundations*, *Week 2: Telemetry*, *Upcoming*).
- **Step Engine**: Automatically categorizes tasks into:
  - `Step 1: Done` (Completed prerequisite)
  - `Step 2: Active Focus` (What you should be working on right now)
  - `Step 3: Planned Next` (What to pick up next)
- **Account Isolation**: Switch between your company workspace and your personal workspace with one click.
- **Drag & Reorder**: Reorder steps or drag cards between workstreams; changes save permanently to your private database.

---

### 4. 🎯 Personal Discipline & Task Command Center
> *Your daily execution workbench.*

- **Self-Target vs. Jira Due Date**: Set your own personal target date to build in buffer time before the official deadline.
- **Buffer Margin Warning**: Instantly see how many buffer days you have left before a sprint deadline.
- **Timestamped Thought Log**: Press `Ctrl + Enter` to log daily thoughts, technical solutions, or meeting takeaways on any ticket.
- **Focus Timer**: Built-in Pomodoro timer to help you maintain deep focus without opening extra apps.
- **Task Nicknames**: Give short, memorable names (like *"Auth Gateway"*) to long Jira ticket numbers (like *SCRUM-174*).

---

## ⚡ How Kubernetes Powers All Features

Dora borrows the modular, self-healing design of Kubernetes and brings it to personal thinking:

| Kubernetes Concept | How It Powers Your Thinking in Dora |
|---|---|
| **Pod (Hexagon)** | Represents a focused **Skill** or single **Concept Node**. |
| **Deployment (Tiered Block)** | Represents a multi-step **System** or **Project Deliverable**. |
| **PVC / Storage (Cylinder)** | Represents a **Data Store**, database, or information source. |
| **Service (Star)** | Represents a public **API**, communication bridge, or high-level goal. |
| **Security Shield** | Represents **Constraints**, security rules, or project boundaries. |
| **Platform Node** | Represents foundational pillars and core infrastructure topics. |
| **Networking Wires & Particles** | Visualizes relationship connections and information flow in 3D. |
| **Cursor-Focused Zoom** | Smooth 3D camera controls that let you inspect deep details or fly out to see the big picture. |

> 📖 **Deep Dive Documentation**: For a complete 1-by-1 breakdown of all Kubernetes resources, declarative YAML specs, real kubectl command outputs, and architectural relationships, see [**Kubernetes Features & Architecture Guide**](docs/k8s-features-reference.md).

---

## 🛠️ Technology Behind Dora

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Shadcn UI
- **3D Graphics**: Three.js WebGL Engine, Custom Raycaster Navigation, Shader Halos
- **Database**: Supabase PostgreSQL with Drizzle ORM
- **Icons**: Lucide Icons
- **Language**: TypeScript 5 (Strict Mode, 0 compile errors)

---

## 🏁 Quick Start (Run it locally in 3 minutes)

### 1. Clone & Install
```bash
git clone https://github.com/rsnarsna/dora.git
cd dora
npm install
```

### 2. Configure Your Environment (`.env.local`)
Create a `.env.local` file in the root directory:
```env
# Supabase PostgreSQL
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-key
DATABASE_URL=postgresql://postgres:your-password@db.supabase.co:5432/postgres

# Jira Cloud API (Optional - for syncing live Jira boards)
JIRA_EMAIL=your-email@domain.com
JIRA_TOKEN=your-atlassian-api-token
```

### 3. Start the Development Server
```bash
npm run dev
```

Open **[http://localhost:3000/dashboard](http://localhost:3000/dashboard)** to start using Dora!

---

## 🧭 Page Directory / Where to Go

| Navigation Link | URL | Purpose |
|---|---|---|
| **Overview** | `/dashboard` | Daily Jira tasks, focus timer, subtask progress, and personal notes. |
| **Strategic Roadmap** | `/dashboard/roadmap` | Drag-and-drop sequencing (`Step 1: Focus`, `Step 2: Next`) saved to Supabase. |
| **Knowledge Universe** | `/dashboard/knowledge` | 2D/3D concept thinking canvas: create once, connect once, reuse everywhere. |
| **K8s Architecture** | `/dashboard/k8s-draw` | 3D visual cloud architecture studio with YAML and PNG export. |

---

## 🔒 Privacy Guarantee

- Your personal notes, self-targets, 3D knowledge graphs, and custom roadmap groups stay private in your Supabase database.
- Nothing you write in your personal logs or roadmaps is ever sent to team Jira ticket comments or public boards.

---

## 📄 License
MIT © [rsnarsna](https://github.com/rsnarsna)
