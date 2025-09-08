# 🤝 Contributing to QuizMaster

Wir freuen uns über Ihr Interesse, zu QuizMaster beizutragen! Diese Anleitung hilft Ihnen dabei, erfolgreich zum Projekt beizutragen.

## 📋 **Wie Sie beitragen können**

### 🐛 **Bug Reports**
- Nutzen Sie [GitHub Issues](https://github.com/piosteiner/web_quiz/issues)
- Beschreiben Sie das Problem detailliert
- Fügen Sie Screenshots hinzu, wenn möglich
- Geben Sie Browser/OS-Informationen an

### 💡 **Feature Requests**
- Nutzen Sie [GitHub Discussions](https://github.com/piosteiner/web_quiz/discussions)
- Erklären Sie den Anwendungsfall
- Beschreiben Sie die gewünschte Lösung
- Berücksichtigen Sie alternative Ansätze

### 📝 **Dokumentation**
- Verbesserungen an README, Guides, und FAQ
- Übersetzungen in andere Sprachen
- Code-Kommentare und Beispiele
- Tutorial-Videos oder Blog-Posts

### 💻 **Code Contributions**
- Bug Fixes
- Neue Features
- Performance-Verbesserungen
- Test-Verbesserungen

## 🚀 **Getting Started**

### Entwicklungsumgebung einrichten

```bash
# Repository forken und klonen
git clone https://github.com/YOURUSERNAME/web_quiz.git
cd web_quiz

# Entwicklungsserver starten
# Option 1: Python
python -m http.server 8000

# Option 2: Node.js
npx serve .

# Option 3: PHP
php -S localhost:8000

# Option 4: VS Code Live Server Extension
```

### Projektstruktur verstehen
```
web_quiz/
├── index.html                    # Hauptseite
├── html/                         # App-Seiten
├── css/                          # Stylesheets
├── js/                           # JavaScript-Module
├── tests/                        # Test-Framework
└── docs/                         # Dokumentation
```

## 🔄 **Contribution Workflow**

### 1. Issue erstellen oder finden
- Überprüfen Sie bestehende Issues
- Erstellen Sie ein neues Issue für größere Änderungen
- Diskutieren Sie Ihren Ansatz in den Kommentaren

### 2. Fork und Branch
```bash
# Repository forken (über GitHub UI)
git clone https://github.com/YOURUSERNAME/web_quiz.git
cd web_quiz

# Neuen Branch erstellen
git checkout -b feature/amazing-feature
# oder
git checkout -b fix/important-bug
```

### 3. Entwicklung
- Folgen Sie den Code-Standards (siehe unten)
- Schreiben Sie Tests für neue Features
- Aktualisieren Sie die Dokumentation
- Testen Sie Ihre Änderungen gründlich

### 4. Commit und Push
```bash
# Änderungen hinzufügen
git add .

# Commit mit aussagekräftiger Nachricht
git commit -m "Add amazing new feature

- Implements feature X
- Adds tests for feature X
- Updates documentation"

# Push zum fork
git push origin feature/amazing-feature
```

### 5. Pull Request erstellen
- Gehen Sie zu Ihrem Fork auf GitHub
- Klicken Sie auf "New Pull Request"
- Wählen Sie den korrekten Base-Branch (main)
- Beschreiben Sie Ihre Änderungen detailliert

## 📏 **Code Standards**

### HTML
```html
<!-- Verwenden Sie semantisches HTML -->
<main class="admin-main">
    <section id="dashboard" class="admin-section">
        <h1>Dashboard</h1>
        <!-- Content -->
    </section>
</main>

<!-- Accessibility beachten -->
<button aria-label="Theme umschalten" id="theme-toggle">
    🌙 Dunkler Modus
</button>
```

### CSS
```css
/* CSS Variables für Konsistenz */
:root {
    --primary-color: #667eea;
    --text-primary: #333333;
}

/* BEM-ähnliche Klassennamens-Konvention */
.quiz-card {
    /* Component */
}

.quiz-card__title {
    /* Element */
}

.quiz-card--featured {
    /* Modifier */
}

/* Mobile-first Responsive Design */
.container {
    padding: 1rem;
}

@media (min-width: 768px) {
    .container {
        padding: 2rem;
    }
}
```

### JavaScript
```javascript
// ES6+ Features verwenden
class QuizManager {
    constructor(options = {}) {
        this.options = { ...this.defaultOptions, ...options };
    }

    async createQuiz(quizData) {
        try {
            const response = await this.api.post('/quiz', quizData);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }
}

// Funktionale Ansätze bevorzugen
const filterQuizzes = (quizzes, criteria) => 
    quizzes.filter(quiz => quiz.category === criteria.category);

// Klare Variablennamen
const participantCount = participants.length;
const isQuizActive = quiz.status === 'active';
```

### Commit Messages
```bash
# Format: type(scope): description

# Types:
feat: new feature
fix: bug fix
docs: documentation
style: formatting
refactor: code restructuring
test: adding tests
chore: maintenance

# Beispiele:
feat(admin): add participant management
fix(theme): resolve dark mode button issue
docs(readme): update installation instructions
test(join): add form validation tests
```

## 🧪 **Testing**

### Manuelles Testing
```bash
# Test-Suite öffnen
open tests/index.html

# Spezifische Tests
open tests/theme-test.html
open tests/admin-test.html
open tests/join-test.html
```

### Testing-Checkliste
- [ ] Alle bestehenden Tests funktionieren
- [ ] Neue Features haben Tests
- [ ] Cross-browser Testing (Chrome, Firefox, Safari)
- [ ] Mobile Testing (verschiedene Bildschirmgrößen)
- [ ] Theme Testing (Light/Dark Mode)
- [ ] Performance Testing (große Datenmengen)

### Browser Testing
| Browser | Version | Priorität |
|---------|---------|-----------|
| Chrome  | Latest  | Hoch |
| Firefox | Latest  | Hoch |
| Safari  | Latest  | Mittel |
| Edge    | Latest  | Mittel |

## 📝 **Dokumentation**

### Dokumentation aktualisieren
Bei neuen Features oder Änderungen:
- README.md aktualisieren
- Relevante Guides in docs/ anpassen
- API-Dokumentation erweitern
- FAQ bei häufigen Fragen ergänzen

### Dokumentations-Standards
- **Sprache**: Deutsch für Benutzer-Docs, Englisch für Code-Kommentare
- **Format**: Markdown mit einheitlicher Struktur
- **Screenshots**: Aktuelle Bilder bei UI-Änderungen
- **Beispiele**: Praktische Code-Beispiele

## 🎯 **Contribution Guidelines**

### Was wir suchen
✅ **Gerne gesehen**:
- Bug Fixes
- Performance-Verbesserungen
- Accessibility-Verbesserungen
- Mobile-Optimierungen
- Test-Coverage-Erhöhung
- Dokumentations-Verbesserungen
- UI/UX-Verbesserungen

### Was wir vermeiden
❌ **Nicht erwünscht**:
- Breaking Changes ohne Diskussion
- Große Refactoring ohne vorherige Absprache
- Features ohne Use Case
- Code ohne Tests
- Unvollständige Dokumentation

### Code Review Prozess
1. **Automatische Checks**: Linting, Tests
2. **Maintainer Review**: Code-Qualität, Design
3. **Testing**: Manuelle Funktionstests
4. **Approval**: Merge nach erfolgreichem Review

## 🏆 **Anerkennung**

### Contributors
Alle Contributor werden in folgenden Bereichen anerkannt:
- README.md Contributors-Sektion
- GitHub Contributors-Graph
- Release Notes für größere Beiträge

### Hall of Fame
Besonders wertvolle Beiträge werden speziell hervorgehoben:
- Innovative Features
- Wichtige Bug Fixes
- Umfangreiche Dokumentation
- Community-Hilfe

## 📞 **Hilfe erhalten**

### Wo Sie Hilfe finden
- **GitHub Discussions**: Allgemeine Fragen
- **GitHub Issues**: Technische Probleme
- **Email**: [pioginosteiner@gmail.com](mailto:pioginosteiner@gmail.com)

### Mentor-Programm
Neue Contributors können Unterstützung erhalten:
- Code Review Sessions
- Pair Programming
- Architektur-Erklärungen
- Best Practice Guidance

## 🎉 **Erste Schritte**

### Gute erste Issues
Suchen Sie nach Issues mit Labels:
- `good first issue`
- `help wanted`
- `documentation`
- `bug`

### Schnelle Wins
- Tippfehler in Dokumentation korrigieren
- Tests für bestehende Features hinzufügen
- CSS-Verbesserungen
- Accessibility-Fixes

---

**Vielen Dank für Ihr Interesse an QuizMaster!** 🎉

Jeder Beitrag, ob groß oder klein, wird geschätzt und macht das Projekt besser für alle Nutzer.
