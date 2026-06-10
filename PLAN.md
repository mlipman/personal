Technical Directive: Side-Project Architecture & Secrets Management

1. High-Level Concepts & Secret Strategy
   We isolate configuration data by its lifespan and lifecycle.

Global Singletons (Shared Secrets): Third-party developer platform keys (OpenAI, Resend, AWS/S3-compatible image hosting) live strictly at the root level of the workspace. They apply universally across throwaways and core apps.

Environment-Coupled Secrets (Database/Auth): Database tokens and app secrets have separate development and production vectors.

Development: Database strings point back to the central Docker container running on your remote virtual machine.

Production: Database strings are managed natively inside the Vercel deployment console, completely isolated from your server environment.

2. Workspace Directory Blueprint
   Instruct your coding agent to establish this filesystem structure inside the root personal/ directory:

Plaintext
personal/
├── .env.global # Target for shared tokens (Git-ignored)
├── .env.global.example # Public structural blueprint for shared tokens
├── README.md # Execution runbook and system mapping
├── infrastructure/ # System-wide remote configuration files
│ └── docker-compose.yml
├── templates/ # Reusable micro-architectures
│ └── nextjs-prisma-pg/
│ ├── package.json
│ ├── prisma/
│ │ └── schema.prisma
│ └── .env.example
└── projects/ # Active software domains
├── core-project-alpha/
└── throwaway-spike-test/ 3. Configuration & Template Implementation
Provide the agent with these exact template declarations to implement your portability and infrastructure goals.

The Root Runbook (README.md)
Markdown

# Personal Development Workspace

## System Mapping

- **Production Edge Hosting:** Vercel (Auto-deployed via GitHub branch hooks)
- **Shared Remote Infrastructure:** Ubuntu Box (Hetzner Cloud / DigitalOcean)
- **Database Architecture:** Individual PostgreSQL instances grouped inside a shared Docker runtime on the remote machine.

## Secret Architecture

1. Core platforms use tokens inherited from the root `.env.global`.
2. App-specific variables override global tokens within their respective project subdirectories.
3. Production secrets are bound entirely inside the Vercel project settings dashboard.

## Initial Setup Execution

1. Establish SSH access to the remote machine.
2. Initialize Docker environments:

````bash
   cd infrastructure
   # Sync compose settings to the server shell and run:
   docker compose up -d

### The Remote Engine (`infrastructure/docker-compose.yml`)
```yaml
version: '3.8'

services:
  # The centralized development database engine
  postgres-hub:
    image: postgres:16-alpine
    container_name: dev-postgres-hub
    restart: unless-stopped
    environment:
      POSTGRES_USER: dev_admin
      POSTGRES_PASSWORD: ${GLOBAL_DEV_DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - pg_cluster_data:/var/lib/postgresql/data

  # Remote execution frame for persistent workspace agents
  remote-agent-runner:
    image: python:3.11-slim
    container_name: background-agent-workspace
    restart: unless-stopped
    volumes:
      - ../projects:/home/agent/workspace
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    command: sleep infinity

volumes:
  pg_cluster_data:
The App Template Engine (templates/nextjs-prisma-pg/.env.example)
Bash
# ==============================================================================
# LOCAL/DEVELOPMENT SPECIFIC
# ==============================================================================
# Point connection strings to your remote box IP.
# Append unique database names per project to isolate namespaces.
DATABASE_URL="postgresql://dev_admin:YOUR_SERVER_PASSWORD@YOUR_REMOTE_IP:5432/change_me_to_project_name?schema=public"

# ==============================================================================
# COPIED GLOBAL INHERITANCE
# ==============================================================================
OPENAI_API_KEY="inherited_from_global_env"
IMAGE_HOSTING_TOKEN="inherited_from_global_env"
4. The Agent's Explicit Task Checklist
Pass this precise task script directly to your coding assistant to initiate automation:

Scaffold Directory Trees: Generate the directory skeleton precisely matching the structure above.

Build File Templates: Write out the .env.global.example, README.md, docker-compose.yml, and templates/ files exactly as structured.

Write a App Creation Utility Script: Author a lightweight shell script or Node.js task runner at personal/scripts/new-project.sh. The utility must prompt for a project name, clone the contents of templates/nextjs-prisma-pg/ into a new named directory under projects/, and customize the placeholder string in the new database connection line (change_me_to_project_name).

Configure Git Controls: Establish a root .gitignore file blocking any .env, .env.global, or localized .env.local instances from leaking up into the repo history.

Once the agent executes these configurations, your setup is completely portable. To mirror this workflow to a new laptop, you simply pull down your root personal repo, spin up the Docker Compose stack on your VPS, populate your local environment variables, and hit the ground running.
````
