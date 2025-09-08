/**
 * Quiz Admin Component
 * Handles quiz creation, management, and authentication
 */

export class QuizAdmin {
    constructor(app) {
        this.app = app;
        this.cloudAPI = app.getCloudAPI();
        
        this.quizzes = [];
        this.currentQuiz = null;
        this.isAuthenticated = false;
    }

    async init(params = {}) {
        console.log('⚙️ Initializing Quiz Admin');
        
        this.setupEventListeners();
        
        // Check if user is already authenticated
        if (this.app.getState().user) {
            this.showAdminDashboard();
        } else {
            this.showLoginSection();
        }
    }

    setupEventListeners() {
        // Auth tabs
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('auth-tab')) {
                this.switchAuthTab(e.target.dataset.tab);
            }
        });

        // Login form
        const loginForm = document.getElementById('login-form');
        loginForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Register form
        const registerForm = document.getElementById('register-form');
        registerForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        logoutBtn?.addEventListener('click', () => {
            this.handleLogout();
        });

        // Create quiz button
        const createQuizBtn = document.getElementById('create-quiz-btn');
        createQuizBtn?.addEventListener('click', () => {
            this.createNewQuiz();
        });

        // Password validation
        const registerPassword = document.getElementById('register-password');
        const confirmPassword = document.getElementById('confirm-password');
        
        confirmPassword?.addEventListener('input', () => {
            this.validatePasswordMatch();
        });
    }

    // Authentication UI
    showLoginSection() {
        const loginSection = document.getElementById('login-section');
        const adminDashboard = document.getElementById('admin-dashboard');
        
        if (loginSection) loginSection.style.display = 'block';
        if (adminDashboard) adminDashboard.style.display = 'none';
    }

    showAdminDashboard() {
        const loginSection = document.getElementById('login-section');
        const adminDashboard = document.getElementById('admin-dashboard');
        
        if (loginSection) loginSection.style.display = 'none';
        if (adminDashboard) adminDashboard.style.display = 'block';
        
        // Update user info
        const userName = document.getElementById('user-name');
        const user = this.app.getState().user;
        if (userName && user) {
            userName.textContent = user.name;
        }
        
        // Load quizzes
        this.loadQuizzes();
    }

    switchAuthTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.auth-tab').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
        
        // Update forms
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        document.getElementById(`${tab}-form`)?.classList.add('active');
    }

    // Authentication Handlers
    async handleLogin() {
        const email = document.getElementById('login-email')?.value;
        const password = document.getElementById('login-password')?.value;

        if (!email || !password) {
            this.app.showNotification('Bitte füllen Sie alle Felder aus', 'error');
            return;
        }

        this.app.showLoading('Anmeldung...');

        try {
            const response = await this.cloudAPI.authenticate({
                email: email,
                password: password
            });

            this.app.hideLoading();
            this.app.login(response.user, response.token);
            this.showAdminDashboard();
            
        } catch (error) {
            this.app.hideLoading();
            this.app.showNotification(`Anmeldung fehlgeschlagen: ${error.message}`, 'error');
        }
    }

    async handleRegister() {
        const name = document.getElementById('register-name')?.value;
        const email = document.getElementById('register-email')?.value;
        const password = document.getElementById('register-password')?.value;
        const confirmPassword = document.getElementById('confirm-password')?.value;

        if (!name || !email || !password || !confirmPassword) {
            this.app.showNotification('Bitte füllen Sie alle Felder aus', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.app.showNotification('Passwörter stimmen nicht überein', 'error');
            return;
        }

        if (password.length < 6) {
            this.app.showNotification('Passwort muss mindestens 6 Zeichen lang sein', 'error');
            return;
        }

        this.app.showLoading('Registrierung...');

        try {
            // For demo purposes, simulate registration
            const response = {
                user: { id: Date.now(), name: name, email: email },
                token: 'demo-token-' + Date.now()
            };

            this.app.hideLoading();
            this.app.login(response.user, response.token);
            this.showAdminDashboard();
            
        } catch (error) {
            this.app.hideLoading();
            this.app.showNotification(`Registrierung fehlgeschlagen: ${error.message}`, 'error');
        }
    }

    handleLogout() {
        this.app.logout();
        this.showLoginSection();
    }

    validatePasswordMatch() {
        const password = document.getElementById('register-password')?.value;
        const confirmPassword = document.getElementById('confirm-password')?.value;
        const confirmInput = document.getElementById('confirm-password');
        
        if (confirmInput) {
            if (password && confirmPassword && password !== confirmPassword) {
                confirmInput.setCustomValidity('Passwörter stimmen nicht überein');
            } else {
                confirmInput.setCustomValidity('');
            }
        }
    }

    // Quiz Management
    async loadQuizzes() {
        this.app.showLoading('Lade Quiz...');
        
        try {
            this.quizzes = await this.cloudAPI.getQuizzes();
            this.renderQuizList();
            this.app.hideLoading();
            
        } catch (error) {
            this.app.hideLoading();
            this.app.showNotification(`Fehler beim Laden der Quiz: ${error.message}`, 'error');
        }
    }

    renderQuizList() {
        const container = document.getElementById('quiz-list');
        if (!container) return;

        if (this.quizzes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-quiz"></i>
                    <h3>Noch keine Quiz erstellt</h3>
                    <p>Erstellen Sie Ihr erstes Quiz, um loszulegen!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.quizzes.map(quiz => `
            <div class="quiz-item" data-quiz-id="${quiz.id}">
                <div class="quiz-info">
                    <h4>${quiz.title}</h4>
                    <p>${quiz.questions?.length || 0} Fragen</p>
                    <span class="quiz-status ${quiz.published ? 'published' : 'draft'}">
                        ${quiz.published ? 'Veröffentlicht' : 'Entwurf'}
                    </span>
                </div>
                <div class="quiz-actions">
                    <button class="btn btn-outline btn-small" onclick="app.components.admin.editQuiz('${quiz.id}')">
                        <i class="fas fa-edit"></i> Bearbeiten
                    </button>
                    <button class="btn btn-outline btn-small" onclick="app.components.admin.duplicateQuiz('${quiz.id}')">
                        <i class="fas fa-copy"></i> Duplizieren
                    </button>
                    <button class="btn btn-primary btn-small" onclick="app.components.admin.startLiveSession('${quiz.id}')">
                        <i class="fas fa-play"></i> Starten
                    </button>
                    <button class="btn btn-danger btn-small" onclick="app.components.admin.deleteQuiz('${quiz.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    createNewQuiz() {
        this.app.showNotification('Quiz-Editor wird geladen...', 'info');
        
        // For now, just show a placeholder
        // In a real implementation, this would open a quiz editor modal or navigate to editor
        const newQuiz = {
            id: 'new-' + Date.now(),
            title: 'Neues Quiz',
            questions: [],
            published: false,
            createdAt: new Date().toISOString()
        };
        
        this.quizzes.unshift(newQuiz);
        this.renderQuizList();
        this.app.showNotification('Neues Quiz erstellt! (Demo)', 'success');
    }

    editQuiz(quizId) {
        const quiz = this.quizzes.find(q => q.id === quizId);
        if (!quiz) {
            this.app.showNotification('Quiz nicht gefunden', 'error');
            return;
        }
        
        this.app.showNotification(`Bearbeite: ${quiz.title} (Demo)`, 'info');
        // In a real implementation, this would open the quiz editor
    }

    duplicateQuiz(quizId) {
        const quiz = this.quizzes.find(q => q.id === quizId);
        if (!quiz) {
            this.app.showNotification('Quiz nicht gefunden', 'error');
            return;
        }
        
        const duplicatedQuiz = {
            ...quiz,
            id: 'copy-' + Date.now(),
            title: quiz.title + ' (Kopie)',
            published: false,
            createdAt: new Date().toISOString()
        };
        
        this.quizzes.unshift(duplicatedQuiz);
        this.renderQuizList();
        this.app.showNotification(`Quiz "${quiz.title}" dupliziert!`, 'success');
    }

    async startLiveSession(quizId) {
        const quiz = this.quizzes.find(q => q.id === quizId);
        if (!quiz) {
            this.app.showNotification('Quiz nicht gefunden', 'error');
            return;
        }

        this.app.showLoading('Starte Live-Session...');

        try {
            // Create live session
            const session = await this.cloudAPI.createLiveSession(quizId, {
                maxParticipants: 50,
                questionTimeLimit: 30
            });

            this.app.hideLoading();
            this.app.setSession(session);
            
            // Navigate to live control
            this.app.navigateTo('live', { sessionId: session.id });
            this.app.showNotification(`Live-Session für "${quiz.title}" gestartet!`, 'success');
            
        } catch (error) {
            this.app.hideLoading();
            this.app.showNotification(`Fehler beim Starten: ${error.message}`, 'error');
        }
    }

    async deleteQuiz(quizId) {
        const quiz = this.quizzes.find(q => q.id === quizId);
        if (!quiz) {
            this.app.showNotification('Quiz nicht gefunden', 'error');
            return;
        }

        if (!confirm(`Quiz "${quiz.title}" wirklich löschen?`)) {
            return;
        }

        this.app.showLoading('Lösche Quiz...');

        try {
            await this.cloudAPI.deleteQuiz(quizId);
            this.quizzes = this.quizzes.filter(q => q.id !== quizId);
            this.renderQuizList();
            this.app.hideLoading();
            this.app.showNotification(`Quiz "${quiz.title}" gelöscht!`, 'success');
            
        } catch (error) {
            this.app.hideLoading();
            this.app.showNotification(`Fehler beim Löschen: ${error.message}`, 'error');
        }
    }
}
