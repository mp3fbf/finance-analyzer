# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**fInAnce** is an AI-powered financial analysis assistant that processes bank statements and credit card invoices to provide intelligent, contextual insights. Unlike traditional finance apps with rigid categories, it uses Claude AI to dynamically understand spending patterns and provide conversational analysis.

**Core Value Proposition:**
- Upload monthly statements (PDF/images) without manual data entry
- AI extracts transactions using Claude Vision API
- Contextual categorization based on behavior, not fixed categories
- Hybrid interface: Dashboard cards for overview + Chat for deep exploration
- Learning system that improves with user corrections

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **State/Storage:** Dexie.js (IndexedDB wrapper) - client-side only for privacy
- **AI:** Claude API (Anthropic)
  - Sonnet 4 for analysis/chat (fast, cost-effective)
  - Claude Vision for PDF/image extraction
- **Deployment:** Vercel (intended)

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

## Git Workflow & CodeRabbit Integration

**IMPORTANT:** This project uses CodeRabbit for automated PR reviews (free trial).

### Branch Strategy
- Create a **new branch** for each roadmap step
- Branch naming: `feature/XX-step-name` (e.g., `feature/02-data-storage`)
- Never commit directly to `main`

### Workflow for Each Roadmap Step

```bash
# 1. Create branch for the step
git checkout -b feature/XX-step-name

# 2. Implement the step
# ... code changes ...

# 3. Commit with descriptive message
git add .
git commit -m "feat: implement [feature name] (Etapa XX)

Detailed description...

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# 4. Push to remote
git push -u origin feature/XX-step-name

# 5. Create Pull Request (CodeRabbit will auto-review)
gh pr create --title "..." --body "..."

# 6. Review CodeRabbit feedback
# Make adjustments if needed

# 7. Merge PR after approval
gh pr merge [PR-number] --squash

# 8. Update local main and start next step
git checkout main
git pull origin main
```

### Why This Matters
- CodeRabbit **only reviews Pull Requests**, not direct commits to main
- Each PR gets automatic code review, suggestions, and feedback
- Maintains clean git history with reviewable changes
- Easy to rollback individual features if needed

### Code Quality Standards
**CRITICAL: Address ALL CodeRabbit suggestions before merging PRs**

- ❌ **NO tech debt tolerated** - Fix issues immediately, don't postpone
- ✅ **Resolve ALL CodeRabbit comments** before merge (including nitpicks)
- ✅ **Apply ref forwarding** to all React components that need it
- ✅ **Follow Tailwind best practices** (use standard classes, not arbitrary values when possible)
- ✅ **Maintain docstring coverage** - Add JSDoc to exported functions/components
- ✅ **TypeScript strict** - Zero type errors tolerated

**Principle:** Clean code now prevents technical debt later. Take time to do it right.

## Architecture Principles

### 1. **Client-Side First (Privacy)**
- All data stored in IndexedDB (browser-local)
- No backend database in MVP
- Only API calls are to Claude API (transient processing)
- User can clear all data anytime

### 2. **Dynamic Contextual Categorization**

**DO NOT use fixed categories like:**
- ❌ "Food", "Transport", "Entertainment"

**DO use contextual groupings like:**
- ✅ "Late Night Delivery" (after 8pm pattern)
- ✅ "Work Commute Uber" (weekday mornings)
- ✅ "Kids Expenses" (school + activities + related spending)
- ✅ "Rappi Turbo" (specific merchant with high impact)

**Key Insight:** Categories are **discovered from behavior**, not pre-defined.

### 3. **Analysis by Accumulated Value**

Priority insights by:
1. Total accumulated value (not just frequency)
2. Growth % vs previous period
3. Temporal patterns (time of day, day of week)
4. Detected overlaps (e.g., 3 cloud storage subscriptions)

Example: 47 Rappi transactions totaling R$ 2,847 (18% of monthly spending) is more important than 2 expensive purchases of R$ 500 each.

### 4. **Intelligent Merchant Mapping**

Unify transaction name variations:
- "IFOOD *REST ABC" → "iFood"
- "UBER *TRIP" → "Uber"
- "MOUSTACHE BEANS" → "Rappi Turbo" (user corrects, system learns)

Store mappings in IndexedDB for reuse across uploads.

### 5. **Chat with Full Context**

The chat AI has access to:
- All transactions in memory
- Previous categorization decisions
- User correction history
- Conversation context

Can perform:
- Deep data exploration ("Show all spending related to kids")
- Justification ("Why did you group these together?")
- Web search for alternatives (via tool use)
- Adaptive suggestions based on user constraints

## Data Schema (IndexedDB via Dexie.js)

Key tables:
- `transactions`: All financial transactions
- `merchants`: Unified merchant entities
- `mappings`: Raw name → merchant ID mappings
- `categories`: Dynamic categories with rules
- `insights`: Generated insight cards
- `chatSessions`: Chat conversation history

See `/lib/db/schema.ts` for full schema.

## Implementation Roadmap

The project follows a phased approach documented in `/roadmap/`:

1. **00-setup.md**: Next.js + TypeScript + Tailwind + Dexie setup
2. **01-upload-extraction.md**: File upload + Claude Vision extraction
3. **02-data-storage.md**: IndexedDB schema + operations
4. **03-transaction-list.md**: Basic transaction listing UI
5. **04-merchant-mapping.md**: Intelligent merchant unification
6. **05-ai-categorization.md**: Contextual categorization logic
7. **06-insights-generation.md**: Dashboard insight cards
8. **07-dashboard-cards.md**: Main dashboard interface
9. **08-chat-interface.md**: Chat UI implementation
10. **09-chat-ai-logic.md**: Chat AI with full context
11. **10-learning-system.md**: User correction learning
12. **11-polish-testing.md**: Final polish + testing

## Key Files Structure

```
app/
├── page.tsx                    # Dashboard
├── upload/page.tsx             # Upload interface
└── api/
    ├── extract/route.ts        # PDF extraction endpoint
    ├── categorize/route.ts     # AI categorization
    └── chat/route.ts           # Chat endpoint

lib/
├── db/
│   ├── schema.ts               # Dexie database schema
│   ├── operations.ts           # CRUD operations
│   └── hooks.ts                # React hooks (useLiveQuery)
├── ai/
│   ├── claude.ts               # Claude API client
│   ├── extraction.ts           # PDF extraction logic
│   ├── categorization.ts       # Categorization logic
│   └── chat.ts                 # Chat logic
├── analysis/
│   ├── insights.ts             # Insight generation
│   ├── patterns.ts             # Pattern detection
│   └── merchants.ts            # Merchant mapping
└── utils/
    ├── formatting.ts           # Value formatting
    └── dates.ts                # Date utilities

types/
├── transaction.ts
├── merchant.ts
├── category.ts
├── insight.ts
└── chat.ts
```

## Environment Variables

Required in `.env.local`:

```bash
ANTHROPIC_API_KEY=sk-ant-...        # Claude API key
NEXT_PUBLIC_MAX_FILE_SIZE=10485760  # 10MB
```

## Important Design Constraints

1. **Never commit sensitive data**: `.env.local` must stay in `.gitignore`
2. **API key server-side only**: Claude API calls happen in route handlers, not client
3. **Validate all user inputs**: File type, size, transaction data
4. **TypeScript strict mode**: All code must type-check
5. **Responsive UI**: Mobile-friendly (phase 2 priority)

## Cost Considerations

- **Claude Sonnet 4**: ~$3 per million tokens input, ~$15 per million output
- **Typical invoice**: ~5k input + 2k output tokens
- **Average cost per upload**: $0.02-0.03
- **Mitigation**: Cache extractions, use Sonnet over Opus when possible

## Testing Strategy

- **Manual testing** with real bank statements/invoices from different banks
- **Validation** of extraction accuracy (target: >95%)
- **Performance**: Upload + extraction <30 seconds
- **Chat response**: <5 seconds for simple queries
- Debug page at `/debug` for inspecting IndexedDB contents

## Common Pitfalls to Avoid

1. **Don't** create generic "Alimentação" categories - be specific and contextual
2. **Don't** ignore temporal patterns - time of day matters
3. **Don't** prioritize by transaction count alone - value matters more
4. **Don't** make assumptions in chat - always use actual transaction data
5. **Don't** repeat suggestions user has already rejected (check learning history)

## Reference Documentation

- **Full PRD**: See `/prd.md` for complete product requirements
- **Roadmap**: See `/roadmap/` directory for step-by-step implementation guides
- **Claude API Docs**: https://docs.anthropic.com/
- **Dexie.js Docs**: https://dexie.org/
