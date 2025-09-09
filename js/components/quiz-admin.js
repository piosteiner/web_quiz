/**
 * Quiz Admin Component
 * Handles quiz management and authentication (Editor functionality moved to quiz-editor.js)
 */

export class QuizAdmin {
    constructor(app) {
        this.app = app;
        this.cloudAPI = app.getCloudAPI();
        
        this.quizzes = [];
        this.currentQuiz = null;
        this.currentQuestions = [];
        this.isAuthenticated = false;
        this.isEditing = false;
        this.draggedQuestion = null;
        this.autoSaveTimeout = null;
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

        // Setup quiz editor listeners
        this.setupQuizEditorListeners();
    }

    setupQuizEditorListeners() {
        // Back to list button
        const backToListBtn = document.getElementById('back-to-list');
        backToListBtn?.addEventListener('click', () => {
            this.showQuizList();
        });

        // Save quiz button
        const saveQuizBtn = document.getElementById('save-quiz');
        saveQuizBtn?.addEventListener('click', () => {
            this.saveCurrentQuiz();
        });

        // Preview quiz button
        const previewQuizBtn = document.getElementById('preview-quiz');
        previewQuizBtn?.addEventListener('click', () => {
            this.previewQuiz();
        });

        // Publish quiz button
        const publishQuizBtn = document.getElementById('publish-quiz');
        publishQuizBtn?.addEventListener('click', () => {
            this.publishQuiz();
        });

        // Add question button
        const addQuestionBtn = document.getElementById('add-question');
        addQuestionBtn?.addEventListener('click', () => {
            this.addNewQuestion();
        });

        // Quiz title input
        const quizTitleInput = document.getElementById('quiz-title');
        quizTitleInput?.addEventListener('input', () => {
            this.updateQuizTitle();
        });

        // Auto-save functionality
        document.addEventListener('input', (e) => {
            if (this.isEditing && e.target.closest('.quiz-editor')) {
                this.scheduleAutoSave();
            }
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
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        // Show/hide forms
        document.querySelectorAll('.auth-form').forEach(form => {
            form.style.display = form.id === `${tab}-form` ? 'block' : 'none';
        });
    }

    // Authentication Methods
    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        if (!email || !password) {
            this.app.showNotification('Bitte füllen Sie alle Felder aus', 'error');
            return;
        }
        
        this.app.showLoading('Anmeldung läuft...');
        
        try {
            const response = await this.cloudAPI.login(email, password);
            
            if (response.success) {
                this.app.setState({ user: response.user });
                this.isAuthenticated = true;
                this.showAdminDashboard();
                this.app.showNotification('Erfolgreich angemeldet!', 'success');
            } else {
                this.app.showNotification(response.message || 'Anmeldung fehlgeschlagen', 'error');
            }
        } catch (error) {
            this.app.showNotification('Anmeldung fehlgeschlagen: ' + error.message, 'error');
        } finally {
            this.app.hideLoading();
        }
    }

    async handleRegister() {
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
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
        
        this.app.showLoading('Registrierung läuft...');
        
        try {
            const response = await this.cloudAPI.register(name, email, password);
            
            if (response.success) {
                this.app.setState({ user: response.user });
                this.isAuthenticated = true;
                this.showAdminDashboard();
                this.app.showNotification('Erfolgreich registriert!', 'success');
            } else {
                this.app.showNotification(response.message || 'Registrierung fehlgeschlagen', 'error');
            }
        } catch (error) {
            this.app.showNotification('Registrierung fehlgeschlagen: ' + error.message, 'error');
        } finally {
            this.app.hideLoading();
        }
    }

    handleLogout() {
        this.app.setState({ user: null });
        this.isAuthenticated = false;
        this.showLoginSection();
        this.app.showNotification('Erfolgreich abgemeldet', 'success');
    }

    validatePasswordMatch() {
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const confirmField = document.getElementById('confirm-password');
        
        if (confirmPassword && password !== confirmPassword) {
            confirmField.classList.add('error');
            confirmField.setCustomValidity('Passwörter stimmen nicht überein');
        } else {
            confirmField.classList.remove('error');
            confirmField.setCustomValidity('');
        }
    }

    // Quiz Management
    async loadQuizzes() {
        this.app.showLoading('Lade Quizzes...');
        
        try {
            const response = await this.cloudAPI.getQuizzes();
            // Handle both direct array and wrapped response formats
            this.quizzes = Array.isArray(response) ? response : (response.quizzes || response.data || []);
            console.log(`✅ Loaded ${this.quizzes.length} quizzes from backend`);
            this.renderQuizList();
        } catch (error) {
            console.warn('Failed to load quizzes from backend, using local storage:', error);
            this.quizzes = JSON.parse(localStorage.getItem('admin-quizzes') || '[]');
            this.renderQuizList();
            
            if (this.quizzes.length > 0) {
                this.app.showNotification(`${this.quizzes.length} lokale Quizzes geladen (Backend nicht verfügbar)`, 'warning');
            }
        } finally {
            this.app.hideLoading();
        }
    }

    renderQuizList() {
        const container = document.getElementById('quiz-list');
        if (!container) return;
        
        if (this.quizzes.length === 0) {
            container.innerHTML = `
                <div class="empty-quizzes">
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <i class="fas fa-clipboard-question"></i>
                        </div>
                        <h3>Noch keine Quizzes</h3>
                        <p>Erstellen Sie Ihr erstes Quiz, um zu beginnen!</p>
                        <button class="btn btn-primary" onclick="document.getElementById('create-quiz-btn').click()">
                            <i class="fas fa-plus"></i> Erstes Quiz erstellen
                        </button>
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.quizzes.map(quiz => `
            <div class="quiz-card ${quiz.published ? 'published' : 'draft'}">
                <div class="quiz-card-header">
                    <h3 class="quiz-title">${quiz.title}</h3>
                    <div class="quiz-status">
                        ${quiz.published 
                            ? '<span class="status-badge published"><i class="fas fa-globe"></i> Veröffentlicht</span>'
                            : '<span class="status-badge draft"><i class="fas fa-edit"></i> Entwurf</span>'
                        }
                    </div>
                </div>
                <div class="quiz-card-body">
                    <p class="quiz-description">${quiz.description || 'Keine Beschreibung'}</p>
                    <div class="quiz-stats">
                        <span><i class="fas fa-question"></i> ${quiz.questions?.length || 0} Fragen</span>
                        <span><i class="fas fa-clock"></i> ${quiz.settings?.timePerQuestion || 30}s pro Frage</span>
                        <span><i class="fas fa-users"></i> Max. ${quiz.settings?.maxParticipants || 50} Teilnehmer</span>
                    </div>
                </div>
                <div class="quiz-card-actions">
                    <button class="btn btn-primary" onclick="window.app.components.admin.editQuiz('${quiz.id}')">
                        <i class="fas fa-edit"></i> Bearbeiten
                    </button>
                    <button class="btn btn-secondary" onclick="window.app.components.admin.duplicateQuiz('${quiz.id}')">
                        <i class="fas fa-copy"></i> Duplizieren
                    </button>
                    ${quiz.published 
                        ? `<button class="btn btn-success" onclick="window.app.components.admin.startLiveSession('${quiz.id}')">
                            <i class="fas fa-play"></i> Starten
                        </button>`
                        : ''
                    }
                    <button class="btn btn-danger" onclick="window.app.components.admin.deleteQuiz('${quiz.id}')">
                        <i class="fas fa-trash"></i> Löschen
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Quiz Management Methods
    createNewQuiz() {
        // Open quiz editor with new quiz
        if (this.app.components.editor) {
            this.app.components.editor.openEditor(null);
        } else {
            console.error('Quiz editor component not loaded');
        }
    }

    editQuiz(quizId) {
        const quiz = this.quizzes.find(q => q.id === quizId);
        if (!quiz) {
            this.app.showNotification('Quiz nicht gefunden', 'error');
            return;
        }
        
        // Open quiz editor with existing quiz
        if (this.app.components.editor) {
            this.app.components.editor.openEditor(quiz);
        } else {
            console.error('Quiz editor component not loaded');
        }
    }

    // Editor delegation methods for backward compatibility
    showQuizEditor() {
        if (this.app.components.editor) {
            this.app.components.editor.showEditor();
        }
    }

    populateQuizEditor() {
        if (this.app.components.editor) {
            this.app.components.editor.populateEditor();
        }
    }

    addNewQuestion() {
        if (this.app.components.editor) {
            this.app.components.editor.addNewQuestion();
        }
    }

    renderQuestions() {
        if (this.app.components.editor) {
            this.app.components.editor.renderQuestions();
        }
    }

    toggleQuestion(questionId) {
        if (this.app.components.editor) {
            this.app.components.editor.toggleQuestion(questionId);
        }
    }

    updateQuestionText(questionId, text) {
        if (this.app.components.editor) {
            this.app.components.editor.updateQuestionText(questionId, text);
        }
    }

    toggleCorrectAnswer(questionId, answerId) {
        if (this.app.components.editor) {
            this.app.components.editor.toggleCorrectAnswer(questionId, answerId);
        }
    }

    updateAnswerText(questionId, answerId, text) {
        if (this.app.components.editor) {
            this.app.components.editor.updateAnswerText(questionId, answerId, text);
        }
    }

    addAnswer(questionId) {
        if (this.app.components.editor) {
            this.app.components.editor.addAnswer(questionId);
        }
    }

    deleteAnswer(questionId, answerId) {
        if (this.app.components.editor) {
            this.app.components.editor.deleteAnswer(questionId, answerId);
        }
    }

    duplicateQuestion(questionId) {
        if (this.app.components.editor) {
            this.app.components.editor.duplicateQuestion(questionId);
        }
    }

    deleteQuestion(questionId) {
        if (this.app.components.editor) {
            this.app.components.editor.deleteQuestion(questionId);
        }
    }

    updateQuestionTimeLimit(questionId, timeLimit) {
        if (this.app.components.editor) {
            this.app.components.editor.updateQuestionTimeLimit(questionId, timeLimit);
        }
    }

    updateQuestionPoints(questionId, points) {
        if (this.app.components.editor) {
            this.app.components.editor.updateQuestionPoints(questionId, points);
        }
    }

    updateQuizTitle() {
        if (this.app.components.editor) {
            this.app.components.editor.updateQuizTitle();
        }
    }

    saveCurrentQuiz() {
        if (this.app.components.editor) {
            this.app.components.editor.saveCurrentQuiz();
        }
    }

    publishQuiz() {
        if (this.app.components.editor) {
            this.app.components.editor.publishQuiz();
        }
    }

    previewQuiz() {
        if (this.app.components.editor) {
            this.app.components.editor.previewQuiz();
        }
    }

    scheduleAutoSave() {
        if (this.app.components.editor) {
            this.app.components.editor.scheduleAutoSave();
        }
    }

    showQuizList() {
        document.getElementById('quiz-list-view').style.display = 'block';
        document.getElementById('quiz-editor-view').style.display = 'none';
    }

    async saveQuiz(quiz) {
        this.app.showLoading('Speichere Quiz...');
        
        try {
            let savedQuiz;
            
            // Determine if this is a new quiz or an update
            const isNewQuiz = !quiz.id || quiz.id.startsWith('quiz-');
            
            if (isNewQuiz) {
                // Create new quiz via API
                savedQuiz = await this.cloudAPI.createQuiz(quiz);
                console.log('✅ Quiz created in backend:', savedQuiz.id);
            } else {
                // Update existing quiz via API
                savedQuiz = await this.cloudAPI.updateQuiz(quiz.id, quiz);
                console.log('✅ Quiz updated in backend:', savedQuiz.id);
            }
            
            // Update local quiz list
            const existingIndex = this.quizzes.findIndex(q => q.id === quiz.id);
            if (existingIndex >= 0) {
                this.quizzes[existingIndex] = { ...savedQuiz };
            } else {
                this.quizzes.unshift({ ...savedQuiz });
            }
            
            // Save to local storage as backup
            localStorage.setItem('admin-quizzes', JSON.stringify(this.quizzes));
            
            // Refresh quiz list if currently visible
            if (document.getElementById('quiz-list-view').style.display !== 'none') {
                this.renderQuizList();
            }
            
            this.app.hideLoading();
            this.app.showNotification('Quiz erfolgreich gespeichert!', 'success');
            return savedQuiz;
            
        } catch (error) {
            console.error('Failed to save quiz to backend:', error);
            
            // Fallback to local storage only
            const existingIndex = this.quizzes.findIndex(q => q.id === quiz.id);
            if (existingIndex >= 0) {
                this.quizzes[existingIndex] = { ...quiz };
            } else {
                this.quizzes.unshift({ ...quiz });
            }
            
            localStorage.setItem('admin-quizzes', JSON.stringify(this.quizzes));
            
            if (document.getElementById('quiz-list-view').style.display !== 'none') {
                this.renderQuizList();
            }
            
            this.app.hideLoading();
            this.app.showNotification('Quiz lokal gespeichert (Backend nicht verfügbar)', 'warning');
            return quiz;
        }
    }

    duplicateQuiz(quizId) {
        const quiz = this.quizzes.find(q => q.id === quizId);
        if (!quiz) {
            this.app.showNotification('Quiz nicht gefunden', 'error');
            return;
        }
        
        const duplicatedQuiz = {
            ...quiz,
            id: 'quiz-' + Date.now(),
            title: quiz.title + ' (Kopie)',
            published: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.quizzes.unshift(duplicatedQuiz);
        this.renderQuizList();
        this.app.showNotification('Quiz dupliziert', 'success');
    }

    async startLiveSession(quizId) {
        const quiz = this.quizzes.find(q => q.id === quizId);
        if (!quiz) {
            this.app.showNotification('Quiz nicht gefunden', 'error');
            return;
        }
        
        if (!quiz.published) {
            this.app.showNotification('Quiz muss erst veröffentlicht werden', 'error');
            return;
        }
        
        this.app.showLoading('Starte Live-Session...');
        
        try {
            // Here you would typically create a live session via API
            const sessionCode = Math.random().toString(36).substr(2, 6).toUpperCase();
            
            // Navigate to live control
            this.app.showNotification(`Live-Session gestartet! Code: ${sessionCode}`, 'success');
            // this.app.navigate('live-control', { quizId, sessionCode });
            
        } catch (error) {
            this.app.showNotification('Fehler beim Starten der Session: ' + error.message, 'error');
        } finally {
            this.app.hideLoading();
        }
    }

    async deleteQuiz(quizId) {
        const quiz = this.quizzes.find(q => q.id === quizId);
        if (!quiz) {
            this.app.showNotification('Quiz nicht gefunden', 'error');
            return;
        }
        
        if (!confirm(`Quiz "${quiz.title}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
            return;
        }
        
        this.app.showLoading('Lösche Quiz...');
        
        try {
            // Try to delete from backend first
            if (!quizId.startsWith('quiz-')) {
                await this.cloudAPI.deleteQuiz(quizId);
                console.log('✅ Quiz deleted from backend:', quizId);
            }
            
            // Remove from local list
            this.quizzes = this.quizzes.filter(q => q.id !== quizId);
            localStorage.setItem('admin-quizzes', JSON.stringify(this.quizzes));
            this.renderQuizList();
            
            this.app.hideLoading();
            this.app.showNotification('Quiz erfolgreich gelöscht', 'success');
        } catch (error) {
            console.error('Failed to delete quiz from backend:', error);
            
            // Fallback: delete locally only
            this.quizzes = this.quizzes.filter(q => q.id !== quizId);
            localStorage.setItem('admin-quizzes', JSON.stringify(this.quizzes));
            this.renderQuizList();
            
            this.app.hideLoading();
            this.app.showNotification('Quiz lokal gelöscht (Backend nicht verfügbar)', 'warning');
        }
    }
}
