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
        this.currentQuestions = [];
        this.isAuthenticated = false;
        this.isEditing = false;
        this.draggedQuestion = null;
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

        // Quiz Editor Event Listeners
        this.setupQuizEditorListeners();

        // Password validation
        const registerPassword = document.getElementById('register-password');
        const confirmPassword = document.getElementById('confirm-password');
        
        confirmPassword?.addEventListener('input', () => {
            this.validatePasswordMatch();
        });
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
        const newQuiz = {
            id: 'quiz-' + Date.now(),
            title: 'Neues Quiz',
            description: '',
            questions: [],
            settings: {
                timePerQuestion: 30,
                maxParticipants: 50,
                category: 'general'
            },
            published: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.currentQuiz = newQuiz;
        this.currentQuestions = [];
        this.showQuizEditor();
    }

    editQuiz(quizId) {
        const quiz = this.quizzes.find(q => q.id === quizId);
        if (!quiz) {
            this.app.showNotification('Quiz nicht gefunden', 'error');
            return;
        }
        
        this.currentQuiz = { ...quiz };
        this.currentQuestions = [...(quiz.questions || [])];
        this.showQuizEditor();
    }

    showQuizList() {
        this.isEditing = false;
        this.currentQuiz = null;
        this.currentQuestions = [];
        
        document.getElementById('quiz-list-view').style.display = 'block';
        document.getElementById('quiz-editor-view').style.display = 'none';
    }

    showQuizEditor() {
        this.isEditing = true;
        
        document.getElementById('quiz-list-view').style.display = 'none';
        document.getElementById('quiz-editor-view').style.display = 'block';
        
        this.populateQuizEditor();
        this.renderQuestions();
    }

    populateQuizEditor() {
        if (!this.currentQuiz) return;
        
        // Populate quiz settings
        document.getElementById('quiz-title').value = this.currentQuiz.title || '';
        document.getElementById('quiz-description').value = this.currentQuiz.description || '';
        document.getElementById('time-per-question').value = this.currentQuiz.settings?.timePerQuestion || 30;
        document.getElementById('max-participants').value = this.currentQuiz.settings?.maxParticipants || 50;
        document.getElementById('quiz-category').value = this.currentQuiz.settings?.category || 'general';
        
        // Update publish button state
        const publishBtn = document.getElementById('publish-quiz');
        if (publishBtn) {
            publishBtn.textContent = this.currentQuiz.published ? 'Unveröffentlichen' : 'Veröffentlichen';
            publishBtn.innerHTML = this.currentQuiz.published 
                ? '<i class="fas fa-eye-slash"></i> Unveröffentlichen'
                : '<i class="fas fa-rocket"></i> Veröffentlichen';
        }
    }

    addNewQuestion() {
        const questionNumber = this.currentQuestions.length + 1;
        const newQuestion = {
            id: 'question-' + Date.now(),
            number: questionNumber,
            text: '',
            answers: [
                { id: 'a', text: '', correct: false },
                { id: 'b', text: '', correct: false },
                { id: 'c', text: '', correct: false },
                { id: 'd', text: '', correct: false }
            ],
            settings: {
                timeLimit: this.currentQuiz?.settings?.timePerQuestion || 30,
                points: 100
            }
        };
        
        this.currentQuestions.push(newQuestion);
        this.renderQuestions();
        this.updateQuestionCount();
        
        // Auto-expand the new question
        setTimeout(() => {
            const questionElement = document.querySelector(`[data-question-id="${newQuestion.id}"]`);
            if (questionElement && !questionElement.classList.contains('expanded')) {
                questionElement.querySelector('.question-header').click();
            }
            
            // Focus on question text input
            const questionInput = questionElement?.querySelector('.question-input');
            questionInput?.focus();
        }, 100);
        
        this.app.showNotification('Neue Frage hinzugefügt', 'success');
    }

    renderQuestions() {
        const container = document.getElementById('questions-container');
        if (!container) return;
        
        if (this.currentQuestions.length === 0) {
            container.innerHTML = `
                <div class="empty-questions">
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <i class="fas fa-question"></i>
                        </div>
                        <h3>Noch keine Fragen</h3>
                        <p>Fügen Sie Ihre erste Frage hinzu, um zu beginnen!</p>
                        <button class="btn btn-primary" onclick="document.getElementById('add-question').click()">
                            <i class="fas fa-plus"></i> Erste Frage hinzufügen
                        </button>
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.currentQuestions.map((question, index) => `
            <div class="question-item ${question.isNew ? 'new' : ''}" data-question-id="${question.id}">
                <div class="question-header" onclick="window.app.components.admin.toggleQuestion('${question.id}')">
                    <div class="question-title">
                        <span class="drag-handle" draggable="true">
                            <i class="fas fa-grip-vertical"></i>
                        </span>
                        <span class="question-number">${index + 1}</span>
                        <span class="question-preview">
                            ${question.text || 'Neue Frage...'}
                        </span>
                    </div>
                    <div class="question-actions">
                        <button class="answer-action-btn" onclick="event.stopPropagation(); window.app.components.admin.duplicateQuestion('${question.id}')" title="Frage duplizieren">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="answer-action-btn delete-btn" onclick="event.stopPropagation(); window.app.components.admin.deleteQuestion('${question.id}')" title="Frage löschen">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="question-toggle">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                </div>
                <div class="question-body">
                    ${this.renderQuestionForm(question, index)}
                </div>
            </div>
        `).join('');
        
        // Remove the 'new' class after animation
        setTimeout(() => {
            document.querySelectorAll('.question-item.new').forEach(el => {
                el.classList.remove('new');
            });
        }, 300);
        
        this.setupQuestionDragAndDrop();
    }

    renderQuestionForm(question, index) {
        return `
            <form class="question-form" onsubmit="return false;">
                <div class="question-text-group">
                    <label for="question-text-${question.id}">Fragetext *</label>
                    <textarea 
                        id="question-text-${question.id}" 
                        class="question-input" 
                        placeholder="Geben Sie hier Ihre Frage ein..."
                        maxlength="500"
                        onkeyup="window.app.components.admin.updateQuestionText('${question.id}', this.value)"
                    >${question.text}</textarea>
                    <div class="char-counter">
                        <span class="current">${question.text.length}</span>/<span class="max">500</span>
                    </div>
                </div>
                
                <div class="answers-section">
                    <div class="answers-header">
                        <h5>Antwortmöglichkeiten</h5>
                        <span class="text-sm text-muted">Klicken Sie auf eine Antwort, um sie als richtig zu markieren</span>
                    </div>
                    ${question.answers.map((answer, answerIndex) => `
                        <div class="answer-item ${answer.correct ? 'correct' : ''}" data-answer-id="${answer.id}">
                            <div class="answer-label-input" onclick="window.app.components.admin.toggleCorrectAnswer('${question.id}', '${answer.id}')">
                                ${String.fromCharCode(65 + answerIndex)}
                            </div>
                            <input 
                                type="text" 
                                class="answer-input" 
                                placeholder="Antworttext eingeben..."
                                value="${answer.text}"
                                onkeyup="window.app.components.admin.updateAnswerText('${question.id}', '${answer.id}', this.value)"
                            >
                            <div class="answer-actions">
                                <button type="button" class="answer-action-btn correct-btn" 
                                        onclick="window.app.components.admin.toggleCorrectAnswer('${question.id}', '${answer.id}')"
                                        title="Als richtige Antwort markieren">
                                    <i class="fas fa-check"></i>
                                </button>
                                ${question.answers.length > 2 ? `
                                    <button type="button" class="answer-action-btn delete-btn" 
                                            onclick="window.app.components.admin.deleteAnswer('${question.id}', '${answer.id}')"
                                            title="Antwort löschen">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                    ${question.answers.length < 6 ? `
                        <button type="button" class="add-answer-btn" onclick="window.app.components.admin.addAnswer('${question.id}')">
                            <i class="fas fa-plus"></i> Weitere Antwort hinzufügen
                        </button>
                    ` : ''}
                </div>
                
                <div class="question-settings">
                    <div class="form-group">
                        <label for="time-limit-${question.id}">Zeitlimit (Sekunden)</label>
                        <input 
                            type="number" 
                            id="time-limit-${question.id}" 
                            class="form-input" 
                            value="${question.settings?.timeLimit || 30}" 
                            min="5" 
                            max="300"
                            onchange="window.app.components.admin.updateQuestionTimeLimit('${question.id}', this.value)"
                        >
                    </div>
                    <div class="form-group">
                        <label for="points-${question.id}">Punkte</label>
                        <input 
                            type="number" 
                            id="points-${question.id}" 
                            class="form-input" 
                            value="${question.settings?.points || 100}" 
                            min="10" 
                            max="1000" 
                            step="10"
                            onchange="window.app.components.admin.updateQuestionPoints('${question.id}', this.value)"
                        >
                    </div>
                </div>
            </form>
        `;
    }

    // Question Management Methods
    toggleQuestion(questionId) {
        const questionElement = document.querySelector(`[data-question-id="${questionId}"]`);
        if (questionElement) {
            questionElement.classList.toggle('expanded');
        }
    }

    updateQuestionText(questionId, text) {
        const question = this.currentQuestions.find(q => q.id === questionId);
        if (question) {
            question.text = text;
            this.updateQuestionPreview(questionId, text);
            this.updateCharCounter(questionId, text);
            this.scheduleAutoSave();
        }
    }

    updateQuestionPreview(questionId, text) {
        const previewElement = document.querySelector(`[data-question-id="${questionId}"] .question-preview`);
        if (previewElement) {
            previewElement.textContent = text || 'Neue Frage...';
        }
    }

    updateCharCounter(questionId, text) {
        const counterElement = document.querySelector(`#question-text-${questionId}`).nextElementSibling?.querySelector('.current');
        if (counterElement) {
            counterElement.textContent = text.length;
            const counter = counterElement.closest('.char-counter');
            counter.classList.toggle('warning', text.length > 400);
            counter.classList.toggle('danger', text.length > 450);
        }
    }

    toggleCorrectAnswer(questionId, answerId) {
        const question = this.currentQuestions.find(q => q.id === questionId);
        if (question) {
            // Reset all answers to incorrect
            question.answers.forEach(answer => answer.correct = false);
            // Set the selected answer as correct
            const answer = question.answers.find(a => a.id === answerId);
            if (answer) {
                answer.correct = true;
            }
            
            // Update UI
            const questionElement = document.querySelector(`[data-question-id="${questionId}"]`);
            questionElement.querySelectorAll('.answer-item').forEach(item => {
                item.classList.remove('correct');
            });
            questionElement.querySelector(`[data-answer-id="${answerId}"]`).classList.add('correct');
            
            this.scheduleAutoSave();
        }
    }

    updateAnswerText(questionId, answerId, text) {
        const question = this.currentQuestions.find(q => q.id === questionId);
        if (question) {
            const answer = question.answers.find(a => a.id === answerId);
            if (answer) {
                answer.text = text;
                this.scheduleAutoSave();
            }
        }
    }

    addAnswer(questionId) {
        const question = this.currentQuestions.find(q => q.id === questionId);
        if (question && question.answers.length < 6) {
            const nextLetter = String.fromCharCode(65 + question.answers.length);
            const newAnswer = {
                id: nextLetter.toLowerCase(),
                text: '',
                correct: false
            };
            question.answers.push(newAnswer);
            this.renderQuestions();
            this.scheduleAutoSave();
        }
    }

    deleteAnswer(questionId, answerId) {
        const question = this.currentQuestions.find(q => q.id === questionId);
        if (question && question.answers.length > 2) {
            question.answers = question.answers.filter(a => a.id !== answerId);
            // Reassign IDs
            question.answers.forEach((answer, index) => {
                answer.id = String.fromCharCode(97 + index); // a, b, c, d, e, f
            });
            this.renderQuestions();
            this.scheduleAutoSave();
        }
    }

    duplicateQuestion(questionId) {
        const question = this.currentQuestions.find(q => q.id === questionId);
        if (question) {
            const duplicatedQuestion = {
                ...question,
                id: 'question-' + Date.now(),
                number: this.currentQuestions.length + 1,
                text: question.text + ' (Kopie)'
            };
            this.currentQuestions.push(duplicatedQuestion);
            this.renderQuestions();
            this.updateQuestionCount();
            this.app.showNotification('Frage dupliziert', 'success');
        }
    }

    deleteQuestion(questionId) {
        if (confirm('Diese Frage wirklich löschen?')) {
            this.currentQuestions = this.currentQuestions.filter(q => q.id !== questionId);
            // Renumber questions
            this.currentQuestions.forEach((question, index) => {
                question.number = index + 1;
            });
            this.renderQuestions();
            this.updateQuestionCount();
            this.app.showNotification('Frage gelöscht', 'success');
        }
    }

    updateQuestionTimeLimit(questionId, timeLimit) {
        const question = this.currentQuestions.find(q => q.id === questionId);
        if (question) {
            question.settings = question.settings || {};
            question.settings.timeLimit = parseInt(timeLimit);
            this.scheduleAutoSave();
        }
    }

    updateQuestionPoints(questionId, points) {
        const question = this.currentQuestions.find(q => q.id === questionId);
        if (question) {
            question.settings = question.settings || {};
            question.settings.points = parseInt(points);
            this.scheduleAutoSave();
        }
    }

    updateQuestionCount() {
        const counterElement = document.getElementById('question-count');
        if (counterElement) {
            counterElement.textContent = `(${this.currentQuestions.length})`;
        }
    }

    updateQuizTitle() {
        const titleInput = document.getElementById('quiz-title');
        if (titleInput && this.currentQuiz) {
            this.currentQuiz.title = titleInput.value;
            this.scheduleAutoSave();
        }
    }

    // Auto-save functionality
    scheduleAutoSave() {
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
            this.autoSave();
        }, 2000); // Auto-save after 2 seconds of inactivity
    }

    async autoSave() {
        if (!this.currentQuiz || !this.isEditing) return;
        
        try {
            // Update quiz data
            this.currentQuiz.questions = this.currentQuestions;
            this.currentQuiz.description = document.getElementById('quiz-description')?.value || '';
            this.currentQuiz.settings = {
                timePerQuestion: parseInt(document.getElementById('time-per-question')?.value) || 30,
                maxParticipants: parseInt(document.getElementById('max-participants')?.value) || 50,
                category: document.getElementById('quiz-category')?.value || 'general'
            };
            this.currentQuiz.updatedAt = new Date().toISOString();
            
            // Show auto-save indicator
            this.showAutoSaveIndicator();
            
        } catch (error) {
            console.warn('Auto-save failed:', error);
        }
    }

    showAutoSaveIndicator() {
        // Create temporary save indicator
        const indicator = document.createElement('div');
        indicator.textContent = 'Automatisch gespeichert';
        indicator.className = 'auto-save-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: var(--success-color);
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(indicator);
        setTimeout(() => indicator.style.opacity = '1', 10);
        setTimeout(() => {
            indicator.style.opacity = '0';
            setTimeout(() => indicator.remove(), 300);
        }, 2000);
    }

    async saveCurrentQuiz() {
        if (!this.currentQuiz) return;
        
        // Validate quiz
        const validation = this.validateQuiz();
        if (!validation.isValid) {
            this.app.showNotification(`Speichern nicht möglich: ${validation.errors[0]}`, 'error');
            return;
        }
        
        this.app.showLoading('Speichere Quiz...');
        
        try {
            // Update quiz data
            await this.autoSave();
            
            // Save to API or local storage
            const existingIndex = this.quizzes.findIndex(q => q.id === this.currentQuiz.id);
            if (existingIndex >= 0) {
                this.quizzes[existingIndex] = { ...this.currentQuiz };
            } else {
                this.quizzes.unshift({ ...this.currentQuiz });
            }
            
            this.app.hideLoading();
            this.app.showNotification('Quiz erfolgreich gespeichert!', 'success');
            
        } catch (error) {
            this.app.hideLoading();
            this.app.showNotification(`Fehler beim Speichern: ${error.message}`, 'error');
        }
    }

    validateQuiz() {
        const errors = [];
        
        if (!this.currentQuiz.title || this.currentQuiz.title.trim().length < 3) {
            errors.push('Quiz-Titel muss mindestens 3 Zeichen lang sein');
        }
        
        if (this.currentQuestions.length === 0) {
            errors.push('Quiz muss mindestens eine Frage enthalten');
        }
        
        this.currentQuestions.forEach((question, index) => {
            if (!question.text || question.text.trim().length < 5) {
                errors.push(`Frage ${index + 1}: Fragetext muss mindestens 5 Zeichen lang sein`);
            }
            
            const hasCorrectAnswer = question.answers.some(a => a.correct);
            if (!hasCorrectAnswer) {
                errors.push(`Frage ${index + 1}: Eine richtige Antwort muss markiert werden`);
            }
            
            const validAnswers = question.answers.filter(a => a.text && a.text.trim().length > 0);
            if (validAnswers.length < 2) {
                errors.push(`Frage ${index + 1}: Mindestens 2 Antworten müssen ausgefüllt werden`);
            }
        });
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    async publishQuiz() {
        if (!this.currentQuiz) return;
        
        const validation = this.validateQuiz();
        if (!validation.isValid) {
            this.app.showNotification(`Veröffentlichung nicht möglich: ${validation.errors[0]}`, 'error');
            return;
        }
        
        const action = this.currentQuiz.published ? 'unveröffentlichen' : 'veröffentlichen';
        if (!confirm(`Quiz wirklich ${action}?`)) {
            return;
        }
        
        this.app.showLoading(this.currentQuiz.published ? 'Unveröffentliche...' : 'Veröffentliche...');
        
        try {
            this.currentQuiz.published = !this.currentQuiz.published;
            await this.saveCurrentQuiz();
            
            this.populateQuizEditor(); // Update UI
            this.app.hideLoading();
            
            const message = this.currentQuiz.published 
                ? 'Quiz erfolgreich veröffentlicht!' 
                : 'Quiz unveröffentlicht';
            this.app.showNotification(message, 'success');
            
        } catch (error) {
            this.app.hideLoading();
            this.app.showNotification(`Fehler: ${error.message}`, 'error');
        }
    }

    previewQuiz() {
        if (this.currentQuestions.length === 0) {
            this.app.showNotification('Quiz hat noch keine Fragen zum Anzeigen', 'warning');
            return;
        }
        
        this.showQuizPreview();
    }

    showQuizPreview() {
        const modal = document.createElement('div');
        modal.className = 'quiz-preview-modal';
        modal.innerHTML = `
            <div class="quiz-preview-content">
                <div class="quiz-preview-header">
                    <h3>${this.currentQuiz.title}</h3>
                    <button class="btn btn-secondary" onclick="this.closest('.quiz-preview-modal').remove()">
                        <i class="fas fa-times"></i> Schließen
                    </button>
                </div>
                <div class="quiz-preview-body">
                    ${this.currentQuestions.map((question, index) => `
                        <div class="quiz-preview-question">
                            <h4>Frage ${index + 1}: ${question.text}</h4>
                            <div class="quiz-preview-answers">
                                ${question.answers.map((answer, answerIndex) => `
                                    <div class="quiz-preview-answer ${answer.correct ? 'correct' : ''}">
                                        <span class="answer-letter">${String.fromCharCode(65 + answerIndex)}</span>
                                        <span>${answer.text}</span>
                                        ${answer.correct ? '<i class="fas fa-check" style="margin-left: auto;"></i>' : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
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
