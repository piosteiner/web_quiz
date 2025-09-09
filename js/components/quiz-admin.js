/**
 * Quiz Admin Component
 * Handles quiz metadata, participant management, and basic quiz operations
 */

import { escapeHTML, validateQuizTitle, validateParticipantName } from '../utils/security.js';

export class QuizAdmin {
    constructor(app) {
        this.app = app;
        this.cloudAPI = app.getCloudAPI();
        
        this.quizzes = [];
        this.currentQuiz = null;
        this.isAuthenticated = false;
        this.autoSaveTimeout = null;
    }

    async init(params = {}) {
        console.log('⚙️ Initializing Quiz Admin');
        
        this.setupEventListeners();
        
        // Check if user is already authenticated
        if (this.app.getState().user) {
            // Check if we're in quiz-admin view (editing specific quiz)
            if (this.app.currentView === 'quiz-admin') {
                this.showQuizAdminForm();
            } else {
                this.showAdminDashboard();
            }
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

        // Quiz Admin navigation buttons
        const backToListAdmin = document.getElementById('back-to-list-admin');
        backToListAdmin?.addEventListener('click', () => {
            this.app.navigateTo('admin');
        });

        const openQuizEditor = document.getElementById('open-quiz-editor');
        openQuizEditor?.addEventListener('click', () => {
            this.app.navigateTo('admin'); // Switch to editor view within admin
            setTimeout(() => {
                document.getElementById('quiz-editor-view').style.display = 'block';
                document.getElementById('quiz-admin-view').style.display = 'none';
            }, 100);
        });

        const saveQuizAdmin = document.getElementById('save-quiz-admin');
        saveQuizAdmin?.addEventListener('click', () => {
            this.saveQuizAdmin();
        });

        const copyQuizId = document.getElementById('copy-quiz-id');
        copyQuizId?.addEventListener('click', () => {
            this.copyQuizId();
        });

        const copyJoinLink = document.getElementById('copy-join-link');
        copyJoinLink?.addEventListener('click', () => {
            this.copyJoinLink();
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
                    <h3 class="quiz-title">${escapeHTML(quiz.title)}</h3>
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
        // Create new quiz with admin form
        this.currentQuiz = this.createNewQuizTemplate();
        this.app.navigateTo('quiz-admin');
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
        // Generate a unique 8-character quiz ID
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    showQuizAdminForm() {
        document.getElementById('quiz-list-view').style.display = 'none';
        document.getElementById('quiz-admin-view').style.display = 'block';
        
        this.populateAdminForm();
        this.renderParticipantList();
        this.setupAdminFormListeners();
    }

    setupAdminFormListeners() {
        // Add participant form
        this.setupParticipantFormListeners();

        // Copy quiz ID
        const copyIdBtn = document.getElementById('copy-quiz-id');
        if (copyIdBtn) {
            copyIdBtn.onclick = () => this.copyQuizId();
        }

        // Copy join link
        const copyLinkBtn = document.getElementById('copy-join-link');
        if (copyLinkBtn) {
            copyLinkBtn.onclick = () => this.copyJoinLink();
        }

        // Quiz title input
        const titleInput = document.getElementById('admin-quiz-title');
        if (titleInput) {
            titleInput.addEventListener('input', () => {
                this.currentQuiz.title = titleInput.value;
                this.markAsChanged();
                this.debouncedAutoSave();
            });
        }

        // Quiz description input
        const descInput = document.getElementById('admin-quiz-description');
        if (descInput) {
            descInput.addEventListener('input', () => {
                this.currentQuiz.description = descInput.value;
                this.markAsChanged();
                this.debouncedAutoSave();
            });
        }
    }

    // Debounced auto-save for title/description changes
    debouncedAutoSave() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        this.autoSaveTimeout = setTimeout(async () => {
            if (this.currentQuiz && this.currentQuiz.title.trim()) {
                try {
                    await this.saveQuizToServer();
                    console.log('✅ Quiz auto-saved');
                } catch (error) {
                    console.warn('Auto-save failed:', error.message);
                    // Don't show error notification for auto-save failures
                }
            }
        }, 2000); // Auto-save after 2 seconds of inactivity
    }

    setupParticipantFormListeners() {
        // Add participant button
        const addParticipantBtn = document.getElementById('add-participant-btn');
        if (addParticipantBtn) {
            addParticipantBtn.onclick = () => this.showAddParticipantForm();
        }

        // Bulk add button
        const bulkAddBtn = document.getElementById('bulk-add-btn');
        if (bulkAddBtn) {
            bulkAddBtn.onclick = () => this.showBulkAddForm();
        }

        // Add participant form
        const confirmAddBtn = document.getElementById('confirm-add-participant');
        if (confirmAddBtn) {
            confirmAddBtn.onclick = () => this.addParticipantFromInput();
        }

        const cancelAddBtn = document.getElementById('cancel-add-participant');
        if (cancelAddBtn) {
            cancelAddBtn.onclick = () => this.hideAddParticipantForm();
        }

        // Bulk add form
        const confirmBulkBtn = document.getElementById('confirm-bulk-add');
        if (confirmBulkBtn) {
            confirmBulkBtn.onclick = () => this.addBulkParticipants();
        }

        const cancelBulkBtn = document.getElementById('cancel-bulk-add');
        if (cancelBulkBtn) {
            cancelBulkBtn.onclick = () => this.hideBulkAddForm();
        }

        // Participant name input (Enter key)
        const participantNameInput = document.getElementById('participant-name');
        if (participantNameInput) {
            participantNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addParticipantFromInput();
                }
            });
        }
    }

    showAddParticipantForm() {
        document.getElementById('add-participant-form').style.display = 'block';
        document.getElementById('bulk-add-form').style.display = 'none';
        document.getElementById('participant-name').focus();
    }

    hideAddParticipantForm() {
        document.getElementById('add-participant-form').style.display = 'none';
        document.getElementById('participant-name').value = '';
        document.getElementById('participant-email').value = '';
    }

    showBulkAddForm() {
        document.getElementById('bulk-add-form').style.display = 'block';
        document.getElementById('add-participant-form').style.display = 'none';
        document.getElementById('bulk-participants').focus();
    }

    hideBulkAddForm() {
        document.getElementById('bulk-add-form').style.display = 'none';
        document.getElementById('bulk-participants').value = '';
    }

    populateAdminForm() {
        const titleInput = document.getElementById('admin-quiz-title');
        const descInput = document.getElementById('admin-quiz-description');
        const quizIdDisplay = document.getElementById('admin-quiz-id-display');

        if (titleInput) titleInput.value = this.currentQuiz.title || '';
        if (descInput) descInput.value = this.currentQuiz.description || '';
        if (quizIdDisplay) quizIdDisplay.textContent = this.currentQuiz.id;
    }

    openQuizEditor() {
        // Save current admin changes first
        this.saveQuizAdminData();
        
        // Open quiz editor with current quiz
        if (this.app.components.editor) {
            this.app.components.editor.openEditor(this.currentQuiz);
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
        
        this.currentQuiz = { ...quiz };
        this.showQuizAdminForm();
    }

    showQuizList() {
        document.getElementById('quiz-admin-view').style.display = 'none';
        document.getElementById('quiz-list-view').style.display = 'block';
        this.currentQuiz = null;
    }

    markAsChanged() {
        // Mark quiz as having unsaved changes
        const saveBtn = document.getElementById('save-quiz-admin');
        if (saveBtn) {
            saveBtn.classList.add('btn-warning');
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Speichern*';
        }
    }

    // Participant Management Methods
    renderParticipantList() {
        const participantsList = document.getElementById('participants-list-admin');
        if (!participantsList) return;

        const participants = this.currentQuiz.participants || [];
        
        participantsList.innerHTML = `
            <div class="participants-count">
                <h4><i class="fas fa-users"></i> Teilnehmer (${participants.length})</h4>
            </div>
            
            <div class="participant-input">
                <div class="input-group">
                    <input type="text" 
                           id="new-participant-name" 
                           placeholder="Teilnehmername eingeben..."
                           class="form-control">
                    <button id="add-participant-btn" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Hinzufügen
                    </button>
                </div>
                
                <div class="bulk-input-section">
                    <textarea id="bulk-participants-admin" 
                              placeholder="Mehrere Namen (einen pro Zeile)..."
                              class="form-control"
                              rows="3"></textarea>
                    <button id="bulk-add-participants" class="btn btn-secondary">
                        <i class="fas fa-users"></i> Alle hinzufügen
                    </button>
                </div>
            </div>

            <div class="participants-list">
                ${participants.length > 0 ? participants.map((participant, index) => `
                    <div class="participant-item" data-participant-id="${participant.id}">
                        <div class="participant-info">
                            <span class="participant-name">${escapeHTML(participant.name)}</span>
                            <span class="participant-status ${participant.status || 'pending'}">${this.getParticipantStatusText(participant.status || 'pending')}</span>
                        </div>
                        <div class="participant-actions">
                            <button class="btn-icon" onclick="window.app.components.admin.editParticipant('${participant.id}')" title="Bearbeiten">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon delete-btn" onclick="window.app.components.admin.removeParticipant('${participant.id}')" title="Entfernen">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('') : '<div class="empty-participants">Noch keine Teilnehmer hinzugefügt</div>'}
            </div>
        `;
    }

    getParticipantStatusText(status) {
        const statusTexts = {
            'pending': 'Wartend',
            'joined': 'Beigetreten',
            'active': 'Aktiv',
            'finished': 'Abgeschlossen'
        };
        return statusTexts[status] || 'Unbekannt';
    }

    async addParticipantFromInput() {
        const nameInput = document.getElementById('participant-name');
        const emailInput = document.getElementById('participant-email');
        
        if (!nameInput) return;

        const name = nameInput.value.trim();
        const email = emailInput ? emailInput.value.trim() : '';
        
        // Validate and sanitize the name
        const nameValidation = validateParticipantName(name);
        if (!nameValidation.isValid) {
            this.app.showNotification(nameValidation.error, 'warning');
            return;
        }

        const sanitizedName = nameValidation.sanitized;

        // Check for duplicate names
        const existingParticipant = this.currentQuiz.participants?.find(p => 
            p.name.toLowerCase() === sanitizedName.toLowerCase()
        );
        
        if (existingParticipant) {
            this.app.showNotification('Ein Teilnehmer mit diesem Namen existiert bereits', 'warning');
            return;
        }

        const participant = {
            id: 'participant-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            name: sanitizedName,
            email: email,
            status: 'pending',
            addedAt: new Date().toISOString()
        };

        if (!this.currentQuiz.participants) {
            this.currentQuiz.participants = [];
        }
        
        this.currentQuiz.participants.push(participant);
        
        // Immediately save to server
        this.app.showLoading('Teilnehmer wird hinzugefügt...');
        try {
            await this.saveQuizToServer();
            this.app.showNotification(`Teilnehmer "${name}" wurde hinzugefügt`, 'success');
            
            // Clear form and hide it
            nameInput.value = '';
            if (emailInput) emailInput.value = '';
            this.hideAddParticipantForm();
            
            // Update participant list display
            this.renderParticipantList();
        } catch (error) {
            // Remove participant from local array if server save failed
            this.currentQuiz.participants = this.currentQuiz.participants.filter(p => p.id !== participant.id);
            this.app.showNotification('Fehler beim Speichern des Teilnehmers: ' + error.message, 'error');
        } finally {
            this.app.hideLoading();
        }
    }

    async addBulkParticipants() {
        const bulkInput = document.getElementById('bulk-participants');
        if (!bulkInput) return;

        const names = bulkInput.value.split('\n')
            .map(name => name.trim())
            .filter(name => name.length > 0);

        if (names.length === 0) {
            this.app.showNotification('Bitte geben Sie mindestens einen Namen ein', 'warning');
            return;
        }

        if (!this.currentQuiz.participants) {
            this.currentQuiz.participants = [];
        }

        let addedCount = 0;
        const duplicates = [];
        const newParticipants = [];

        names.forEach(name => {
            // Check for duplicate names
            const existingParticipant = this.currentQuiz.participants.find(p => 
                p.name.toLowerCase() === name.toLowerCase()
            );
            
            if (existingParticipant) {
                duplicates.push(name);
                return;
            }

            const participant = {
                id: 'participant-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                name: name,
                status: 'pending',
                addedAt: new Date().toISOString()
            };

            this.currentQuiz.participants.push(participant);
            newParticipants.push(participant);
            addedCount++;
        });

        if (addedCount === 0) {
            if (duplicates.length > 0) {
                this.app.showNotification(`Alle Namen bereits vorhanden: ${duplicates.join(', ')}`, 'warning');
            }
            return;
        }

        // Save to server immediately
        this.app.showLoading('Teilnehmer werden hinzugefügt...');
        try {
            await this.saveQuizToServer();
            
            // Clear form and hide it
            bulkInput.value = '';
            this.hideBulkAddForm();
            
            // Update participant list display
            this.renderParticipantList();

            this.app.showNotification(`${addedCount} Teilnehmer hinzugefügt`, 'success');
            
            if (duplicates.length > 0) {
                this.app.showNotification(`Duplikate übersprungen: ${duplicates.join(', ')}`, 'warning');
            }
        } catch (error) {
            // Remove newly added participants if server save failed
            newParticipants.forEach(newParticipant => {
                this.currentQuiz.participants = this.currentQuiz.participants.filter(p => p.id !== newParticipant.id);
            });
            this.app.showNotification('Fehler beim Speichern der Teilnehmer: ' + error.message, 'error');
        } finally {
            this.app.hideLoading();
        }
    }

    async editParticipant(participantId) {
        const participant = this.currentQuiz.participants?.find(p => p.id === participantId);
        if (!participant) return;

        const newName = prompt('Neuer Name:', participant.name);
        if (!newName || newName.trim() === '') return;

        // Validate and sanitize the name
        const validation = validateParticipantName(newName);
        if (!validation.isValid) {
            this.app.showNotification(validation.error, 'warning');
            return;
        }

        const trimmedName = validation.sanitized;
        
        // Check for duplicate names (excluding current participant)
        const existingParticipant = this.currentQuiz.participants.find(p => 
            p.id !== participantId && p.name.toLowerCase() === trimmedName.toLowerCase()
        );
        
        if (existingParticipant) {
            this.app.showNotification('Ein Teilnehmer mit diesem Namen existiert bereits', 'warning');
            return;
        }

        const oldName = participant.name;
        participant.name = trimmedName;
        participant.updatedAt = new Date().toISOString();
        
        // Save to server immediately
        this.app.showLoading('Teilnehmer wird aktualisiert...');
        try {
            await this.saveQuizToServer();
            this.renderParticipantList();
            this.app.showNotification(`Teilnehmer umbenannt in "${trimmedName}"`, 'success');
        } catch (error) {
            // Revert changes if server save failed
            participant.name = oldName;
            delete participant.updatedAt;
            this.app.showNotification('Fehler beim Speichern der Änderungen: ' + error.message, 'error');
        } finally {
            this.app.hideLoading();
        }
    }

    async removeParticipant(participantId) {
        const participant = this.currentQuiz.participants?.find(p => p.id === participantId);
        if (!participant) return;

        if (!confirm(`Teilnehmer "${participant.name}" wirklich entfernen?`)) {
            return;
        }

        // Remove from local array
        const originalParticipants = [...this.currentQuiz.participants];
        this.currentQuiz.participants = this.currentQuiz.participants.filter(p => p.id !== participantId);
        
        // Save to server immediately
        this.app.showLoading('Teilnehmer wird entfernt...');
        try {
            await this.saveQuizToServer();
            this.renderParticipantList();
            this.app.showNotification(`Teilnehmer "${participant.name}" entfernt`, 'success');
        } catch (error) {
            // Restore participant if server save failed
            this.currentQuiz.participants = originalParticipants;
            this.app.showNotification('Fehler beim Entfernen des Teilnehmers: ' + error.message, 'error');
        } finally {
            this.app.hideLoading();
        }
    }

    // Utility Methods
    copyQuizId() {
        if (!this.currentQuiz?.id) {
            this.app.showNotification('Keine Quiz-ID verfügbar', 'warning');
            return;
        }

        // Create temporary input element
        const tempInput = document.createElement('input');
        tempInput.value = this.currentQuiz.id;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        
        this.app.showNotification('Quiz-ID in Zwischenablage kopiert', 'success');
    }

    copyJoinLink() {
        if (!this.currentQuiz?.id) {
            this.app.showNotification('Quiz muss zuerst gespeichert werden', 'warning');
            return;
        }

        const baseUrl = window.location.origin + window.location.pathname;
        const joinUrl = `${baseUrl}?quiz=${this.currentQuiz.id}&join=true`;
        
        // Create temporary input element
        const tempInput = document.createElement('input');
        tempInput.value = joinUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        
        this.app.showNotification('Join-Link in Zwischenablage kopiert', 'success');
    }

    saveQuizAdminData() {
        // Update quiz data from form
        const titleInput = document.getElementById('quiz-title-admin');
        const descInput = document.getElementById('quiz-description-admin');

        if (titleInput) this.currentQuiz.title = titleInput.value;
        if (descInput) this.currentQuiz.description = descInput.value;
        
        this.currentQuiz.updatedAt = new Date().toISOString();
    }

    // Server Communication Helper
    async saveQuizToServer() {
        if (!this.currentQuiz) {
            throw new Error('Kein Quiz zum Speichern');
        }

        // Update quiz admin data from form
        this.saveQuizAdminData();

        const isNewQuiz = !this.currentQuiz.id || this.currentQuiz.id.length === 8; // New quizzes have 8-char IDs
        
        let savedQuiz;
        if (isNewQuiz) {
            savedQuiz = await this.cloudAPI.createQuiz(this.currentQuiz);
            console.log('✅ Quiz created in backend:', savedQuiz.id);
        } else {
            savedQuiz = await this.cloudAPI.updateQuiz(this.currentQuiz.id, this.currentQuiz);
            console.log('✅ Quiz updated in backend:', savedQuiz.id);
        }
        
        // Update local references
        this.currentQuiz = savedQuiz;
        
        // Update local list
        const existingIndex = this.quizzes.findIndex(q => q.id === savedQuiz.id);
        if (existingIndex >= 0) {
            this.quizzes[existingIndex] = savedQuiz;
        } else {
            this.quizzes.push(savedQuiz);
        }
        
        // Save to local cache
        localStorage.setItem('admin-quizzes', JSON.stringify(this.quizzes));
        
        return savedQuiz;
    }

    async saveQuizAdmin() {
        if (!this.currentQuiz) {
            this.app.showNotification('Kein Quiz zum Speichern', 'error');
            return;
        }

        this.saveQuizAdminData();

        if (!this.currentQuiz.title.trim()) {
            this.app.showNotification('Bitte geben Sie einen Quiz-Titel ein', 'warning');
            return;
        }

        this.app.showLoading('Speichere Quiz...');
        
        try {
            let savedQuiz;
            const isNewQuiz = !this.currentQuiz.id || this.currentQuiz.id.length === 8; // New quizzes have 8-char IDs
            
            if (isNewQuiz) {
                savedQuiz = await this.cloudAPI.createQuiz(this.currentQuiz);
                console.log('✅ Quiz created in backend:', savedQuiz.id);
            } else {
                savedQuiz = await this.cloudAPI.updateQuiz(this.currentQuiz.id, this.currentQuiz);
                console.log('✅ Quiz updated in backend:', savedQuiz.id);
            }
            
            // Update local list
            const existingIndex = this.quizzes.findIndex(q => q.id === this.currentQuiz.id);
            if (existingIndex >= 0) {
                this.quizzes[existingIndex] = savedQuiz;
            } else {
                this.quizzes.push(savedQuiz);
            }
            
            // Update current quiz
            this.currentQuiz = savedQuiz;
            
            localStorage.setItem('admin-quizzes', JSON.stringify(this.quizzes));
            
            this.app.hideLoading();
            this.app.showNotification('Quiz erfolgreich gespeichert', 'success');
            
            // Reset save button
            const saveBtn = document.getElementById('save-quiz-admin');
            if (saveBtn) {
                saveBtn.classList.remove('btn-warning');
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Gespeichert';
            }
            
            // Update form with saved data
            this.populateAdminForm();
            
        } catch (error) {
            console.error('Failed to save quiz:', error);
            
            // Fallback: save locally
            const existingIndex = this.quizzes.findIndex(q => q.id === this.currentQuiz.id);
            if (existingIndex >= 0) {
                this.quizzes[existingIndex] = this.currentQuiz;
            } else {
                this.quizzes.push(this.currentQuiz);
            }
            localStorage.setItem('admin-quizzes', JSON.stringify(this.quizzes));
            
            this.app.hideLoading();
            this.app.showNotification('Quiz lokal gespeichert (Backend nicht verfügbar)', 'warning');
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
