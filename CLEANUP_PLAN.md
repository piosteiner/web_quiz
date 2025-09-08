# Quiz Platform Cleanup Plan

## Current Issues
- Recursive file duplication (backend/public/backend/public/...)
- Outdated files (index-old.html, test.html)
- Multiple duplicate README files
- Excessive documentation spread across folders

## Proposed Clean Structure

```
/var/www/quiz-platform/
├── README.md                    # Main project documentation
├── QUICK_REFERENCE.md          # Keep as reference
├── manage.sh                   # Main management script
│
├── backend/                    # Production backend server
│   ├── server/                # Node.js application
│   ├── config/               # Configuration files
│   ├── package.json          # Dependencies
│   ├── ecosystem.config.js   # PM2 config
│   ├── deploy.sh            # Deployment script
│   ├── nginx-quiz-backend.conf # Nginx config
│   └── docs/                # Backend-specific docs
│       ├── DEPLOYMENT.md
│       └── API.md
│
├── frontend/                  # Frontend development
│   ├── index.html           # Main webapp
│   ├── css/                 # Stylesheets
│   ├── js/                  # JavaScript modules
│   ├── html/                # Additional pages
│   ├── tests/               # Test files
│   ├── github-manager.sh    # GitHub automation
│   └── docs/                # Frontend-specific docs
│
└── docs/                     # Unified project documentation
    ├── PROJECT_OVERVIEW.md
    ├── SETUP.md
    ├── DEPLOYMENT.md
    └── USER_GUIDE.md
```

## Files to Remove
1. All recursive duplicates in backend/public/backend/public/...
2. frontend/index-old.html
3. frontend/index-webapp.html  
4. backend/test.html
5. Duplicate README files (keep only main ones)
6. Outdated deployment configs (vercel.json, railway.toml, etc.)

## Files to Consolidate
1. Merge all documentation into /docs/
2. Keep only essential config files
3. Remove test files from production paths

## Expected Reduction
- Current: ~200+ files with duplicates
- After cleanup: ~50-60 essential files
- Size reduction: ~70-80%
