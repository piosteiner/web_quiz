// Quiz Admin Management System with User Authentication
import CloudAPIService from './cloud-api.js';
import LiveQuizManager from './live-quiz-manager.js';

class QuizAdmin {
    constructor() {
        this.quizzes = [];
        this.currentQuiz = null;
        this.currentUser = null;
        this.questionCounter = 0;
        this.participantCounter = 0;
        this.participants = [];
        this.cloudAPI = new CloudAPIService();
        this.liveQuizManager = new LiveQuizManager();
        this.syncStatus = 'offline';
        
        this.init();
    }

    async init() {
        // Check if user is already logged in
        await this.checkAuthStatus();
        
        if (this.currentUser) {
            this.showAdminPanel();
        } else {
            this.showLoginSection();
        }
        
        this.setupEventListeners();
    }

    async checkAuthStatus() {
        const token = localStorage.getItem('quiz_auth_token');
        const rememberedUser = localStorage.getItem('quiz_user_data');
        
        if (token && rememberedUser) {
            try {
                this.currentUser = JSON.parse(rememberedUser);
                // Validate token by making a test request
                await this.validateToken(token);
                return true;
            } catch (error) {
                console.log('Token validation failed:', error);
                this.logout(false);
                return false;
            }
        }
        return false;
    }

    async validateToken(token) {
        // In a real implementation, this would validate with the backend
        // For now, we'll simulate it with local storage
        const users = JSON.parse(localStorage.getItem('quiz_users') || '[]');
        const user = users.find(u => u.token === token);
        
        if (!user) {
            throw new Error('Invalid token');
        }
        
        return user;
    }

    showLoginSection() {
        document.getElementById('login-section').style.display = 'flex';
        document.querySelector('.admin-main').style.display = 'none';
        document.querySelector('header').style.display = 'none';
    }

    showAdminPanel() {
        document.getElementById('login-section').style.display = 'none';
        document.querySelector('.admin-main').style.display = 'block';
        document.querySelector('header').style.display = 'block';
        
        this.loadDashboard();
        this.setupCloudSync();
        this.loadQuizzesFromCloud();
        this.updateStats();
        this.renderQuizGrid();
        this.renderRecentActivity();
        this.setupLiveQuizHandlers();
        this.updateUserInfo();
    }

    updateUserInfo() {
        if (this.currentUser) {
            document.getElementById('user-display-name').textContent = 
                this.currentUser.displayName || this.currentUser.username;
            
            const userQuizzes = this.quizzes.filter(q => q.createdBy === this.currentUser.id);
            const totalParticipants = userQuizzes.reduce((sum, quiz) => sum + (quiz.participantCount || 0), 0);
            
            document.getElementById('user-stats').textContent = 
                `${userQuizzes.length} Quizzes • ${totalParticipants} Teilnehmer`;
        }
    }

    setupEventListeners() {
        // Auth tab switching - use event delegation for better reliability
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('auth-tab')) {
                this.switchAuthTab(e.target.dataset.tab);
            }
        });

        // Auth forms
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // User actions
        const logoutBtn = document.getElementById('logout-btn');
        const profileBtn = document.getElementById('user-profile-btn');
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                this.showProfileModal();
            });
        }

        // Password strength indicator
        const registerPassword = document.getElementById('register-password');
        if (registerPassword) {
            registerPassword.addEventListener('input', (e) => {
                this.updatePasswordStrength(e.target.value);
            });
        }

        // Confirm password validation
        const confirmPassword = document.getElementById('register-confirm-password');
        if (confirmPassword) {
            confirmPassword.addEventListener('input', (e) => {
                this.validatePasswordMatch();
            });
        }

        // Navigation and other existing event listeners
        this.setupExistingEventListeners();
    }

    setupExistingEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-links a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = link.getAttribute('href').substring(1);
                this.showSection(sectionId);
            });
        });

        // Quiz form
        document.getElementById('add-question-btn')?.addEventListener('click', () => {
            this.addQuestion();
        });

        // Participant management
        document.getElementById('add-participant-btn')?.addEventListener('click', () => {
            this.showAddParticipantModal();
        });

        document.getElementById('allow-open-registration')?.addEventListener('change', (e) => {
            this.toggleParticipantSection(e.target.checked);
        });

        // Quiz name validation
        document.getElementById('quiz-name')?.addEventListener('input', (e) => {
            this.validateQuizName(e.target.value);
        });

        document.getElementById('save-draft-btn')?.addEventListener('click', () => {
            this.saveQuiz('draft');
        });

        document.getElementById('publish-quiz-btn')?.addEventListener('click', () => {
            this.saveQuiz('published');
        });

        // Quiz filters
        document.getElementById('quiz-filter')?.addEventListener('change', () => {
            this.filterQuizzes();
        });

        document.getElementById('quiz-search')?.addEventListener('input', () => {
            this.filterQuizzes();
        });

        // Modal events
        document.querySelectorAll('.modal-close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                this.closeModal();
            });
        });

        // Copy buttons
        document.querySelector('.copy-link')?.addEventListener('click', () => {
            this.copyToClipboard('quiz-link');
        });

        document.querySelector('.copy-embed')?.addEventListener('click', () => {
            this.copyToClipboard('embed-code');
        });

        // Live Quiz handlers
        this.setupLiveQuizHandlers();
    }

    switchAuthTab(tab) {
        // Update tab buttons with null check
        document.querySelectorAll('.auth-tab').forEach(t => {
            t.classList.remove('active');
            // Add visual feedback
            t.style.transform = 'scale(0.98)';
            setTimeout(() => {
                t.style.transform = '';
            }, 100);
        });
        
        const activeTab = document.querySelector(`[data-tab="${tab}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        // Update forms
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        const activeForm = document.getElementById(`${tab}-form`);
        if (activeForm) {
            activeForm.classList.add('active');
        }
        
        // Clear messages using showAuthMessage
        this.showAuthMessage('login', '', 'clear');
        this.showAuthMessage('register', '', 'clear');
        
        // Focus first input of active form
        setTimeout(() => {
            const firstInput = activeForm?.querySelector('input[type="text"], input[type="email"]');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }

    async handleLogin() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('remember-me').checked;
        
        // Clear previous messages
        this.showAuthMessage('login', '', 'clear');
        
        if (!username || !password) {
            this.showAuthMessage('login', 'Bitte geben Sie Benutzername und Passwort ein', 'error');
            return;
        }

        // Show loading state
        const loginBtn = document.querySelector('#login-form button[type="submit"]');
        const originalText = loginBtn.textContent;
        loginBtn.textContent = 'Anmelden...';
        loginBtn.disabled = true;

        try {
            const user = await this.authenticateUser(username, password);
            
            if (user) {
                this.currentUser = user;
                
                // Generate session token
                const token = this.generateToken();
                user.token = token;
                user.lastLogin = new Date().toISOString();
                
                // Save user data
                this.updateUserInStorage(user);
                
                if (rememberMe) {
                    localStorage.setItem('quiz_auth_token', token);
                    localStorage.setItem('quiz_user_data', JSON.stringify(user));
                } else {
                    sessionStorage.setItem('quiz_auth_token', token);
                    sessionStorage.setItem('quiz_user_data', JSON.stringify(user));
                }
                
                this.showAuthMessage('login', '✅ Anmeldung erfolgreich!', 'success');
                setTimeout(() => this.showAdminPanel(), 1500);
            } else {
                this.showAuthMessage('login', '❌ Ungültiger Benutzername oder Passwort', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showAuthMessage('login', '❌ Fehler bei der Anmeldung: ' + error.message, 'error');
        } finally {
            // Reset button state
            loginBtn.textContent = originalText;
            loginBtn.disabled = false;
        }
    }

    async handleRegister() {
        const username = document.getElementById('register-username').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        const displayName = document.getElementById('register-display-name').value.trim();
        
        // Clear previous messages
        this.showAuthMessage('register', '', 'clear');
        
        // Validation
        if (!username || !email || !password) {
            this.showAuthMessage('register', '❌ Bitte füllen Sie alle Pflichtfelder aus', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showAuthMessage('register', '❌ Passwort muss mindestens 6 Zeichen lang sein', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showAuthMessage('register', '❌ Passwörter stimmen nicht überein', 'error');
            return;
        }
        
        if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
            this.showAuthMessage('register', '❌ Benutzername: 3-20 Zeichen, nur Buchstaben, Zahlen, _ und -', 'error');
            return;
        }

        // Show loading state
        const registerBtn = document.querySelector('#register-form button[type="submit"]');
        const originalText = registerBtn.textContent;
        registerBtn.textContent = 'Registrierung...';
        registerBtn.disabled = true;

        try {
            const users = JSON.parse(localStorage.getItem('quiz_users') || '[]');
            
            // Check if username or email already exists
            if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
                this.showAuthMessage('register', '❌ Benutzername bereits vergeben', 'error');
                return;
            }
            
            if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
                this.showAuthMessage('register', '❌ E-Mail bereits registriert', 'error');
                return;
            }
            
            // Create new user
            const newUser = {
                id: Date.now() + Math.random(),
                username: username,
                email: email,
                password: this.hashPassword(password), // In production, use proper hashing
                displayName: displayName || username,
                createdAt: new Date().toISOString(),
                lastLogin: null,
                isActive: true
            };
            
            users.push(newUser);
            localStorage.setItem('quiz_users', JSON.stringify(users));
            
            this.showAuthMessage('register', '✅ Konto erfolgreich erstellt! Sie können sich jetzt anmelden.', 'success');
            
            // Auto-switch to login tab
            setTimeout(() => {
                this.switchAuthTab('login');
                document.getElementById('login-username').value = username;
                document.getElementById('login-username').focus();
            }, 2000);
            
        } catch (error) {
            console.error('Registration error:', error);
            this.showAuthMessage('register', '❌ Fehler bei der Registrierung: ' + error.message, 'error');
        } finally {
            // Reset button state
            registerBtn.textContent = originalText;
            registerBtn.disabled = false;
        }
    }

    async authenticateUser(username, password) {
        const users = JSON.parse(localStorage.getItem('quiz_users') || '[]');
        const user = users.find(u => 
            u.username.toLowerCase() === username.toLowerCase() && 
            u.password === this.hashPassword(password) &&
            u.isActive
        );
        
        return user || null;
    }

    hashPassword(password) {
        // Simple hash for demo - in production, use proper hashing with salt
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    generateToken() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    updateUserInStorage(user) {
        const users = JSON.parse(localStorage.getItem('quiz_users') || '[]');
        const index = users.findIndex(u => u.id === user.id);
        if (index !== -1) {
            users[index] = user;
            localStorage.setItem('quiz_users', JSON.stringify(users));
        }
    }

    logout(showMessage = true) {
        this.currentUser = null;
        localStorage.removeItem('quiz_auth_token');
        localStorage.removeItem('quiz_user_data');
        sessionStorage.removeItem('quiz_auth_token');
        sessionStorage.removeItem('quiz_user_data');
        
        if (showMessage) {
            this.showNotification('Erfolgreich abgemeldet', 'success');
        }
        
        setTimeout(() => this.showLoginSection(), 500);
    }

    showAuthMessage(formType, message, type) {
        const messageEl = document.getElementById(`${formType}-message`);
        if (!messageEl) return;
        
        if (type === 'clear') {
            messageEl.style.display = 'none';
            messageEl.textContent = '';
            messageEl.className = 'auth-message';
            return;
        }
        
        messageEl.textContent = message;
        messageEl.className = `auth-message ${type}`;
        messageEl.style.display = 'block';
        
        // Add animation
        messageEl.style.opacity = '0';
        messageEl.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            messageEl.style.transition = 'all 0.3s ease';
            messageEl.style.opacity = '1';
            messageEl.style.transform = 'translateY(0)';
        }, 10);
        
        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                if (messageEl.style.display !== 'none') {
                    messageEl.style.opacity = '0';
                    setTimeout(() => {
                        messageEl.style.display = 'none';
                    }, 300);
                }
            }, 4000);
        }
    }

    updatePasswordStrength(password) {
        const strengthBar = document.querySelector('.password-strength-bar');
        if (!strengthBar) return;
        
        let strength = 0;
        
        if (password.length >= 6) strength += 1;
        if (password.length >= 8) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;
        
        strengthBar.className = 'password-strength-bar';
        
        if (strength <= 2) {
            strengthBar.classList.add('weak');
        } else if (strength <= 3) {
            strengthBar.classList.add('medium');
        } else {
            strengthBar.classList.add('strong');
        }
    }

    validatePasswordMatch() {
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        const confirmInput = document.getElementById('register-confirm-password');
        
        if (confirmPassword && password !== confirmPassword) {
            confirmInput.setCustomValidity('Passwörter stimmen nicht überein');
            confirmInput.style.borderColor = 'var(--danger)';
        } else {
            confirmInput.setCustomValidity('');
            confirmInput.style.borderColor = '';
        }
    }

    showProfileModal() {
        const modal = document.createElement('div');
        modal.className = 'modal active profile-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Benutzerprofil</h2>
                    <span class="close modal-close">&times;</span>
                </div>
                <form class="profile-form" id="profile-form">
                    <div class="form-group">
                        <label for="profile-username">Benutzername</label>
                        <input type="text" id="profile-username" value="${this.currentUser.username}" readonly>
                        <small class="help-text">Benutzername kann nicht geändert werden</small>
                    </div>
                    <div class="form-group">
                        <label for="profile-email">E-Mail</label>
                        <input type="email" id="profile-email" value="${this.currentUser.email}" required>
                    </div>
                    <div class="form-group">
                        <label for="profile-display-name">Anzeigename</label>
                        <input type="text" id="profile-display-name" value="${this.currentUser.displayName || ''}" 
                               placeholder="Ihr Name">
                    </div>
                    <div class="form-group">
                        <label for="profile-new-password">Neues Passwort</label>
                        <input type="password" id="profile-new-password" minlength="6" 
                               placeholder="Leer lassen, um beizubehalten">
                        <div class="password-strength">
                            <div class="password-strength-bar"></div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="profile-confirm-password">Neues Passwort bestätigen</label>
                        <input type="password" id="profile-confirm-password" 
                               placeholder="Nur bei Passwort-Änderung">
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary modal-close">Abbrechen</button>
                        <button type="submit" class="btn btn-primary">Speichern</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('#profile-form').onsubmit = (e) => {
            e.preventDefault();
            this.updateProfile();
            document.body.removeChild(modal);
        };

        modal.querySelector('#profile-new-password').oninput = (e) => {
            this.updatePasswordStrength(e.target.value);
        };
    }

    updateProfile() {
        const email = document.getElementById('profile-email').value.trim();
        const displayName = document.getElementById('profile-display-name').value.trim();
        const newPassword = document.getElementById('profile-new-password').value;
        const confirmPassword = document.getElementById('profile-confirm-password').value;

        if (!email) {
            this.showNotification('E-Mail ist erforderlich', 'error');
            return;
        }

        if (newPassword && newPassword.length < 6) {
            this.showNotification('Neues Passwort muss mindestens 6 Zeichen lang sein', 'error');
            return;
        }

        if (newPassword && newPassword !== confirmPassword) {
            this.showNotification('Passwörter stimmen nicht überein', 'error');
            return;
        }

        // Update user data
        this.currentUser.email = email;
        this.currentUser.displayName = displayName;
        
        if (newPassword) {
            this.currentUser.password = this.hashPassword(newPassword);
        }

        this.updateUserInStorage(this.currentUser);
        
        // Update session data
        const token = localStorage.getItem('quiz_auth_token') || sessionStorage.getItem('quiz_auth_token');
        if (token) {
            localStorage.setItem('quiz_user_data', JSON.stringify(this.currentUser));
            sessionStorage.setItem('quiz_user_data', JSON.stringify(this.currentUser));
        }

        this.updateUserInfo();
        this.showNotification('Profil erfolgreich aktualisiert', 'success');
    }

    async setupCloudSync() {
        // Check if user is authenticated
        const authToken = localStorage.getItem('quiz_auth_token');
        if (!authToken) {
            this.showAuthModal();
            return;
        }

        try {
            // Test connection to cloud server
            await this.cloudAPI.getQuizzes();
            this.syncStatus = 'online';
            this.showSyncStatus('online');
        } catch (error) {
            console.warn('Cloud sync nicht verfügbar, arbeite offline:', error);
            this.syncStatus = 'offline';
            this.showSyncStatus('offline');
            // Fall back to local storage
            this.quizzes = JSON.parse(localStorage.getItem('quizzes')) || [];
        }
    }

    async loadQuizzesFromCloud() {
        try {
            if (this.syncStatus === 'online') {
                this.quizzes = await this.cloudAPI.getQuizzes();
                // Sync with local storage as backup
                localStorage.setItem('quizzes', JSON.stringify(this.quizzes));
            } else {
                this.quizzes = JSON.parse(localStorage.getItem('quizzes')) || [];
            }
        } catch (error) {
            console.warn('Fehler beim Laden der Quiz aus der Cloud:', error);
            this.quizzes = JSON.parse(localStorage.getItem('quizzes')) || [];
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-links a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = link.getAttribute('href').substring(1);
                this.showSection(sectionId);
            });
        });

        // Quiz form
        document.getElementById('add-question-btn').addEventListener('click', () => {
            this.addQuestion();
        });

        // Participant management
        document.getElementById('add-participant-btn').addEventListener('click', () => {
            this.showAddParticipantModal();
        });

        document.getElementById('allow-open-registration').addEventListener('change', (e) => {
            this.toggleParticipantSection(e.target.checked);
        });

        // Quiz name validation
        document.getElementById('quiz-name').addEventListener('input', (e) => {
            this.validateQuizName(e.target.value);
        });

        document.getElementById('save-draft-btn').addEventListener('click', () => {
            this.saveQuiz('draft');
        });

        document.getElementById('publish-quiz-btn').addEventListener('click', () => {
            this.saveQuiz('published');
        });

        // Quiz filters
        document.getElementById('quiz-filter').addEventListener('change', () => {
            this.filterQuizzes();
        });

        document.getElementById('quiz-search').addEventListener('input', () => {
            this.filterQuizzes();
        });

        // Modal events
        document.querySelectorAll('.modal-close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                this.closeModal();
            });
        });

        // Copy buttons
        document.querySelector('.copy-link').addEventListener('click', () => {
            this.copyToClipboard('quiz-link');
        });

        document.querySelector('.copy-embed').addEventListener('click', () => {
            this.copyToClipboard('embed-code');
        });

        // Live Quiz handlers
        this.setupLiveQuizHandlers();
    }

    setupLiveQuizHandlers() {
        // Event delegation for dynamically created live quiz buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('start-live-btn')) {
                const quizId = e.target.dataset.quizId;
                this.showLiveQuizModal(quizId);
            }
        });
    }

    async showLiveQuizModal(quizId) {
        const quiz = this.quizzes.find(q => q.id === quizId);
        if (!quiz) return;

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close modal-close">&times;</span>
                <h2>Live Quiz starten</h2>
                <div class="live-quiz-config">
                    <h3>${quiz.title}</h3>
                    <div class="form-group">
                        <label for="sessionName">Session Name:</label>
                        <input type="text" id="sessionName" value="${quiz.title} - Live Session" required>
                    </div>
                    <div class="form-group">
                        <label for="timePerQuestion">Zeit pro Frage (Sekunden):</label>
                        <input type="number" id="timePerQuestion" value="30" min="10" max="300" required>
                    </div>
                    <div class="form-group">
                        <label for="maxParticipants">Max. Teilnehmer:</label>
                        <input type="number" id="maxParticipants" value="50" min="1" max="1000" required>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="showLeaderboard" checked>
                            Live Bestenliste anzeigen
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="allowRejoining" checked>
                            Wiedereintreten erlauben
                        </label>
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" id="cancelLive">Abbrechen</button>
                    <button type="button" class="btn btn-primary" id="startLiveSession">Session starten</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event Listeners for modal
        const cancelBtn = modal.querySelector('#cancelLive');
        const startBtn = modal.querySelector('#startLiveSession');

        cancelBtn.onclick = () => document.body.removeChild(modal);
        
        startBtn.onclick = async () => {
            await this.startLiveSession(quizId, {
                sessionName: document.getElementById('sessionName').value,
                timePerQuestion: parseInt(document.getElementById('timePerQuestion').value),
                maxParticipants: parseInt(document.getElementById('maxParticipants').value),
                showLeaderboard: document.getElementById('showLeaderboard').checked,
                allowRejoining: document.getElementById('allowRejoining').checked
            });
            document.body.removeChild(modal);
        };
    }

    async startLiveSession(quizId, config) {
        try {
            const sessionId = await this.liveQuizManager.createSession(quizId, config);
            this.showNotification(`Live Session gestartet! Session ID: ${sessionId}`, 'success');
            
            // Öffne Live Quiz Control Panel
            this.openLiveQuizControl(sessionId);
        } catch (error) {
            console.error('Fehler beim Starten der Live Session:', error);
            this.showNotification('Fehler beim Starten der Live Session: ' + error.message, 'error');
        }
    }

    openLiveQuizControl(sessionId) {
        const controlUrl = `live-control.html?session=${sessionId}`;
        window.open(controlUrl, '_blank', 'width=1200,height=800');
    }

    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        document.getElementById(sectionId).classList.add('active');

        // Update URL without page reload
        window.history.pushState({}, '', `#${sectionId}`);
    }

    loadDashboard() {
        // Load initial section based on URL hash
        const hash = window.location.hash.substring(1);
        if (hash && document.getElementById(hash)) {
            this.showSection(hash);
        } else {
            this.showSection('dashboard');
        }
    }

    addQuestion() {
        this.questionCounter++;
        const template = document.getElementById('question-template');
        const questionElement = template.content.cloneNode(true);
        
        // Set question number
        questionElement.querySelector('.question-number').textContent = this.questionCounter;
        
        // Setup question type change listener
        const questionType = questionElement.querySelector('.question-type');
        const answersContainer = questionElement.querySelector('.answers-container');
        
        questionType.addEventListener('change', () => {
            this.updateAnswerOptions(answersContainer, questionType.value);
        });

        // Setup remove button
        questionElement.querySelector('.remove-question').addEventListener('click', (e) => {
            e.target.closest('.question-card').remove();
            this.renumberQuestions();
        });

        // Add initial answer options
        this.updateAnswerOptions(answersContainer, 'multiple-choice');
        
        // Append to container
        document.getElementById('questions-container').appendChild(questionElement);
    }

    updateAnswerOptions(container, type) {
        container.innerHTML = '';
        
        switch (type) {
            case 'multiple-choice':
                for (let i = 0; i < 4; i++) {
                    const answerDiv = document.createElement('div');
                    answerDiv.className = 'answer-option';
                    answerDiv.innerHTML = `
                        <input type="radio" name="correct-${this.questionCounter}" value="${i}">
                        <input type="text" placeholder="Antwortmöglichkeit ${i + 1}" required>
                        <button type="button" class="btn-icon remove-answer">🗑️</button>
                    `;
                    
                    // Add event listener for remove button
                    answerDiv.querySelector('.remove-answer').addEventListener('click', () => {
                        if (container.children.length > 2) {
                            answerDiv.remove();
                        }
                    });
                    
                    container.appendChild(answerDiv);
                }
                
                // Add button to add more options
                const addOptionBtn = document.createElement('button');
                addOptionBtn.type = 'button';
                addOptionBtn.className = 'btn btn-outline btn-sm';
                addOptionBtn.innerHTML = '➕ Option hinzufügen';
                addOptionBtn.addEventListener('click', () => {
                    const optionCount = container.querySelectorAll('.answer-option').length;
                    const answerDiv = document.createElement('div');
                    answerDiv.className = 'answer-option';
                    answerDiv.innerHTML = `
                        <input type="radio" name="correct-${this.questionCounter}" value="${optionCount}">
                        <input type="text" placeholder="Antwortmöglichkeit ${optionCount + 1}" required>
                        <button type="button" class="btn-icon remove-answer">🗑️</button>
                    `;
                    
                    answerDiv.querySelector('.remove-answer').addEventListener('click', () => {
                        if (container.querySelectorAll('.answer-option').length > 2) {
                            answerDiv.remove();
                        }
                    });
                    
                    container.insertBefore(answerDiv, addOptionBtn);
                });
                container.appendChild(addOptionBtn);
                break;
                
            case 'true-false':
                const trueFalseOptions = ['Wahr', 'Falsch'];
                trueFalseOptions.forEach((option, index) => {
                    const answerDiv = document.createElement('div');
                    answerDiv.className = 'answer-option';
                    answerDiv.innerHTML = `
                        <input type="radio" name="correct-${this.questionCounter}" value="${index}" ${index === 0 ? 'checked' : ''}>
                        <span>${option}</span>
                    `;
                    container.appendChild(answerDiv);
                });
                break;
                
            case 'short-answer':
                const answerDiv = document.createElement('div');
                answerDiv.className = 'answer-option';
                answerDiv.innerHTML = `
                    <label>Richtige Antwort:</label>
                    <input type="text" placeholder="Geben Sie die richtige Antwort ein" required>
                `;
                container.appendChild(answerDiv);
                break;
        }
    }

    renumberQuestions() {
        const questions = document.querySelectorAll('.question-card');
        questions.forEach((question, index) => {
            question.querySelector('.question-number').textContent = index + 1;
        });
        this.questionCounter = questions.length;
    }

    async saveQuiz(status) {
        if (!this.currentUser) {
            this.showNotification('Bitte melden Sie sich an, um Quizzes zu speichern', 'error');
            return;
        }

        const formData = new FormData(document.getElementById('quiz-form'));
        const quiz = {
            id: this.currentQuiz ? this.currentQuiz.id : Date.now(),
            title: formData.get('title'),
            quizName: formData.get('quizName'),
            description: formData.get('description'),
            category: formData.get('category'),
            difficulty: formData.get('difficulty'),
            timeLimit: parseInt(formData.get('timeLimit')),
            shuffleQuestions: formData.has('shuffleQuestions'),
            allowOpenRegistration: formData.has('allowOpenRegistration'),
            status: status,
            questions: this.getQuestionsData(),
            participants: this.getParticipantsData(),
            createdBy: this.currentUser.id,
            createdByUsername: this.currentUser.username,
            createdAt: this.currentQuiz ? this.currentQuiz.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            participantCount: this.currentQuiz ? this.currentQuiz.participantCount : 0,
            averageScore: this.currentQuiz ? this.currentQuiz.averageScore : 0
        };

        // Validation
        if (!quiz.title.trim()) {
            this.showNotification('Bitte geben Sie einen Quiz-Titel ein', 'error');
            return;
        }

        if (!quiz.quizName.trim()) {
            this.showNotification('Bitte geben Sie einen Quiz-Namen ein', 'error');
            return;
        }

        // Validate quiz name format
        if (!/^[a-zA-Z0-9-_]+$/.test(quiz.quizName)) {
            this.showNotification('Quiz-Name darf nur Buchstaben, Zahlen, Bindestriche und Unterstriche enthalten', 'error');
            return;
        }

        // Check for duplicate quiz names (only for current user)
        const existingQuiz = this.quizzes.find(q => 
            q.quizName === quiz.quizName && 
            q.id !== quiz.id && 
            q.createdBy === this.currentUser.id
        );
        if (existingQuiz) {
            this.showNotification('Sie haben bereits ein Quiz mit diesem Namen', 'error');
            return;
        }

        if (quiz.questions.length === 0) {
            this.showNotification('Bitte fügen Sie mindestens eine Frage hinzu', 'error');
            return;
        }

        try {
            // Save to cloud if online
            if (this.syncStatus === 'online') {
                if (this.currentQuiz) {
                    await this.cloudAPI.updateQuiz(quiz.id, quiz);
                } else {
                    const savedQuiz = await this.cloudAPI.createQuiz(quiz);
                    quiz.id = savedQuiz.id;
                }
            }

            // Save locally as backup
            if (this.currentQuiz) {
                const index = this.quizzes.findIndex(q => q.id === this.currentQuiz.id);
                this.quizzes[index] = quiz;
            } else {
                this.quizzes.push(quiz);
            }

            localStorage.setItem('quizzes', JSON.stringify(this.quizzes));
            
            // Show success message
            const message = status === 'published' ? 'Quiz erfolgreich veröffentlicht!' : 'Quiz als Entwurf gespeichert!';
            this.showNotification(message, 'success');
            
            // Reset form and go to quizzes list
            this.resetForm();
            this.showSection('my-quizzes');
            this.renderQuizGrid();
        } catch (error) {
            console.error('Fehler beim Speichern des Quiz:', error);
            this.showNotification('Fehler beim Speichern: ' + error.message, 'error');
        }
        this.updateStats();
        this.renderRecentActivity();
        this.updateUserInfo();
    }

    getQuestionsData() {
        const questions = [];
        document.querySelectorAll('.question-card').forEach(questionCard => {
            const questionText = questionCard.querySelector('.question-text').value;
            const questionType = questionCard.querySelector('.question-type').value;
            const questionPoints = parseInt(questionCard.querySelector('.question-points').value);
            
            if (!questionText.trim()) return;
            
            const question = {
                text: questionText,
                type: questionType,
                points: questionPoints,
                answers: []
            };

            const answersContainer = questionCard.querySelector('.answers-container');
            
            switch (questionType) {
                case 'multiple-choice':
                    const mcAnswers = answersContainer.querySelectorAll('.answer-option input[type="text"]');
                    const correctMC = answersContainer.querySelector('input[type="radio"]:checked');
                    
                    mcAnswers.forEach((answerInput, index) => {
                        if (answerInput.value.trim()) {
                            question.answers.push({
                                text: answerInput.value,
                                correct: correctMC && parseInt(correctMC.value) === index
                            });
                        }
                    });
                    break;
                    
                case 'true-false':
                    const correctTF = answersContainer.querySelector('input[type="radio"]:checked');
                    question.answers = [
                        { text: 'True', correct: correctTF && correctTF.value === '0' },
                        { text: 'False', correct: correctTF && correctTF.value === '1' }
                    ];
                    break;
                    
                case 'short-answer':
                    const correctAnswer = answersContainer.querySelector('input[type="text"]').value;
                    if (correctAnswer.trim()) {
                        question.answers = [{ text: correctAnswer, correct: true }];
                    }
                    break;
            }
            
            if (question.answers.length > 0) {
                questions.push(question);
            }
        });
        
        return questions;
    }

    resetForm() {
        document.getElementById('quiz-form').reset();
        document.getElementById('questions-container').innerHTML = '';
        document.getElementById('participant-list-items').innerHTML = `
            <div class="empty-participants">
                <p>Noch keine Teilnehmer hinzugefügt</p>
                <p><small>Aktivieren Sie "Offene Registrierung" oder fügen Sie spezifische Teilnehmer hinzu</small></p>
            </div>
        `;
        this.questionCounter = 0;
        this.participantCounter = 0;
        this.currentQuiz = null;
        this.participants = [];
    }

    // Participant Management Methods
    showAddParticipantModal() {
        const modal = document.createElement('div');
        modal.className = 'modal active add-participant-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Teilnehmer hinzufügen</h2>
                    <span class="close modal-close">&times;</span>
                </div>
                <form class="add-participant-form" id="add-participant-form">
                    <div class="form-group">
                        <label for="participant-name">Teilnehmer Name *</label>
                        <input type="text" id="participant-name" required 
                               placeholder="Max Mustermann">
                    </div>
                    <div class="form-group">
                        <label for="participant-email">E-Mail (optional)</label>
                        <input type="email" id="participant-email" 
                               placeholder="max@example.com">
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="send-invitation" checked>
                            Einladung senden (falls E-Mail angegeben)
                        </label>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary modal-close">Abbrechen</button>
                        <button type="submit" class="btn btn-primary">Hinzufügen</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Event Listeners
        const form = modal.querySelector('#add-participant-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addParticipant();
            document.body.removeChild(modal);
        });
    }

    addParticipant() {
        const name = document.getElementById('participant-name').value.trim();
        const email = document.getElementById('participant-email').value.trim();
        const sendInvitation = document.getElementById('send-invitation').checked;

        if (!name) {
            this.showNotification('Bitte geben Sie einen Namen ein', 'error');
            return;
        }

        // Check for duplicate names
        if (this.participants.find(p => p.name.toLowerCase() === name.toLowerCase())) {
            this.showNotification('Ein Teilnehmer mit diesem Namen existiert bereits', 'error');
            return;
        }

        const participant = {
            id: Date.now() + Math.random(),
            name: name,
            email: email || null,
            status: 'pending',
            addedAt: new Date().toISOString(),
            sendInvitation: sendInvitation
        };

        this.participants.push(participant);
        this.renderParticipantList();
        this.showNotification(`Teilnehmer ${name} hinzugefügt`, 'success');
    }

    removeParticipant(participantId) {
        const participant = this.participants.find(p => p.id === participantId);
        if (participant && confirm(`Möchten Sie ${participant.name} wirklich entfernen?`)) {
            this.participants = this.participants.filter(p => p.id !== participantId);
            this.renderParticipantList();
            this.showNotification(`Teilnehmer ${participant.name} entfernt`, 'success');
        }
    }

    renderParticipantList() {
        const container = document.getElementById('participant-list-items');
        
        if (this.participants.length === 0) {
            container.innerHTML = `
                <div class="empty-participants">
                    <p>Noch keine Teilnehmer hinzugefügt</p>
                    <p><small>Aktivieren Sie "Offene Registrierung" oder fügen Sie spezifische Teilnehmer hinzu</small></p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.participants.map(participant => `
            <div class="participant-item">
                <span class="participant-name">${participant.name}</span>
                <span class="participant-status ${participant.status}">${this.getStatusText(participant.status)}</span>
                <div class="participant-actions">
                    <button class="btn btn-sm btn-danger" onclick="quizAdmin.removeParticipant(${participant.id})">
                        🗑️ Entfernen
                    </button>
                </div>
            </div>
        `).join('');
    }

    getStatusText(status) {
        const statusTexts = {
            'pending': 'Wartend',
            'joined': 'Beigetreten',
            'declined': 'Abgelehnt'
        };
        return statusTexts[status] || status;
    }

    toggleParticipantSection(allowOpen) {
        const participantSection = document.querySelector('.participants-list');
        if (allowOpen) {
            participantSection.style.opacity = '0.6';
            this.showNotification('Offene Registrierung aktiviert - jeder kann beitreten', 'info');
        } else {
            participantSection.style.opacity = '1';
        }
    }

    validateQuizName(quizName) {
        const input = document.getElementById('quiz-name');
        const isValid = /^[a-zA-Z0-9-_]+$/.test(quizName);
        
        if (quizName && !isValid) {
            input.setCustomValidity('Nur Buchstaben, Zahlen, Bindestriche und Unterstriche erlaubt');
            input.style.borderColor = 'var(--danger)';
        } else if (quizName && this.quizzes.find(q => q.quizName === quizName && q.id !== (this.currentQuiz?.id))) {
            input.setCustomValidity('Ein Quiz mit diesem Namen existiert bereits');
            input.style.borderColor = 'var(--danger)';
        } else {
            input.setCustomValidity('');
            input.style.borderColor = '';
        }
    }

    getParticipantsData() {
        return {
            allowOpenRegistration: document.getElementById('allow-open-registration').checked,
            participants: this.participants || []
        };
    }

    renderQuizGrid() {
        const grid = document.getElementById('quiz-grid');
        const template = document.getElementById('quiz-card-template');
        
        grid.innerHTML = '';
        
        // Filter quizzes for current user only
        const userQuizzes = this.quizzes.filter(quiz => quiz.createdBy === this.currentUser?.id);
        
        if (userQuizzes.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <h3>Noch keine Quiz vorhanden</h3>
                    <p>Erstellen Sie Ihr erstes Quiz, um loszulegen!</p>
                    <button class="btn btn-primary" onclick="quizAdmin.showSection('create-quiz')">
                        ➕ Neues Quiz erstellen
                    </button>
                </div>
            `;
            return;
        }

        userQuizzes.forEach(quiz => {
            const quizElement = template.content.cloneNode(true);
            
            quizElement.querySelector('.quiz-title').textContent = quiz.title;
            quizElement.querySelector('.quiz-name').textContent = quiz.quizName || 'Nicht gesetzt';
            quizElement.querySelector('.quiz-description').textContent = quiz.description || 'Keine Beschreibung';
            quizElement.querySelector('.quiz-category').textContent = quiz.category;
            quizElement.querySelector('.quiz-difficulty').textContent = quiz.difficulty;
            quizElement.querySelector('.quiz-questions-count').textContent = `${quiz.questions.length} Fragen`;
            quizElement.querySelector('.quiz-participants .count').textContent = quiz.participantCount || 0;
            quizElement.querySelector('.quiz-avg-score .score').textContent = `${quiz.averageScore || 0}%`;
            
            const statusElement = quizElement.querySelector('.quiz-status');
            statusElement.textContent = quiz.status;
            statusElement.className = `quiz-status ${quiz.status}`;
            
            // Setup action buttons
            quizElement.querySelector('.edit-quiz').addEventListener('click', () => {
                this.editQuiz(quiz.id);
            });
            
            quizElement.querySelector('.view-stats').addEventListener('click', () => {
                this.viewQuizStats(quiz.id);
            });
            
            quizElement.querySelector('.share-quiz').addEventListener('click', () => {
                this.shareQuiz(quiz.id);
            });
            
            quizElement.querySelector('.delete-quiz').addEventListener('click', () => {
                this.deleteQuiz(quiz.id);
            });
            
            // Show/setup live quiz button for published quizzes
            const liveButton = quizElement.querySelector('.start-live-btn');
            if (quiz.status === 'published') {
                liveButton.style.display = 'inline-block';
                liveButton.dataset.quizId = quiz.id;
            }
            
            grid.appendChild(quizElement);
        });
    }

    filterQuizzes() {
        const filterValue = document.getElementById('quiz-filter').value;
        const searchValue = document.getElementById('quiz-search').value.toLowerCase();
        
        // Filter user's quizzes only
        const userQuizzes = this.quizzes.filter(quiz => quiz.createdBy === this.currentUser?.id);
        
        const filteredQuizzes = userQuizzes.filter(quiz => {
            const matchesFilter = filterValue === 'all' || quiz.status === filterValue;
            const matchesSearch = quiz.title.toLowerCase().includes(searchValue) ||
                                quiz.description.toLowerCase().includes(searchValue) ||
                                quiz.category.toLowerCase().includes(searchValue);
            
            return matchesFilter && matchesSearch;
        });
        
        // Temporarily replace quizzes for rendering
        const originalQuizzes = this.quizzes;
        this.quizzes = filteredQuizzes.map(quiz => ({...quiz, createdBy: this.currentUser.id}));
        this.renderQuizGrid();
        this.quizzes = originalQuizzes;
    }

    editQuiz(quizId) {
        const quiz = this.quizzes.find(q => q.id === quizId && q.createdBy === this.currentUser?.id);
        if (!quiz) {
            this.showNotification('Quiz nicht gefunden oder keine Berechtigung', 'error');
            return;
        }
        
        this.currentQuiz = quiz;
        
        // Fill form with quiz data
        document.getElementById('quiz-title').value = quiz.title;
        document.getElementById('quiz-name').value = quiz.quizName || '';
        document.getElementById('quiz-description').value = quiz.description || '';
        document.getElementById('quiz-category').value = quiz.category;
        document.getElementById('quiz-difficulty').value = quiz.difficulty;
        document.getElementById('quiz-time-limit').value = quiz.timeLimit;
        document.getElementById('quiz-shuffle').checked = quiz.shuffleQuestions;
        document.getElementById('allow-open-registration').checked = quiz.participants?.allowOpenRegistration || false;
        
        // Load participants
        this.participants = quiz.participants?.participants || [];
        this.renderParticipantList();
        this.toggleParticipantSection(quiz.participants?.allowOpenRegistration || false);
        
        // Clear existing questions
        document.getElementById('questions-container').innerHTML = '';
        this.questionCounter = 0;
        
        // Add questions
        quiz.questions.forEach(question => {
            this.addQuestion();
            const questionCard = document.querySelector('.question-card:last-child');
            
            questionCard.querySelector('.question-text').value = question.text;
            questionCard.querySelector('.question-type').value = question.type;
            questionCard.querySelector('.question-points').value = question.points;
            
            // Trigger type change to setup answers
            const typeSelect = questionCard.querySelector('.question-type');
            const answersContainer = questionCard.querySelector('.answers-container');
            this.updateAnswerOptions(answersContainer, question.type);
            
            // Fill answers based on type
            if (question.type === 'multiple-choice') {
                const answerInputs = answersContainer.querySelectorAll('.answer-option input[type="text"]');
                const radioInputs = answersContainer.querySelectorAll('.answer-option input[type="radio"]');
                
                question.answers.forEach((answer, index) => {
                    if (answerInputs[index]) {
                        answerInputs[index].value = answer.text;
                        if (answer.correct) {
                            radioInputs[index].checked = true;
                        }
                    }
                });
            } else if (question.type === 'true-false') {
                const correctIndex = question.answers.findIndex(a => a.correct);
                const radioInputs = answersContainer.querySelectorAll('input[type="radio"]');
                if (radioInputs[correctIndex]) {
                    radioInputs[correctIndex].checked = true;
                }
            } else if (question.type === 'short-answer') {
                const answerInput = answersContainer.querySelector('input[type="text"]');
                if (answerInput && question.answers[0]) {
                    answerInput.value = question.answers[0].text;
                }
            }
        });
        
        this.showSection('create-quiz');
    }

    async deleteQuiz(quizId) {
        if (confirm('Sind Sie sicher, dass Sie dieses Quiz löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.')) {
            try {
                // Delete from cloud if online
                if (this.syncStatus === 'online') {
                    await this.cloudAPI.deleteQuiz(quizId);
                }

                // Delete locally
                this.quizzes = this.quizzes.filter(q => q.id !== quizId);
                localStorage.setItem('quizzes', JSON.stringify(this.quizzes));
                
                this.renderQuizGrid();
                this.updateStats();
                this.renderRecentActivity();
                this.showNotification('Quiz erfolgreich gelöscht', 'success');
            } catch (error) {
                console.error('Fehler beim Löschen des Quiz:', error);
                this.showNotification('Fehler beim Löschen: ' + error.message, 'error');
            }
        }
    }

    viewQuizStats(quizId) {
        const quiz = this.quizzes.find(q => q.id === quizId);
        if (!quiz) return;
        
        // Update modal content
        document.getElementById('modal-participants').textContent = quiz.participants || 0;
        document.getElementById('modal-avg-score').textContent = `${quiz.averageScore || 0}%`;
        document.getElementById('modal-completion-rate').textContent = '85%'; // Mock data
        document.getElementById('modal-avg-time').textContent = `${Math.floor(quiz.timeLimit * 0.7)}m`; // Mock data
        
        // Show modal
        document.getElementById('stats-modal').classList.add('active');
    }

    shareQuiz(quizId) {
        const quiz = this.quizzes.find(q => q.id === quizId);
        if (!quiz) return;
        
        const baseUrl = window.location.origin + window.location.pathname;
        const quizUrl = `${baseUrl}?quiz=${quizId}`;
        const embedCode = `<iframe src="${quizUrl}" width="100%" height="600" frameborder="0"></iframe>`;
        
        document.getElementById('quiz-link').value = quizUrl;
        document.getElementById('embed-code').value = embedCode;
        
        // Show modal
        document.getElementById('share-modal').classList.add('active');
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    copyToClipboard(elementId) {
        const element = document.getElementById(elementId);
        element.select();
        document.execCommand('copy');
        this.showNotification('In die Zwischenablage kopiert!', 'success');
    }

    updateStats() {
        // Filter for current user's quizzes only
        const userQuizzes = this.quizzes.filter(quiz => quiz.createdBy === this.currentUser?.id);
        
        const totalQuizzes = userQuizzes.length;
        const publishedQuizzes = userQuizzes.filter(q => q.status === 'published').length;
        const totalParticipants = userQuizzes.reduce((sum, quiz) => sum + (quiz.participantCount || 0), 0);
        const avgScore = totalParticipants > 0 
            ? Math.round(userQuizzes.reduce((sum, quiz) => sum + (quiz.averageScore || 0), 0) / userQuizzes.length)
            : 0;
        
        document.getElementById('total-quizzes').textContent = totalQuizzes;
        document.getElementById('published-quizzes').textContent = publishedQuizzes;
        document.getElementById('total-participants').textContent = totalParticipants;
        document.getElementById('avg-score').textContent = `${avgScore}%`;
    }

    renderRecentActivity() {
        const activityList = document.getElementById('activity-list');
        const activities = [];
        
        // Filter for current user's quizzes only
        const userQuizzes = this.quizzes.filter(quiz => quiz.createdBy === this.currentUser?.id);
        
        // Generate activities based on user's quizzes
        userQuizzes.slice(0, 5).forEach(quiz => {
            activities.push({
                icon: quiz.status === 'published' ? '🚀' : '💾',
                title: `${quiz.status === 'published' ? 'Veröffentlicht' : 'Gespeichert'} "${quiz.title}"`,
                time: new Date(quiz.updatedAt).toLocaleDateString('de-DE')
            });
        });
        
        if (activities.length === 0) {
            activityList.innerHTML = '<p>Keine aktuellen Aktivitäten</p>';
            return;
        }
        
        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">${activity.icon}</div>
                <div class="activity-content">
                    <h4>${activity.title}</h4>
                    <p>${activity.time}</p>
                </div>
            </div>
        `).join('');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 1rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: slideIn 0.3s ease-out;
        `;
        
        // Add close functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => notification.remove(), 300);
            }
        }, 3000);
    }

    showSyncStatus(status) {
        const statusIndicator = document.querySelector('.sync-status') || this.createSyncStatusIndicator();
        
        statusIndicator.className = `sync-status sync-${status}`;
        statusIndicator.innerHTML = status === 'online' 
            ? '<i class="fas fa-cloud"></i> Online' 
            : '<i class="fas fa-cloud-slash"></i> Offline';
    }

    createSyncStatusIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'sync-status';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: 500;
            z-index: 1000;
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(indicator);
        return indicator;
    }

    showAuthModal() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Cloud Server Anmeldung</h2>
                <form id="authForm">
                    <div class="form-group">
                        <label for="authEmail">E-Mail:</label>
                        <input type="email" id="authEmail" required>
                    </div>
                    <div class="form-group">
                        <label for="authPassword">Passwort:</label>
                        <input type="password" id="authPassword" required>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" id="skipAuth">Offline arbeiten</button>
                        <button type="submit" class="btn btn-primary">Anmelden</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        const form = modal.querySelector('#authForm');
        const skipBtn = modal.querySelector('#skipAuth');

        form.onsubmit = async (e) => {
            e.preventDefault();
            await this.handleAuth(
                document.getElementById('authEmail').value,
                document.getElementById('authPassword').value
            );
            document.body.removeChild(modal);
        };

        skipBtn.onclick = () => {
            this.syncStatus = 'offline';
            this.showSyncStatus('offline');
            document.body.removeChild(modal);
        };
    }

    async handleAuth(email, password) {
        try {
            const token = await this.cloudAPI.authenticate(email, password);
            localStorage.setItem('quiz_auth_token', token);
            this.syncStatus = 'online';
            this.showSyncStatus('online');
            await this.loadQuizzesFromCloud();
            this.updateStats();
            this.renderQuizGrid();
            this.showNotification('Erfolgreich angemeldet!', 'success');
        } catch (error) {
            console.error('Authentifizierung fehlgeschlagen:', error);
            this.showNotification('Anmeldung fehlgeschlagen: ' + error.message, 'error');
            this.syncStatus = 'offline';
            this.showSyncStatus('offline');
        }
    }
}

// Initialize admin when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.quizAdmin = new QuizAdmin();
});

// Global function for inline onclick handlers
function showSection(sectionId) {
    if (window.quizAdmin) {
        window.quizAdmin.showSection(sectionId);
    }
}

// Handle browser back/forward
window.addEventListener('popstate', function() {
    if (window.quizAdmin) {
        window.quizAdmin.loadDashboard();
    }
});

// Add CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0;
        line-height: 1;
    }
    
    .empty-state {
        text-align: center;
        padding: 3rem;
        color: var(--text-secondary);
        grid-column: 1 / -1;
    }
    
    .empty-state h3 {
        color: var(--text-primary);
        margin-bottom: 1rem;
    }
    
    .empty-state p {
        margin-bottom: 2rem;
    }
`;
document.head.appendChild(notificationStyles);

// Initialize the Quiz Admin when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.quizAdmin = new QuizAdmin();
});
