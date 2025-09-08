# 🚀 Quiz Platform - Quick Reference

## 📁 New Consolidated Structure

```
/var/www/quiz-platform/
├── frontend/           # GitHub repo (was: web_quiz)
├── backend/           # Production server (was: quiz-master)  
├── manage.sh          # Project management script
└── README.md          # Project documentation
```

## ⚡ Quick Commands

### Start/Stop Server
```bash
cd /var/www/quiz-platform

./manage.sh start      # Start production server
./manage.sh stop       # Stop server
./manage.sh restart    # Restart server
./manage.sh status     # Show status
```

### Development Workflow  
```bash
# 1. Edit frontend files
cd frontend/
# Make changes...

# 2. Commit to GitHub
../manage.sh frontend:commit
../manage.sh frontend:push

# 3. Deploy changes
../manage.sh deploy    # Sync + restart
```

### Quick Operations
```bash
./manage.sh sync       # Sync frontend → backend
./manage.sh logs       # Show server logs  
./manage.sh update     # Pull from GitHub + deploy
./manage.sh backup     # Create backup
```

## 🌐 Access Points (same as before)

- **Main App**: http://localhost:3000
- **Admin**: http://localhost:3000/html/admin.html
- **Live Control**: http://localhost:3000/html/live-control.html

## 📈 Benefits of New Structure

✅ **Organized**: Single project folder in /var/www/  
✅ **Clear separation**: frontend/ and backend/ subfolders  
✅ **Unified management**: One script controls everything  
✅ **Git preserved**: Frontend still connected to GitHub  
✅ **Same functionality**: All features work exactly the same  

---

**Your quiz platform is now better organized while maintaining all existing functionality!** 🎯
