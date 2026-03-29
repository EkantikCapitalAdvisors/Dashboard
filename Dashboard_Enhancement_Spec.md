**EKANTIK CAPITAL ADVISORS**

**Dashboard Enhancement Spec**

Access Control, Prospect Tracking & Admin Unification

*Enhancement to dashboard.ekantikcapital.com • v3*

1\. Scope & Architecture

1.1 What This Is

**This is an enhancement to the existing ECFS dashboard at dashboard.ekantikcapital.com.** The dashboard's core functionality --- trade data, performance charts, strategy display --- remains untouched. This spec adds four layers on top of the existing app: access control, visitor tracking, Discord gating, and a unified admin experience.

1.2 What Changes vs. What Stays

  ----------------------- ----------------------------------------------------------------------------- --------------------------------------------------------------------------------------------------------------------------------
  **Component**           **Current State**                                                             **After Enhancement**

  **Dashboard UI**        Public --- anyone with the URL sees all trade data, performance, and charts   No change to the UI itself. Same trades, same charts, same layout. Clerk auth gate sits in front of it.

  **Dashboard access**    Open --- no authentication required                                           Gated --- Clerk magic link auth. Pre-approved emails get instant access. Unknown emails queue for your approval.

  **Trade admin**         Exists --- no authentication. You use it to enter/manage trades.              Protected behind Clerk admin role. Same trade entry interface, now secured. Prospect tracking added alongside it.

  **Discord link**        Public link visible on dashboard. Anyone can join.                            Removed. Replaced with "Request Live Access" button. You approve from admin.

  **Visitor tracking**    None --- no visibility into who visits or how often                           Every authenticated visit logged. Engagement scoring. Hot/cold prospect identification.

  **Admin experience**    Trade entry only. No auth. Single-purpose.                                    Unified admin: trade entry (existing) + prospect tracking + access approvals + Discord approvals. All behind Clerk admin role.
  ----------------------- ----------------------------------------------------------------------------- --------------------------------------------------------------------------------------------------------------------------------

1.3 System Architecture (Enhancement Layers)

Four layers added to the existing dashboard app. Each is independently deployable:

  ----------------------- ------------------------------------------------------------------------------------------------------------------- ---------------------------------------------------------------------------------------------------------------------------------------
  **Enhancement**         **What It Does**                                                                                                    **Impact on Existing Code**

  **1. Clerk Auth**       Magic link gate on dashboard. Admin role protection on trade admin. Separate Clerk instance from research portal.   Clerk middleware wraps existing routes. Dashboard pages render only for authenticated users. Trade admin routes check for admin role.

  **2. Visit Tracking**   Logs every authenticated page load: who, when, which section, how long.                                             One API call added to dashboard frontend on page load. One new database table. No changes to existing UI.

  **3. Discord Gating**   Removes public Discord link. Adds "Request Live Access" button. You approve from admin.                             One UI change: swap Discord link for request button. Request writes to Clerk user metadata.

  **4. Unified Admin**    Adds prospect tracking, engagement table, access approvals alongside existing trade entry admin.                    New admin sections/tabs added to existing admin interface. Trade entry stays as-is. Clerk admin role gates everything.
  ----------------------- ------------------------------------------------------------------------------------------------------------------- ---------------------------------------------------------------------------------------------------------------------------------------

1.4 Two-Instance Clerk Architecture

  -------------------- ----------------------------------- ------------------------------------------------------------------------------------------------
  **Property**         **Research Portal (Existing)**      **ECFS Dashboard (New Instance)**

  **URL**              researchportal.ekantikcapital.com   dashboard.ekantikcapital.com

  **Clerk instance**   Existing Clerk app --- keep as-is   New separate Clerk app

  **Auth method**      Current config                      Magic link only (disable all others)

  **User pools**       Independent                         Independent --- dashboard access does not unlock research portal

  **Access control**   Per existing rules                  Allowlist-based: pre-approved emails get instant magic link, unknown emails queue for approval
  -------------------- ----------------------------------- ------------------------------------------------------------------------------------------------

2\. Clerk Authentication (Enhancement Layer 1)

2.1 Clerk Configuration

  ----------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Setting**             **Value**

  **Application name**    Ekantik Dashboard

  **Sign-in methods**     Email magic link ONLY. Disable password, Google, SSO, all other methods.

  **Sign-up mode**        Restricted: only pre-approved (allowlisted) emails can sign up. Unknown emails see a "Request Access" form.

  **Allowlist**           Pre-populate with your 50+ IDP emails before the outreach wave. Add new emails as prospects reply to DMs/group posts.

  **Session lifetime**    30 days for prospects. Extended/long-lived session for your admin account (effectively never expires).

  **Branding**            Customize Clerk's sign-in component: navy background, gold accents, Cormorant Garamond headings, Ekantik logo.

  **User metadata**       publicMetadata stores: com_level, source, discord_access, notes, name_display. Admin users (hjdesai@gmail.com, hd@ekantikcapital.com) get { role: \"admin\" }.
  ----------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------

2.2 Route Protection Map

Clerk middleware wraps the existing dashboard app. Here's how each route is protected:

  --------------------------------------- ---------------------- --------------------------------------------------------------------------- ---------------------------------
  **Route**                               **Current Access**     **After Enhancement**                                                       **Who Can Access**

  **/ (dashboard home)**                  Public --- anyone      Clerk auth required                                                         Authenticated prospects + admin

  **/trades, /performance, etc.**         Public --- anyone      Clerk auth required                                                         Authenticated prospects + admin

  **/admin (trade entry --- existing)**   **No auth --- open**   Clerk auth + admin role                                                     You only

  **/admin/prospects (new)**              Does not exist         Clerk auth + admin role                                                     You only

  **/admin/approvals (new)**              Does not exist         Clerk auth + admin role                                                     You only

  **/sign-in (new)**                      Does not exist         Public --- Clerk sign-in page with branded UI + blurred dashboard preview   Everyone (landing page)
  --------------------------------------- ---------------------- --------------------------------------------------------------------------- ---------------------------------

**Security note:** Your existing trade admin is currently unprotected. Adding Clerk secures it immediately. This alone justifies Phase 1 --- even before prospect tracking is built, your trade entry interface moves from open to admin-only.

2.3 Prospect Experience

**First visit (no session):** Prospect lands on dashboard.ekantikcapital.com. Clerk middleware detects no session, redirects to /sign-in. They see a branded landing page with a blurred dashboard preview behind the sign-in form.

**• Headline:** \"This Dashboard Is Available by Invitation Only\"

**• Subtext:** \"Enter your email to receive a private access link.\"

**• Input:** Clerk's \<SignIn /\> component --- magic link only

**• Below:** \"Don't have access? Request an invitation.\" → separate form for unknown emails

  ---------------------------- ------------------------------------------------------------------------------------------------ -------------------------------------------------------------------------------
  **Scenario**                 **What Happens**                                                                                 **What Prospect Sees**

  **Email on allowlist**       Clerk sends magic link email instantly. One click → session → dashboard.                         \"Check your email --- your private access link is on the way.\"

  **Email NOT on allowlist**   Clerk blocks sign-up. Custom form captures their email, writes to your database, notifies you.   \"Your request has been received. Access is granted on an invitation basis.\"
  ---------------------------- ------------------------------------------------------------------------------------------------ -------------------------------------------------------------------------------

**Returning visit:** 30-day session cookie active → straight to dashboard. No email needed.

2.4 Allowlist Management

**Before outreach wave:** Bulk-add all 50+ IDP emails to Clerk allowlist via admin panel. When they reply to your DM, they can sign in immediately.

**Group post respondent DMs you:** Ask for their email. Add to allowlist from admin (one click). Send them the dashboard URL.

**Unknown email requests access:** You get notified. Approve = add to allowlist. They get an email saying access is granted.

2.5 Clerk User Metadata Schema

Clerk's publicMetadata stores your prospect intelligence. No separate prospects table needed.

Clerk publicMetadata (per user)

  -------------------- ---------------- -------------------------------------------------------------------------------------------------------------------------------------
  **Field**            **Type**         **Purpose**

  **role**             String \| null   \"admin\" for hjdesai@gmail.com and hd@ekantikcapital.com. null for all prospects. Controls access to trade admin + prospect admin.

  **com_level**        String \| null   L1 \| L2 \| L3 \| L4 \| null --- your diagnosis, updated from admin

  **source**           String           dm_warm \| dm_semi \| group_post \| organic \| referral

  **discord_access**   String           none \| requested \| approved \| active

  **referred_by**      String \| null   Clerk user ID of referrer if known

  **notes**            String \| null   Your private notes on this prospect

  **name_display**     String \| null   Friendly name for your admin view
  -------------------- ---------------- -------------------------------------------------------------------------------------------------------------------------------------

3\. Prospect Tracking (Enhancement Layer 2)

3.1 How It Works

One lightweight API call fires on every authenticated dashboard page load. Clerk provides the user ID. Your frontend sends a POST to /api/track. No changes to the existing dashboard UI.

Table: visit_events (your database --- not Clerk)

  -------------------------- ------------- ---------------------------------------------------------
  **Field**                  **Type**      **Purpose**

  **id**                     UUID          Primary key

  **clerk_user_id**          String        Clerk user ID --- links visit to authenticated prospect

  **visited_at**             Timestamp     When they visited

  **page_section**           String        overview \| trades \| performance \| methodology

  **session_duration_sec**   Int \| null   Time on page (via beacon API on tab close)

  **device**                 String        mobile \| desktop \| tablet
  -------------------------- ------------- ---------------------------------------------------------

3.2 Engagement Scoring & Triggers

  ----------------- ------------------------------- --------------------------------------------------------------------------------------------------------------------
  **Signal**        **Threshold**                   **Your Action**

  **Hot**           3+ visits/week for 2+ weeks     L3→L2 transition likely. Reach out: "I noticed you've been following along. Want to walk through the methodology?"

  **Warming**       1--2 visits/week consistently   Engaged but not convinced. Let data compound. No action needed.

  **Cooling**       No visit in 14+ days            Interest fading. Candidate for 90-day re-engagement with performance update.

  **Dormant**       No visit in 30+ days            Archived. No follow-up until 90-day performance re-engagement.
  ----------------- ------------------------------- --------------------------------------------------------------------------------------------------------------------

**Notifications:** Hot prospect alerts and new access requests via email (hjdesai@gmail.com or hd@ekantikcapital.com) or Slack webhook. Daily digest option available.

4\. Discord Gating (Enhancement Layer 3)

4.1 Changes to Existing Dashboard

**One UI change:** Remove the existing public Discord invite link. Replace with a "Real-Time Trade Signals" section containing a brief description and a "Request Live Access" button.

4.2 The Gated Flow

**Step 1:** Prospect sees "Request Live Access" button on the dashboard.

**Step 2:** Click updates their Clerk metadata (discord_access = "requested"). Confirmation shown. You get notified.

**Step 3:** In admin, you see pending requests with engagement data. Approve L2+ prospects based on visit frequency and behavior.

**Step 4:** Approval generates a single-use Discord invite (via Discord Bot API) sent to their email. discord_access flips to "active" on join.

4.3 COM-Level Escalation Funnel

  --------------------- ---------------------------------------------- -------------------------------------- -----------------------------------
  **Stage**             **Access Level**                               **COM Transition**                     **Gate**

  **Dashboard**         Clerk magic link --- passive observation       L3 → L2: Fantasy → math                Allowlist or admin approval

  **Discord**           Invitation only --- real-time signals          L2 deepens: Observation → conviction   Admin approval (engagement-based)

  **Founding Member**   Direct invitation after verification quarter   L2 → L1: Conviction → alignment        Personal outreach from you
  --------------------- ---------------------------------------------- -------------------------------------- -----------------------------------

5\. Unified Admin (Enhancement Layer 4)

5.1 What Changes

**Your existing trade admin interface stays exactly as it is.** The enhancement adds new sections/tabs alongside it and wraps the entire admin behind Clerk's admin role check. You still enter trades the same way --- you just also have prospect intelligence in the same place.

5.2 Admin Sections

  ------------------------- ------------ ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Section**               **Status**   **Description**

  **Trades**                Existing     Your current trade entry/management interface. No changes. Now protected behind Clerk admin role.

  **Prospect Engagement**   **New**      Sortable/filterable table: Clerk user list + visit_events. Columns: name/email, COM level, total visits, last visit, avg visits/wk, source, Discord status, trend arrow.

  **Prospect Detail**       **New**      Click any prospect row. Full visit timeline, section engagement, editable Clerk metadata (COM level, notes, Discord toggle). Changes write back to Clerk Backend API.

  **Access Approvals**      **New**      Queue of unknown emails requesting dashboard access. One-click: add to Clerk allowlist + trigger welcome email. Also shows pending Discord requests with engagement data.

  **Allowlist Manager**     **New**      Bulk-add emails (paste your 50+ IDP list). Sets source metadata in one action. Also shows all currently allowlisted emails.

  **Settings**              **New**      Notification preferences (real-time vs. daily digest, email vs. Slack). CSV export of prospect data for Notion pipeline import.
  ------------------------- ------------ ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------

5.3 Your Admin Experience

**No extra login.** Your emails (hjdesai@gmail.com and hd@ekantikcapital.com) both have role: "admin" in Clerk metadata. Long-lived session --- effectively never expires. You visit dashboard.ekantikcapital.com, Clerk recognizes you, you see the dashboard + "Admin" link. Click it --- you're in. Trade entry on the left, prospect intelligence on the right. One interface for everything.

5.4 Monday Morning View (Example)

What you see when you open Admin → Prospect Engagement at the start of your weekly review:

  ------------------ --------- ------------ ---------------- --------------- ------------ ------------- -----------
  **Name / Email**   **COM**   **Visits**   **Last Visit**   **Visits/Wk**   **Source**   **Discord**   **Trend**

  paul@email.com     **L3**    14           Today            3.5             dm_warm      No            **↑ Hot**

  jane@office.com    **L2**    8            2 days ago       2.0             group_post   Yes           → Steady

  mike@dental.com    **L3**    1            3 wks ago        0.3             dm_semi      No            ↓ Cold
  ------------------ --------- ------------ ---------------- --------------- ------------ ------------- -----------

6\. Implementation Roadmap

Each phase is independently deployable. Prioritized by impact and dependency.

  ------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- -------------------- ------------------------------------------------------------------------------------------------
  **Phase**     **What Gets Built**                                                                                                                                                                               **Time Estimate**    **Dependency**

  **Phase 1**   Clerk integration into existing dashboard: new Clerk app, magic link config, branded sign-in page, allowlist, restricted mode, access request form. Admin role protecting existing trade admin.   3--5 dev hours       None --- build first. Must be live before outreach. Also immediately secures your trade admin.

  **Phase 2**   Visit tracking: /api/track endpoint, visit_events table, event logging on dashboard page load using clerk_user_id.                                                                                4--6 dev hours       Phase 1 (needs Clerk to identify visitors)

  **Phase 3**   Unified admin: add prospect engagement table, prospect detail view, access approvals queue, allowlist manager as new sections alongside existing trade admin.                                     8--12 dev hours      Phase 2 (needs tracking data to display)

  **Phase 4**   Discord gating: remove public link from dashboard, add request button (writes Clerk metadata), admin approval flow, Discord Bot API single-use invite.                                            4--6 dev hours       Phase 3 (needs admin panel for approval)

  **Phase 5**   Engagement scoring: auto-calculate hot/warming/cooling/dormant, notification triggers, daily digest emails.                                                                                       4--6 dev hours       Phase 2 + 3
  ------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- -------------------- ------------------------------------------------------------------------------------------------

**Total estimated effort:** 23--35 dev hours across 5 phases.

**Minimum viable:** Phase 1 alone (3--5 hours) gives you gated access + secured trade admin. Enough to launch the outreach wave.

**Critical path:** Phase 1 must be live before the first DM goes out. Bulk-add IDP emails to allowlist that same day.

7\. Tech Stack Summary

  --------------------- ------------------------------------------ ------------------------------------------------------------------------------------------
  **Component**         **Tool**                                   **Notes**

  **Authentication**    Clerk (new separate instance)              Magic link only. Restricted sign-up. You already know the platform from research portal.

  **User database**     Clerk publicMetadata                       COM level, source, discord_access, notes, role. No separate prospects table.

  **Visit tracking**    PostgreSQL (Supabase, Neon, or Railway)    Single table: visit_events. Lightweight. Free tier sufficient.

  **Email**             Brevo (already in stack)                   Notifications, Discord invites, re-engagement emails.

  **Admin frontend**    Extended existing admin in dashboard app   New sections added alongside existing trade admin. All behind Clerk admin role.

  **Discord invites**   Discord Bot API                            Single-use invite generation on admin approval.
  --------------------- ------------------------------------------ ------------------------------------------------------------------------------------------

*The product is the marketing. Now the marketing has intelligence.*

CONFIDENTIAL --- EKANTIK CAPITAL ADVISORS
