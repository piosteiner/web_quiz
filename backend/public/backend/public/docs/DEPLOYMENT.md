# 🚀 Deployment Guide - QuizMaster

Anleitung zur Bereitstellung von QuizMaster auf verschiedenen Hosting-Plattformen.

## 🌐 **GitHub Pages (Empfohlen)**

### Automatisches Deployment
QuizMaster ist bereits für GitHub Pages konfiguriert:

```yaml
# .github/workflows/deploy.yml (automatisch erstellt)
name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
```

### Manuelles Setup
1. **Repository Settings** → **Pages**
2. **Source**: Deploy from a branch
3. **Branch**: main / (root)
4. **Custom Domain** (optional): quiz.yourdomain.com

### CNAME-Datei
```
# CNAME (bereits vorhanden)
your-custom-domain.com
```

## 📦 **Statische Hosting-Dienste**

### Netlify
```bash
# netlify.toml
[build]
  publish = "."
  command = "echo 'Static site, no build needed'"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Vercel
```json
{
  "version": 2,
  "name": "quizmaster",
  "builds": [
    {
      "src": "**/*",
      "use": "@vercel/static"
    }
  ]
}
```

### Firebase Hosting
```bash
# Installation
npm install -g firebase-tools

# Initialisierung
firebase init hosting

# firebase.json
{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}

# Deployment
firebase deploy
```

## 🖥 **Traditionelle Webserver**

### Apache
```apache
# .htaccess
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.html [QSA,L]

# MIME Types für moderne Features
AddType application/javascript .js
AddType text/css .css

# Caching Headers
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType text/html "access plus 0 seconds"
</IfModule>
```

### Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/quizmaster;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/javascript application/json;

    # Static Files
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1M;
        add_header Cache-Control "public, immutable";
    }

    # SPA Routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security Headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
}
```

## 🐳 **Docker Deployment**

### Dockerfile
```dockerfile
FROM nginx:alpine

# Kopiere Dateien
COPY . /usr/share/nginx/html

# Nginx Konfiguration
COPY nginx.conf /etc/nginx/nginx.conf

# Port freigeben
EXPOSE 80

# Starten
CMD ["nginx", "-g", "daemon off;"]
```

### docker-compose.yml
```yaml
version: '3.8'
services:
  quizmaster:
    build: .
    ports:
      - "80:80"
    restart: unless-stopped
    environment:
      - NODE_ENV=production
```

### Deployment
```bash
# Build
docker build -t quizmaster .

# Run
docker run -p 80:80 quizmaster

# Mit Docker Compose
docker-compose up -d
```

## ☁️ **Cloud-Deployment**

### AWS S3 + CloudFront
```bash
# S3 Bucket erstellen
aws s3 mb s3://quizmaster-bucket

# Dateien hochladen
aws s3 sync . s3://quizmaster-bucket --delete

# Static Website Hosting aktivieren
aws s3 website s3://quizmaster-bucket --index-document index.html

# CloudFront Distribution erstellen
aws cloudfront create-distribution --distribution-config file://cloudfront.json
```

### Google Cloud Storage
```bash
# Bucket erstellen
gsutil mb gs://quizmaster-bucket

# Dateien hochladen
gsutil -m rsync -r -d . gs://quizmaster-bucket

# Website-Konfiguration
gsutil web set -m index.html -e 404.html gs://quizmaster-bucket
```

### Azure Static Web Apps
```yaml
# .github/workflows/azure-static-web-apps.yml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main

jobs:
  build_and_deploy_job:
    runs-on: ubuntu-latest
    name: Build and Deploy Job
    steps:
      - uses: actions/checkout@v2
      - name: Build And Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          api_location: ""
          output_location: ""
```

## 🔧 **Konfiguration für Produktion**

### Performance-Optimierung
```html
<!-- Preload kritische Ressourcen -->
<link rel="preload" href="css/styles.css" as="style">
<link rel="preload" href="js/main.js" as="script">

<!-- DNS Prefetch für externe Ressourcen -->
<link rel="dns-prefetch" href="//fonts.googleapis.com">
<link rel="dns-prefetch" href="//cdnjs.cloudflare.com">
```

### Service Worker (PWA)
```javascript
// sw.js
const CACHE_NAME = 'quizmaster-v1';
const urlsToCache = [
  '/',
  '/css/styles.css',
  '/js/main.js',
  '/html/admin.html',
  '/html/join.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
```

### Manifest für PWA
```json
{
  "name": "QuizMaster",
  "short_name": "QuizMaster",
  "description": "Interaktive Quiz-Plattform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#667eea",
  "theme_color": "#667eea",
  "icons": [
    {
      "src": "icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## 🔐 **Sicherheit**

### HTTPS-Konfiguration
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # CSP Header
    add_header Content-Security-Policy "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self' data:";
}
```

### Umgebungsvariablen
```javascript
// config/production.js
const config = {
  api: {
    baseUrl: process.env.API_BASE_URL || 'https://api.quizmaster.com',
    timeout: 10000
  },
  websocket: {
    url: process.env.WS_URL || 'wss://ws.quizmaster.com'
  },
  features: {
    analytics: process.env.ENABLE_ANALYTICS === 'true',
    debugging: false
  }
};
```

## 📊 **Monitoring und Analytics**

### Error Tracking
```javascript
// js/error-tracking.js
window.addEventListener('error', (event) => {
  const errorData = {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error?.stack,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  // Send to monitoring service
  fetch('/api/errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(errorData)
  });
});
```

### Performance Monitoring
```javascript
// js/performance.js
// Web Vitals tracking
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

## 🚀 **CI/CD Pipeline**

### GitHub Actions
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Tests
        run: |
          # Add your test commands here
          echo "Running tests..."
      
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Production
        run: |
          # Deployment commands
          echo "Deploying to production..."
```

## 📋 **Deployment-Checkliste**

### Pre-Deployment
- [ ] Tests ausgeführt und bestanden
- [ ] Browser-Kompatibilität getestet
- [ ] Performance-Tests durchgeführt
- [ ] Security-Scan abgeschlossen
- [ ] Dokumentation aktualisiert

### Deployment
- [ ] Domain konfiguriert
- [ ] SSL-Zertifikat installiert
- [ ] CDN konfiguriert (falls verwendet)
- [ ] Monitoring eingerichtet
- [ ] Backup-Strategie implementiert

### Post-Deployment
- [ ] Funktionalität getestet
- [ ] Performance überwacht
- [ ] Error-Logs überprüft
- [ ] Analytics konfiguriert
- [ ] Team benachrichtigt

---

**Erfolgreiches Deployment! 🎉**
