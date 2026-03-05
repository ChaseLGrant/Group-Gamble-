# Group Gamble 🎲

> **Beta MVP** — Play-money predictions with friends. No real money.

A mobile-first web app where friends create private groups, make prediction lines about the night ("over/under beers", "will X talk to Y", "arrives before 10:30"), and bet play-money points on the outcome.

---

## Features

- **Magic link + Google OAuth** sign-in (no passwords)
- **Private groups** with shareable invite links
- **Two prediction types**: Yes/No and Over/Under with configurable lines
- **Real-time updates** via Supabase Realtime (new picks, settlements)
- **Points system**: Each user starts with 1,000 points per group
- **Atomic settlement**: Winners split the losing pool proportional to stake
- **Push/tie handling**: Exact line on Over/Under → everyone refunded
- **Leaderboard** with net points, W/L record, and win rate
- **Mobile-first UI** with bottom navigation

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | TailwindCSS |
| Backend | Supabase (Postgres + Auth + Realtime) |
| Server Logic | Next.js Server Actions (service role) |
| Hosting | Vercel (frontend), Supabase (db) |

---

## Quick Start (Local Dev)

### Prerequisites

- Node.js 18+
- A Supabase account (free tier works)

### 1. Clone & Install

```bash
git clone <your-repo>
cd group-gamble
npm install
```

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Note your **Project URL**, **anon key**, and **service_role key**
   (Project Settings → API)

### 3. Set Up the Database

Your Supabase project starts with an empty database — you need to create the tables, functions, and security policies by running a single SQL script.

1. Open your Supabase project dashboard at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **SQL Editor** in the left sidebar
3. Click **+ New query** (top-left)
4. Open the file **`supabase/migrations/001_initial_schema.sql`** from this repo, copy the **entire** contents, and paste it into the editor
5. Click **Run** (or press `Cmd/Ctrl + Enter`)
6. You should see **"Success. No rows returned"** — that means it worked!

> **What this creates:** 7 tables (`profiles`, `groups`, `group_members`, `group_balances`, `predictions`, `wagers`, `transactions`), helper functions, Row Level Security policies, indexes, and realtime subscriptions. See [Database Schema](#database-schema) below for details.

> **Tip:** The script is safe to re-run — it uses `IF NOT EXISTS` and `DROP … IF EXISTS` so it won't fail if you run it again.

#### Verify Your Database

After running the script, confirm the tables were created:

1. Click **Table Editor** in the left sidebar of your Supabase dashboard
2. You should see all 7 tables listed: `profiles`, `groups`, `group_members`, `group_balances`, `predictions`, `wagers`, `transactions`

Or run this quick check in the **SQL Editor**:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;
```

You should see 7 rows returned.

### 4. Configure Auth

In Supabase → **Authentication → URL Configuration**:
- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: `http://localhost:3000/auth/callback`

**Optional: Enable Google OAuth**
- Auth → Providers → Google → Enable
- Add your Google OAuth credentials
- Add `http://localhost:3000/auth/callback` as authorized redirect URI in Google Cloud Console

### 5. Set Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Run Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel + Supabase

### Step 1: Create Supabase Project (Production)

1. Create a new Supabase project (or use the same one)
2. Run `supabase/migrations/001_initial_schema.sql` in the SQL Editor (same steps as local setup — see [Step 3](#3-set-up-the-database))
3. Configure Auth redirect URLs (see Step 4 below)

### Step 2: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Or connect your GitHub repo in the Vercel dashboard for auto-deployments.

### Step 3: Set Vercel Environment Variables

In Vercel → Project Settings → Environment Variables, add:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhb...` | All |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhb...` | All |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Production |

> ⚠️ **NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. It's only used in Server Actions.

### Step 4: Configure Supabase Auth for Production

In Supabase → Authentication → URL Configuration:
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: `https://your-app.vercel.app/auth/callback`

For custom domains, add those URLs too.

### Step 5: Redeploy (Pick Up Env Vars)

```bash
vercel --prod
```

---

## Database Schema

```
profiles          → One per auth.users. display_name, avatar_url.
groups            → name, emoji, owner_id, invite_code (unique).
group_members     → group_id, user_id, role (owner|member|moderator).
group_balances    → group_id, user_id, balance_points (starts 1000).
predictions       → title, type, line, status, outcome, etc.
wagers            → prediction_id, user_id, pick, amount_points.
transactions      → Audit ledger: DEBIT|CREDIT|REFUND|PAYOUT.
```

### Key Database Functions

- `is_group_member(group_id)` — Used in RLS policies
- `is_group_admin(group_id)` — Used in RLS policies
- `update_balance(group_id, user_id, delta)` — Atomic balance update with negative-balance protection
- `handle_new_user()` — Trigger that auto-creates profile on signup

---

## App Routes

| Route | Description | Auth Required |
|-------|-------------|---------------|
| `/` | Landing / sign-in | No |
| `/auth/callback` | OAuth callback | No |
| `/app` | Groups list | Yes |
| `/g/[groupId]` | Group feed | Yes (member) |
| `/g/[groupId]/new` | Create prediction | Yes (member) |
| `/g/[groupId]/p/[predId]` | Prediction detail + wager | Yes (member) |
| `/g/[groupId]/leaderboard` | Group leaderboard | Yes (member) |
| `/invite/[code]` | Join group by invite | Yes (redirects to sign-in) |
| `/settings` | Profile settings | Yes |

---

## Points System

- **Starting balance**: 1,000 points per group
- **Minimum wager**: 1 point
- **Maximum wager**: All available points ("All In")
- **Escrow**: Points are held when a wager is placed
- **Payout formula**: `stake + floor(losing_pool × (my_stake / winning_pool_total))`
- **Rounding**: Last winner gets any remainder to ensure full pool distribution
- **Push** (O/U exact line match): All wagers refunded
- **Cancel**: All wagers refunded

---

## Supabase Edge Functions (Alternative)

The `supabase/functions/` directory contains Deno edge function equivalents of the server actions. To deploy these instead of using server actions:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Deploy all functions
supabase functions deploy create-group
supabase functions deploy join-group
supabase functions deploy place-wager
supabase functions deploy settle-prediction
supabase functions deploy cancel-prediction
```

Set the `SUPABASE_SERVICE_ROLE_KEY` secret:
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Real-Time Architecture

The app uses Supabase Realtime with Postgres CDC (Change Data Capture):

- **Group feed** (`/g/[id]`): Subscribes to `predictions` and `wagers` in the group
- **Prediction detail** (`/g/[id]/p/[id]`): Subscribes to the specific prediction's wagers and balance changes
- **Leaderboard**: Subscribes to `group_balances` changes

Channels are cleaned up on component unmount.

---

## Development Checklist

After first deploy, verify:

- [ ] Magic link emails are received (check Supabase Auth logs)
- [ ] Google OAuth redirects correctly
- [ ] Creating a group works and you're taken to the group page
- [ ] Invite link joins correctly and initializes 1,000 points
- [ ] Creating a Yes/No prediction appears in the feed
- [ ] Creating an Over/Under prediction with a line
- [ ] Placing a wager deducts points
- [ ] Editing a wager updates the escrow correctly
- [ ] Settling a prediction pays out winners
- [ ] Settling a push refunds everyone
- [ ] Canceling a prediction refunds everyone
- [ ] Leaderboard updates in real-time
- [ ] Mobile layout looks correct on iOS/Android

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only) |
| `NEXT_PUBLIC_APP_URL` | Yes | Your app's base URL (for invite links, auth callbacks) |

---

## Security Notes

- **RLS is enabled** on all tables. The service role key (used in server actions) bypasses RLS but only runs server-side after custom authorization checks.
- **Balance mutations** always go through `update_balance()` which enforces non-negative balance.
- **Settlement is idempotent**: Checking `status IN ('OPEN', 'LOCKED')` before settling prevents double-payouts.
- **No real money**: The app is explicitly play-money only. No payment processors integrated.
- **Invite codes**: 8-character hex codes. Group owners can regenerate them if compromised.

---

## Beta Limitations

- No comment threads on predictions (planned for v2)
- No push notifications (browser-only real-time)
- No avatar upload (uses Google OAuth avatar or initials)
- No time-zone aware close times in UI (stored as UTC)
- Rate limiting is basic (Vercel/Supabase defaults)

---

*Built with Next.js 14 + Supabase. Play-money only — for entertainment.*
