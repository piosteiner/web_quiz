# 🚀 QuizMaster Backend Deployment Guide

## 🆓 Free Deployment Options (No Time Limits)

### Option 1: Render.com (Recommended - FREE FOREVER)

1. **Visit Render**: https://render.com/
2. **Sign up** with GitHub (free account)
3. **New Web Service** → "Connect a repository"
4. **Select**: `piosteiner/web_quiz`
5. **Configure**:
   - Name: `quiz-master-backend`
   - Root Directory: `backend`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
6. **Add Environment Variables**:
   ```
   NODE_ENV=production
   JWT_SECRET=DvXl/KgHQUG63zLSr97A0t+VqsIVePZQIEHkPymhU34=
   SESSION_SECRET=T9xMD1tM/Q/dQPMKYt6QLZ7txsDgEIZUwUy+PBtjh4o=
   ALLOWED_ORIGINS=https://quiz.piogino.ch,https://piosteiner.github.io
   ```
7. **Deploy** - Takes ~5 minutes
8. **Get URL**: `https://quiz-master-backend.onrender.com`

**✅ Render Free Tier**: 750 hours/month (sleeps after 15min idle - perfect for demos!)

### Option 2: Vercel (FREE FOREVER)

1. **Visit Vercel**: https://vercel.com/
2. **Sign up** with GitHub
3. **Import Git Repository** → Select `piosteiner/web_quiz`
4. **Configure**:
   - Framework Preset: `Other`
   - Root Directory: `backend`
5. **Add Environment Variables** (same as above)
6. **Deploy**
7. **Get URL**: `https://web-quiz-backend.vercel.app`

**✅ Vercel**: Unlimited free deployments for personal projects!

### Option 3: Cyclic.sh (FREE FOREVER)

1. **Visit Cyclic**: https://www.cyclic.sh/
2. **Connect GitHub** 
3. **Deploy** → Select `piosteiner/web_quiz/backend`
4. **Add Environment Variables**
5. **Get URL**: `https://your-app.cyclic.app`

**✅ Cyclic**: No credit card, no time limits!

## After Deployment

1. **Get your backend URL** (e.g., `https://your-app.railway.app`)
2. **Update frontend config**:
   ```javascript
   // In /frontend/js/config.js
   return 'https://your-app.railway.app/api'; // Replace with your actual URL
   return 'wss://your-app.railway.app';        // Replace with your actual URL
   ```
3. **Push changes** to GitHub
4. **Test your deployment**:
   - Visit: `https://your-backend-url/api/health`
   - Should return: `{"success":true,"data":{...}}`

## Environment Variables Needed

```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=DvXl/KgHQUG63zLSr97A0t+VqsIVePZQIEHkPymhU34=
SESSION_SECRET=T9xMD1tM/Q/dQPMKYt6QLZ7txsDgEIZUwUy+PBtjh4o=
ALLOWED_ORIGINS=https://quiz.piogino.ch,https://piosteiner.github.io
```

## Quick Test Commands

```bash
# Test health endpoint
curl https://your-backend-url/api/health

# Test CORS
curl -H "Origin: https://quiz.piogino.ch" https://your-backend-url/api/health
```

## 🎯 Recommended: Railway

Railway is the easiest and has a generous free tier perfect for your quiz platform!

## Next Steps

Once deployed:
1. ✅ Get backend URL
2. ✅ Update frontend config
3. ✅ Push to GitHub
4. ✅ Test real-time features
5. ✅ Enjoy your fully functional quiz platform! 🎉
