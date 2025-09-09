/**
 * Enhanced Quiz Admin Component with unified architecture
 * Extends BaseComponent for proper lifecycle management
 */

import { BaseComponent } from '../core/component-manager.js';

export class QuizAdmin extends BaseComponent {
    constructor(app) {
        super(app);
        
        this.quizzes = [];
        this.currentQuiz = null;
        this.isAuthenticated = false;
        this.autoSaveTimeout = null;
        
        // Subscribe to state changes
        this.app.stateManager.subscribe(this.componentName, (state, updates) => {
            this.handleStateUpdate(state, updates);
        });
    }

    async init(params = {}) {
        if (this._isInitialized) {
            console.log(`${this.componentName} already initialized, skipping...`);
            return;
        }
        
        await super.init(params);
        console.log('⚙️ Initializing Quiz Admin');
        
        this.setupEventListeners();
        
        // Check authentication state
        const user = this.app.stateManager.get('user');
        if (user) {
            this.handleAuthenticated(user);
        } else {
            this.showLoginSection();
        }
    }

    setupEventListeners() {
        // Login form
        const loginForm = this.$('#login-form');
        if (loginForm) {
            this.addEventListener(loginForm, 'submit', this.handleLogin.bind(this));
        }

        // Register form
        const registerForm = this.$('#register-form');
        if (registerForm) {
            this.addEventListener(registerForm, 'submit', this.handleRegister.bind(this));
        }

        // Create quiz button
        const createQuizBtn = this.$('#create-quiz-btn');
        if (createQuizBtn) {
            this.addEventListener(createQuizBtn, 'click', this.createNewQuiz.bind(this));
        }

        // Global delegation for dynamic buttons
        this.addGlobalEventListener(document, 'click', this.handleGlobalClick.bind(this));
    }

    handleGlobalClick(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        e.preventDefault();
        const action = target.dataset.action;
        const quizId = target.dataset.quizId;

        switch (action) {
            case 'edit-quiz':
                this.editQuiz(quizId);
                break;
            case 'delete-quiz':
                this.deleteQuiz(quizId);
                break;
            case 'duplicate-quiz':
                this.duplicateQuiz(quizId);
                break;
            case 'start-live':
                this.startLiveSession(quizId);
                break;
            case 'copy-quiz-id':
                this.copyQuizId();
                break;
            case 'copy-join-link':
                this.copyJoinLink();
                break;
            case 'add-participant':
                this.showAddParticipantForm();
                break;
            case 'remove-participant':
                this.removeParticipant(target.dataset.participantId);
                break;
        }
    }

    handleStateUpdate(state, updates) {
        if (updates.user !== undefined) {
            if (updates.user) {
                this.handleAuthenticated(updates.user);
            } else {
                this.showLoginSection();
            }
        }
    }

    handleAuthenticated(user) {
        this.isAuthenticated = true;
        this.showAdminDashboard();
        this.loadQuizzes();
    }

    async handleLogin(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');

        try {
            this.app.showLoading('Anmeldung läuft...');
            const user = await this.app.cloudAPI.login(email, password);
            
            this.app.stateManager.setState({ user }, 'login');
            this.notify('Erfolgreich angemeldet', 'success');
        } catch (error) {
            console.error('Login failed:', error);
            this.notify(`Anmeldung fehlgeschlagen: ${error.message}`, 'error');
        } finally {
            this.app.hideLoading();
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        // Validate passwords match
        if (formData.get('password') !== formData.get('confirm-password')) {
            this.notify('Passwörter stimmen nicht überein', 'error');
            return;
        }

        try {
            this.app.showLoading('Registrierung läuft...');
            const user = await this.app.cloudAPI.register({
                name: formData.get('name'),
                email: formData.get('email'),
                password: formData.get('password')
            });
            
            this.app.stateManager.setState({ user }, 'register');
            this.notify('Erfolgreich registriert', 'success');
        } catch (error) {
            console.error('Registration failed:', error);
            this.notify(`Registrierung fehlgeschlagen: ${error.message}`, 'error');
        } finally {
            this.app.hideLoading();
        }
    }

    showLoginSection() {
        const loginSection = this.$('#login-section');
        const adminDashboard = this.$('#admin-dashboard');
        
        if (loginSection) loginSection.style.display = 'block';
        if (adminDashboard) adminDashboard.style.display = 'none';
    }

    showAdminDashboard() {
        const loginSection = this.$('#login-section');
        const adminDashboard = this.$('#admin-dashboard');
        
        if (loginSection) loginSection.style.display = 'none';
        if (adminDashboard) adminDashboard.style.display = 'block';
        
        // Update user info
        const userName = this.$('#user-name');
        const user = this.app.stateManager.get('user');
        if (userName && user) {
            userName.textContent = user.name;
        }
    }

    async loadQuizzes() {
        try {
            this.app.showLoading('Lade Quizzes...');
            this.quizzes = await this.app.cloudAPI.getAllQuizzes();
            this.renderQuizList();
            console.log(`✅ Loaded ${this.quizzes.length} quizzes from backend`);
        } catch (error) {
            console.error('Failed to load quizzes:', error);
            this.notify('Fehler beim Laden der Quizzes', 'error');
        } finally {
            this.app.hideLoading();
        }
    }

    renderQuizList() {
        const container = this.$('#quiz-list-container');
        if (!container) return;

        if (this.quizzes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-quiz"></i>
                    </div>
                    <h3>Noch keine Quizzes</h3>
                    <p>Erstellen Sie Ihr erstes Quiz!</p>
                    <button class="btn btn-primary" data-action="create-quiz">
                        <i class="fas fa-plus"></i> Erstes Quiz erstellen
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.quizzes.map(quiz => `
            <div class="quiz-card" data-quiz-id="${quiz.id}">
                <div class="quiz-card-header">
                    <h3>${quiz.title}</h3>
                    <span class="quiz-status ${quiz.published ? 'published' : 'draft'}">
                        ${quiz.published ? 'Veröffentlicht' : 'Entwurf'}
                    </span>
                </div>
                <div class="quiz-card-body">
                    <p>${quiz.description || 'Keine Beschreibung'}</p>
                    <div class="quiz-stats">
                        <span><i class="fas fa-question"></i> ${quiz.questions?.length || 0} Fragen</span>
                        <span><i class="fas fa-users"></i> ${quiz.participants?.length || 0} Teilnehmer</span>
                    </div>
                </div>
                <div class="quiz-card-actions">
                    <button class="btn btn-primary" data-action="edit-quiz" data-quiz-id="${quiz.id}">
                        <i class="fas fa-edit"></i> Bearbeiten
                    </button>
                    <button class="btn btn-secondary" data-action="duplicate-quiz" data-quiz-id="${quiz.id}">
                        <i class="fas fa-copy"></i> Duplizieren
                    </button>
                    ${quiz.published 
                        ? `<button class="btn btn-success" data-action="start-live" data-quiz-id="${quiz.id}">
                            <i class="fas fa-play"></i> Live starten
                           </button>`
                        : ''
                    }
                    <button class="btn btn-danger" data-action="delete-quiz" data-quiz-id="${quiz.id}">
                        <i class="fas fa-trash"></i> Löschen
                    </button>
                </div>
            </div>
        `).join('');
    }

    createNewQuiz() {
        this.currentQuiz = this.createNewQuizTemplate();
        this.app.stateManager.setState({ 
            quiz: this.currentQuiz 
        }, 'createNewQuiz');
        this.navigate('quiz-admin');
    }

    createNewQuizTemplate() {
        const quizId = this.generateUniqueQuizId();
        return {
            id: quizId,
            title: 'Neues Quiz',
            description: '',
            participants: [],
            questions: [],
            settings: {
                timePerQuestion: 30
            },
            published: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    generateUniqueQuizId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    editQuiz(quizId) {
        const quiz = this.quizzes.find(q => q.id === quizId);
        if (!quiz) {
            this.notify('Quiz nicht gefunden', 'error');
            return;
        }
        
        this.currentQuiz = { ...quiz };
        this.app.stateManager.setState({ 
            quiz: this.currentQuiz 
        }, 'editQuiz');
        this.showQuizAdminForm();
    }

    showQuizAdminForm() {
        const listView = this.$('#quiz-list-view');
        const adminView = this.$('#quiz-admin-view');
        
        if (listView) listView.style.display = 'none';
        if (adminView) adminView.style.display = 'block';
        
        this.populateAdminForm();
        this.renderParticipantList();
        this.setupAdminFormListeners();
    }

    populateAdminForm() {
        if (!this.currentQuiz) {
            console.warn('No current quiz to populate form with');
            return;
        }

        const titleInput = this.$('#admin-quiz-title');
        const descInput = this.$('#admin-quiz-description');
        const quizIdDisplay = this.$('#admin-quiz-id-display');

        if (titleInput) titleInput.value = this.currentQuiz.title || '';
        if (descInput) descInput.value = this.currentQuiz.description || '';
        if (quizIdDisplay) quizIdDisplay.textContent = this.currentQuiz.id;
    }

    setupAdminFormListeners() {
        // Title and description inputs
        const titleInput = this.$('#admin-quiz-title');
        const descInput = this.$('#admin-quiz-description');

        if (titleInput) {
            this.addEventListener(titleInput, 'input', () => {
                if (!this.currentQuiz) return;
                this.currentQuiz.title = titleInput.value;
                this.markAsChanged();
                this.debouncedAutoSave();
            });
        }

        if (descInput) {
            this.addEventListener(descInput, 'input', () => {
                if (!this.currentQuiz) return;
                this.currentQuiz.description = descInput.value;
                this.markAsChanged();
                this.debouncedAutoSave();
            });
        }

        // Save button
        const saveBtn = this.$('#save-quiz-admin');
        if (saveBtn) {
            this.addEventListener(saveBtn, 'click', this.saveQuizAdminData.bind(this));
        }

        // Back to list button
        const backBtn = this.$('#back-to-list-admin');
        if (backBtn) {
            this.addEventListener(backBtn, 'click', () => {
                this.navigate('admin');
            });
        }
    }

    markAsChanged() {
        const saveBtn = this.$('#save-quiz-admin');
        if (saveBtn) {
            saveBtn.classList.add('btn-warning');
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Speichern*';
        }
    }

    debouncedAutoSave() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        this.autoSaveTimeout = setTimeout(() => {
            this.autoSaveQuiz();
        }, 2000);
    }

    async autoSaveQuiz() {
        try {
            await this.saveQuizToServer();
            console.log('✅ Auto-save successful');
        } catch (error) {
            console.error('Auto-save failed:', error.message);
        }
    }

    async saveQuizAdminData() {
        if (!this.currentQuiz) {
            this.notify('Kein Quiz ausgewählt', 'error');
            return;
        }

        try {
            this.app.showLoading('Speichere Quiz...');
            await this.saveQuizToServer();
            this.notify('Quiz erfolgreich gespeichert', 'success');
            
            // Update button state
            const saveBtn = this.$('#save-quiz-admin');
            if (saveBtn) {
                saveBtn.classList.remove('btn-warning');
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Gespeichert';
            }
        } catch (error) {
            console.error('Failed to save quiz:', error);
            this.notify(`Fehler beim Speichern: ${error.message}`, 'error');
        } finally {
            this.app.hideLoading();
        }
    }

    async saveQuizToServer() {
        if (!this.currentQuiz) return;

        // Determine if this is a new quiz or existing one
        const isNewQuiz = !this.quizzes.find(q => q.id === this.currentQuiz.id);
        
        this.currentQuiz.updatedAt = new Date().toISOString();

        if (isNewQuiz) {
            // Create new quiz
            const result = await this.app.cloudAPI.createQuiz(this.currentQuiz);
            this.currentQuiz = result;
            this.quizzes.push(result);
        } else {
            // Update existing quiz
            const result = await this.app.cloudAPI.updateQuiz(this.currentQuiz.id, this.currentQuiz);
            this.currentQuiz = result;
            
            // Update in local list
            const index = this.quizzes.findIndex(q => q.id === this.currentQuiz.id);
            if (index !== -1) {
                this.quizzes[index] = result;
            }
        }

        // Update global state
        this.app.stateManager.setState({ 
            quiz: this.currentQuiz 
        }, 'saveQuiz');
    }

    renderParticipantList() {
        const container = this.$('#admin-participants-list');
        if (!container || !this.currentQuiz) return;

        const participants = this.currentQuiz.participants || [];
        
        if (participants.length === 0) {
            container.innerHTML = `
                <div class="empty-participants">
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <h3>Noch keine Teilnehmer</h3>
                        <p>Fügen Sie Teilnehmer hinzu, um zu beginnen!</p>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = participants.map(participant => `
            <div class="participant-item" data-participant-id="${participant.id}">
                <div class="participant-info">
                    <div class="participant-name">${participant.name}</div>
                    <div class="participant-email">${participant.email || 'Keine E-Mail'}</div>
                </div>
                <div class="participant-actions">
                    <button class="btn-icon" data-action="remove-participant" data-participant-id="${participant.id}" title="Entfernen">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    copyQuizId() {
        if (!this.currentQuiz?.id) {
            this.notify('Keine Quiz-ID verfügbar', 'warning');
            return;
        }

        navigator.clipboard.writeText(this.currentQuiz.id).then(() => {
            this.notify('Quiz-ID in Zwischenablage kopiert', 'success');
        }).catch(() => {
            // Fallback for older browsers
            const tempInput = document.createElement('input');
            tempInput.value = this.currentQuiz.id;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            this.notify('Quiz-ID in Zwischenablage kopiert', 'success');
        });
    }

    copyJoinLink() {
        if (!this.currentQuiz?.id) {
            this.notify('Quiz muss zuerst gespeichert werden', 'warning');
            return;
        }

        const baseUrl = window.location.origin + window.location.pathname;
        const joinUrl = `${baseUrl}?quiz=${this.currentQuiz.id}&join=true`;
        
        navigator.clipboard.writeText(joinUrl).then(() => {
            this.notify('Join-Link in Zwischenablage kopiert', 'success');
        }).catch(() => {
            // Fallback
            const tempInput = document.createElement('input');
            tempInput.value = joinUrl;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            this.notify('Join-Link in Zwischenablage kopiert', 'success');
        });
    }

    async deleteQuiz(quizId) {
        if (!confirm('Sind Sie sicher, dass Sie dieses Quiz löschen möchten?')) {
            return;
        }

        try {
            await this.app.cloudAPI.deleteQuiz(quizId);
            this.quizzes = this.quizzes.filter(q => q.id !== quizId);
            this.renderQuizList();
            this.notify('Quiz erfolgreich gelöscht', 'success');
        } catch (error) {
            console.error('Failed to delete quiz:', error);
            this.notify(`Fehler beim Löschen: ${error.message}`, 'error');
        }
    }

    async cleanup() {
        await super.cleanup();
        
        // Clear timeouts
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = null;
        }
        
        // Unsubscribe from state
        this.app.stateManager.unsubscribe(this.componentName);
        
        console.log('🧹 Quiz Admin cleaned up');
    }
}
