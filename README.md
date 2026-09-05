# DPS Echo Portal (`dps_echo`)

Digital publication and e-magazine portal for **Delhi Public School Kanpur** (`https://echo.dpskanpur.com`).

---

## 🚀 Quick Overview
- **Portal**: DPS Echo (Student Publications, Creative Writing & Articles)
- **Engine**: Pure HTML5 / CSS3 / Vanilla JavaScript / Next.js
- **Local Dev Port**: `8088`

---

## 🛠️ Getting Started & Git Workflow

### 1. Clone the Repository
```bash
git clone https://github.com/dpskanpur/dps_echo.git
cd dps_echo
```

### 2. Work ONLY on the `dev` Branch
> ⚠️ **IMPORTANT**: Direct pushes to `main` are strictly blocked. All collaborator updates must be pushed to `dev`.

```bash
# Switch to dev branch
git checkout dev
git pull origin dev

# Make changes, commit and push to dev
git add -A
git commit -m "content(edition): add latest magazine issue"
git push origin dev
```

### 3. Production Deployment
Open a Pull Request from `dev` to `main`. Merging after review triggers production Cloud Run deployment.

---

## 💻 Local Testing
```bash
python3 -m http.server 8088
```
Visit: [http://localhost:8088](http://localhost:8088)
