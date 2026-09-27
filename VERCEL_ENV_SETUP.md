# Vercel Environment Variables – Required Setup

## Step-by-Step Guide for Vercel Dashboard

### 1. Open Vercel Project Settings
- Go to https://vercel.com/dashboard
- Click on the **pharmahub-v1** project
- Click **Settings** (top menu)
- Select **Environment Variables** from the left sidebar

### 2. Add These Variables

#### Variable 1: Supabase URL
| Field | Value |
|-------|-------|
| **Name** | `NEXT_PUBLIC_SUPABASE_URL` |
| **Value** | `https://wmaniphpyxuntydzicdi.supabase.co` |
| **Framework Overrides** | All environments (Production, Preview, Development) |

#### Variable 2: Supabase Anon Key
| Field | Value |
|-------|-------|
| **Name** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Value** | `[Copy from your Supabase project → Settings → API Keys → anon key]` |
| **Framework Overrides** | All environments (Production, Preview, Development) |

#### Variable 3: AI Provider (Optional but Recommended)
| Field | Value |
|-------|-------|
| **Name** | `NEXT_PUBLIC_AI_PROVIDER` |
| **Value** | `gemini` (or leave blank / `none` to disable) |
| **Framework Overrides** | All environments (Production, Preview, Development) |

#### Variable 4: Google AI API Key (Required for AI features)
| Field | Value |
|-------|-------|
| **Name** | `GOOGLE_AI_API_KEY` |
| **Value** | `[Get from Google AI Studio → https://aistudio.google.com/app/apikey]` |
| **Framework Overrides** | Production + Preview ONLY (⚠️ Do NOT expose in Development unnecessarily) |

---

## Quick Reference: Copy-Paste Values

```bash
# Vercel Environment Variables (copy these)
NEXT_PUBLIC_SUPABASE_URL=https://wmaniphpyxuntydzicdi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[REPLACE_WITH_YOUR_KEY]
NEXT_PUBLIC_AI_PROVIDER=gemini
GOOGLE_AI_API_KEY=[REPLACE_WITH_YOUR_KEY]
```

---

## Where to Get Each Key

### Supabase Keys
1. Go to https://app.supabase.com
2. Select your project
3. Click **Settings** (bottom left)
4. Click **API** 
5. Copy:
   - `URL` → Your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon key` (under "Project API keys") → Your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Google Gemini API Key
1. Go to https://aistudio.google.com/app/apikey
2. Create a new API key for your project
3. Copy the key → Your `GOOGLE_AI_API_KEY`

---

## Verification Checklist

After adding all variables:
- [ ] All 4 variables are added in Vercel dashboard
- [ ] No typos in variable names (case-sensitive!)
- [ ] Variables have proper values (not "REPLACE_WITH..." placeholders)
- [ ] Public vars (NEXT_PUBLIC_*) are set for all environments
- [ ] Private var (GOOGLE_AI_API_KEY) is set for Production + Preview
- [ ] Click **Save** after each variable entry

---

## Test Variables Are Working

After redeploy, run this in browser console:
```javascript
// Check if env vars are loaded
console.log('Supabase URL:', window.__NEXT_PUBLIC_SUPABASE_URL);
console.log('AI enabled:', window.__NEXT_PUBLIC_AI_PROVIDER);
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Missing Supabase environment variables" error | Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in Vercel |
| AI endpoints return 500 errors | Verify `GOOGLE_AI_API_KEY` is set in Vercel (Production env) |
| "AI not configured" message | Set `NEXT_PUBLIC_AI_PROVIDER=gemini` in Vercel |
| Variables not updating after redeploy | Clear Vercel cache: **Deployments** → **Redeploy** with "Use existing builds" **unchecked** |

---

**Last Updated:** September 27, 2026
