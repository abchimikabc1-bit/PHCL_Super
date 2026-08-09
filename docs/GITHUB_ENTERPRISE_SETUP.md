# GitHub Enterprise Setup Guide - PHCL Super

Complete step-by-step guide to setting up PHCL Super on GitHub with automated CI/CD and branch protection for enterprise-grade deployments.

---

## 📋 Prerequisites

- GitHub account (free or enterprise)
- Local git installation
- Code editor or terminal
- The PHCL Super codebase ready to push

---

## 🚀 Quick Start (5 Minutes)

### 1. Create Repository on GitHub
```bash
# Go to github.com/new
# Name: PHCL-Super or phcl-ecommerce
# Description: Global AI-Powered E-Commerce Platform
# Visibility: Public or Private
# Click "Create repository"
```

### 2. Connect Local Git
```bash
cd "c:\Users\USER\Desktop\PHCL Super"
git init
git add .
git commit -m "Initial commit: PHCL Super production-ready"
git remote add origin https://github.com/<your-username>/<repo-name>.git
git branch -M main
git push -u origin main
```

### 3. Wait for CI/CD
- Go to **Actions** tab on GitHub
- Look for **"PHCL Release Gate"** workflow
- Watch it run (should take ~2 minutes)
- Status should show ✅ PASS on all steps

### 4. Enable Branch Protection
- Settings → Branches → Add rule
- Pattern: `main`
- ✅ Require PR before merge
- ✅ Require status checks (select "PHCL Release Gate")
- Click Create

**Done!** Your repository is now production-hardened.

---

## 🔍 What Gets Checked (CI/CD Stages)

### Stage 1: release:check (Environment Validation)
```
✅ Node.js 18+ installed
✅ npm scripts present (build, start, release:verify)
✅ Security headers in next.config.js
✅ Required environment variables exist:
   - NEXT_PUBLIC_SITE_URL
   - NEXT_PUBLIC_API_URL
   - NEXT_PUBLIC_APP_NAME
✅ package.json valid
```

**Fail Conditions:**
- Node < 18.0.0
- Missing env vars
- Missing security headers

### Stage 2: Build (npm run build)
```
✅ TypeScript compilation
✅ Next.js static generation
✅ Asset optimization
✅ Route pre-rendering
✅ ~2-3 minutes execution
```

**Fail Conditions:**
- TypeScript errors
- Missing dependencies
- Invalid configuration

### Stage 3: release:smoke (Post-Build Tests)
```
✅ 7 core routes respond 200 OK (localhost)
   - / (home)
   - /marketplace
   - /cart
   - /checkout
   - /product/[id]
   - /admin/login
   - /admin/products

✅ 7 www redirects return 308 → phclsuper.com
   (same routes, but with host: www.phclsuper.com)

✅ 2 API endpoints respond correctly
   - GET /api/admin/auth → 401 (not authenticated)
   - GET /api/chat → 405 (method not allowed)
```

**Fail Conditions:**
- Any route returns != 200
- Redirect missing or wrong target
- API returns unexpected status
- Server fails to start

---

## 🔐 Branch Protection Rules (Complete)

### What It Does
Prevents code from being merged to `main` unless:

1. ✅ At least 1 PR review approval
2. ✅ GitHub Actions "PHCL Release Gate" passes
3. ✅ Branch is up to date with `main`
4. ✅ No merge conflicts

### Setup Steps

1. **Navigate to Branch Settings**
   ```
   GitHub.com → Your Repo → Settings → Branches
   ```

2. **Click "Add rule"**

3. **Configure Pattern**
   - Pattern: `main`

4. **Require Pull Request**
   - ✅ Require a pull request before merging
   - Require approvals: `1` (minimum)
   - ✅ Dismiss stale pull request approvals

5. **Require Status Checks**
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - Check: **"PHCL Release Gate"** (from Actions)

6. **Protect Administrators**
   - ✅ Include administrators in restrictions

7. **Save Rule**
   - Click "Create"

### Verification

After setup, try to merge a PR directly (without CI passing):
- GitHub will block with message: *"Merging blocked because PHCL Release Gate did not pass"*

This is correct! ✅

---

## 🧪 Testing Branch Protection

### Test 1: PR with Failing CI
```bash
# Create test branch with intentional error
git checkout -b test/breaking-change
echo "// Syntax Error" >> app/page.tsx
git add .
git commit -m "Test: Force CI failure"
git push -u origin test/breaking-change
```

**Expected**: 
- PR created but shows ❌ "Some checks were not successful"
- Merge button disabled
- Message shows: "Merging blocked by PHCL Release Gate"

### Test 2: PR with Passing CI
```bash
# Fix the error
git checkout test/breaking-change
# Fix app/page.tsx
git add .
git commit -m "Fix: Revert breaking change"
git push
```

**Expected**:
- PR now shows ✅ "All checks passed"
- Merge button enabled (if 1 approval given)
- Can merge safely

### Test 3: Direct Push Attempt
```bash
# Try pushing directly to main (should fail)
git checkout main
git commit --allow-empty -m "Direct push test"
git push origin main
```

**Expected**:
- Push succeeds (git allows it)
- But GitHub PR/deployment policy still requires CI
- Deploy-gate on platform (Vercel/AWS) blocks deployment

---

## 📊 GitHub Actions Workflow File

Location: `.github/workflows/release-gate.yml`

```yaml
name: PHCL Release Gate

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  release-gate:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
      - run: npm ci
      - run: echo "NEXT_PUBLIC_SITE_URL=https://phclsuper.com" >> .env.local
      - run: echo "NEXT_PUBLIC_API_URL=https://api.phclsuper.com" >> .env.local
      - run: echo "NEXT_PUBLIC_APP_NAME=PHCL Super" >> .env.local
      - run: npm run release:verify
```

**Key Points:**
- Runs on: `ubuntu-latest` (Linux)
- Node: `20` (LTS)
- Timeout: `30` minutes (should finish in ~5 min)
- Always runs on: PR + push to main
- Can be triggered manually: `workflow_dispatch`

---

## 🚀 Deployment Workflow (After CI Protection)

### Recommended: Vercel + GitHub Integration

**Step 1: Push to GitHub (triggers CI)**
```bash
git push origin main
```

**Step 2: GitHub Actions Runs**
- Checks environment ✅
- Builds application ✅
- Runs smoke tests ✅
- Status → "PHCL Release Gate" PASSED

**Step 3: Connect Vercel**
```
1. Go to vercel.com
2. Login with GitHub
3. Click "New Project"
4. Select your repository
5. Framework: Next.js
6. Environment Variables:
   - NEXT_PUBLIC_SITE_URL=https://phclsuper.com
   - NEXT_PUBLIC_API_URL=https://api.phclsuper.com
   - NEXT_PUBLIC_APP_NAME=PHCL Super
7. Click "Deploy"
```

**Step 4: Auto-Deploy on Merge**
```bash
# Create PR
git checkout -b feature/something
# ... make changes ...
git push -u origin feature/something

# Create PR on GitHub
# Get approval
# Merge PR → Vercel auto-deploys
```

---

## 📈 Monitoring CI/CD

### View All Workflow Runs
```
GitHub → Actions → PHCL Release Gate
```

Shows:
- ✅ Passed runs
- ❌ Failed runs
- ⏳ Running
- ⏭️ Queued

### View Detailed Logs
Click on any run → View all jobs → Click job

Shows step-by-step execution:
1. Checkout code
2. Setup Node
3. Cache deps
4. Install deps
5. Create .env.local
6. Run release:verify
   - release:check output
   - build output
   - smoke tests output

### Troubleshooting Failed CI

**Common Issues:**

1. **"ENOENT: no such file or directory"**
   - Issue: Missing dependency
   - Fix: Run `npm ci` locally, commit package-lock.json

2. **"TypeScript error: TS2322"**
   - Issue: Type mismatch in code
   - Fix: Run `npm run build` locally, fix errors

3. **"Server did not become ready"**
   - Issue: Next.js build invalid
   - Fix: Check build logs, ensure all imports valid

4. **"Cannot find module 'next'"**
   - Issue: package-lock.json out of date
   - Fix: `npm ci` locally, commit lock file

---

## 🔧 Advanced Configuration

### Add More Branches to Protection
```
Settings → Branches → Add rule
Pattern: develop
# Apply same rules as main
```

### Require Additional Status Checks
(If you add SonarQube, CodeQL, etc.)
```
Settings → Branches → [main] → 
Require status checks → Add check
```

### Enforce Commit Signing
```
Settings → Branches → [main] →
✅ Require signed commits
```

### Auto-Dismiss Stale Approvals
```
Settings → Branches → [main] →
✅ Dismiss stale pull request approvals
(when new commits pushed)
```

---

## 📱 GitHub Status Badge

Add to README.md:

```markdown
[![Release Gate](https://github.com/{owner}/{repo}/actions/workflows/release-gate.yml/badge.svg?branch=main)](https://github.com/{owner}/{repo}/actions)
```

This shows:
- ✅ Passing (green)
- ❌ Failing (red)
- ⏳ Running (yellow)

**Replace:**
- `{owner}` = your GitHub username
- `{repo}` = repository name (PHCL-Super)

---

## 🎯 Next Steps

1. ✅ Create GitHub repository
2. ✅ Push PHCL Super code
3. ✅ Enable branch protection
4. ✅ Test with sample PR
5. ✅ Connect Vercel or deploy platform
6. ✅ Set up custom domain
7. ✅ Monitor first week of deployments

---

## 📞 Support & Troubleshooting

### Common Questions

**Q: Can I bypass branch protection?**
- A: Only repository owner/admins with write access. Not recommended for production.

**Q: What if CI takes too long?**
- A: Timeout is 30 min, usually finishes in 5 min. Check logs for hanging steps.

**Q: Can I test locally before pushing?**
- A: Yes! Run `npm run release:verify` locally. Must pass before push.

**Q: Does every commit need to pass?**
- A: No, only commits in PRs to `main`. Other branches are unrestricted.

**Q: How do I skip CI?**
- A: Add `[skip ci]` to commit message, but not recommended for main branch.

---

## ✅ Deployment Readiness Checklist

- [ ] Repository created on GitHub
- [ ] Code pushed to `main`
- [ ] Branch protection rule enabled
- [ ] First PR tested and merged successfully
- [ ] CI/CD workflow passing (green badge)
- [ ] Deployment platform selected (Vercel/AWS/etc)
- [ ] Environment variables configured
- [ ] Custom domain pointed to deployment
- [ ] SSL certificate active
- [ ] Admin panel accessible
- [ ] Cart/checkout tested
- [ ] All smoke tests passing locally
- [ ] Team members have repo access
- [ ] Deploy strategy documented
- [ ] Rollback plan in place

---

**PHCL Super is now enterprise-ready with automated quality gates! 🚀**
