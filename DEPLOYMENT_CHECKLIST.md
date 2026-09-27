# PharmaHub v1 Deployment Checklist

## Before Redeploying to Vercel

### 1. Environment Variables Required in Vercel
Add these to your Vercel project settings under **Settings → Environment Variables**:

#### Public Variables (NEXT_PUBLIC_)
- `NEXT_PUBLIC_SUPABASE_URL`: `https://wmaniphpyxuntydzicdi.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (your Supabase anon key)
- `NEXT_PUBLIC_AI_PROVIDER`: `gemini` (or `none` if AI is not enabled yet)

#### Private Variables (Server-side)
- `GOOGLE_AI_API_KEY`: Your Google Gemini API key (for AI features)

### 2. Git Status
- ✅ Feature branch `feature/mobile-responsive-ai-updates` created
- ✅ Branch merged into `main` successfully
- ✅ `main` pushed to GitHub: https://github.com/sidney4320-oss/pharmahub-v1

### 3. What's New in This Release
- **Mobile Responsiveness**: Improved layout for tablets and mobile devices
  - Dashboard cards now stack on small screens
  - Responsive grid adjustments in settings and quizzes pages
  - Better spacing and typography for small screens
  
- **AI Integration**: Connected AI service endpoints
  - `/api/ai/generate-summary` - Summarize study materials
  - `/api/ai/generate-flashcards` - Auto-generate flashcards
  - `/api/ai/generate-quiz` - Create AI-powered quizzes
  - `/api/ai/explain` - Explain pharmacy concepts
  - All AI features require `GOOGLE_AI_API_KEY` to be set

### 4. Vercel Deployment Steps
1. Go to https://vercel.com/dashboard
2. Select the **pharmahub-v1** project
3. Verify **Production branch** is set to `main`
4. Click **Deployments** tab
5. Manually trigger a redeploy from the latest `main` commit, or wait for auto-deploy
6. Verify environment variables are present (see section 1)
7. Monitor the build logs for any errors

### 5. Post-Deployment Testing
- [ ] App loads without errors at https://pharmahub-v1.vercel.app (or your custom domain)
- [ ] Login/signup flow works
- [ ] Dashboard loads with responsive layout
- [ ] Mobile view is clean on iPhone/iPad
- [ ] Subjects can be created in settings
- [ ] Quiz generation works (if `GOOGLE_AI_API_KEY` is set)
- [ ] No console errors in browser DevTools

### 6. Supabase Checks
- [ ] Verify Supabase project is active and accessible
- [ ] Check that auth tables exist
- [ ] Confirm storage buckets are set up for file uploads
- [ ] Test that app can read/write to database from prod

### 7. Known Issues / Notes
- AI features are optional; the app has fallback placeholder questions if AI is not configured
- If build times exceed 30s, consider splitting large components
- The app uses Supabase client-side auth; ensure your auth policies are correct in Supabase

### 8. Rollback Plan
If issues occur post-deploy:
1. Revert `main` to the previous stable commit
2. Redeploy from Vercel (auto-redeploy on push)
3. Contact support if persistent issues occur

---

**Merged by:** Copilot
**Date:** September 27, 2026
**Feature Branch:** `feature/mobile-responsive-ai-updates`
