/**
 * Participant Join Component
 * Handles participant authentication and quiz joining
 */

import { BaseComponent } from '../utils/base-component.js';

export class ParticipantJoin extends BaseComponent {
    constructor(app) {
        super(app);
        
        this.currentQuiz = null;
        this.currentParticipant = null;
        this.quizId = null;
    }

    async onInit(params = {}) {
        console.log('👥 Initializing Participant Join');
        
        // Check if quiz ID is provided in URL
        const urlParams = new URLSearchParams(window.location.search);
        this.quizId = urlParams.get('quiz');
        
        if (this.quizId && urlParams.get('join') === 'true') {
            await this.showJoinForm();
        } else {
            this.showJoinIdForm();
        }
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Join form submission
        const joinForm = document.getElementById('participant-join-form');
        joinForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleJoinSubmit();
        });

        // Quiz ID form submission
        const quizIdForm = document.getElementById('quiz-id-form');
        quizIdForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleQuizIdSubmit();
        });

        // Back to quiz ID form
        const backToIdBtn = document.getElementById('back-to-quiz-id');
        backToIdBtn?.addEventListener('click', () => {
            this.showJoinIdForm();
        });
    }

    showJoinIdForm() {
        const container = document.getElementById('app-container');
        if (!container) {
            console.error('App container not found');
            return;
        }
        container.innerHTML = `
            <div class="join-container">
                <div class="join-card">
                    <div class="join-header">
                        <h1><i class="fas fa-gamepad"></i> Quiz beitreten</h1>
                        <p>Geben Sie die Quiz-ID ein, um teilzunehmen</p>
                    </div>
                    
                    <form id="quiz-id-form" class="join-form">
                        <div class="form-group">
                            <label for="quiz-id-input">Quiz-ID</label>
                            <input type="text" 
                                   id="quiz-id-input" 
                                   class="form-control" 
                                   placeholder="z.B. ABC12345"
                                   value="${this.quizId || ''}"
                                   required
                                   pattern="[A-Z0-9]{8}"
                                   title="Quiz-ID muss 8 Zeichen lang sein (A-Z, 0-9)">
                        </div>
                        
                        <button type="submit" class="btn btn-primary btn-large">
                            <i class="fas fa-search"></i> Quiz finden
                        </button>
                    </form>
                    
                    <div class="join-info">
                        <p><i class="fas fa-info-circle"></i> Die Quiz-ID erhalten Sie von Ihrem Quiz-Administrator</p>
                    </div>
                </div>
            </div>
        `;
    }

    async showJoinForm() {
        if (!this.quizId) {
            this.showJoinIdForm();
            return;
        }

        try {
            this.app.showLoading('Lade Quiz...');
            
            // Load quiz information
            this.currentQuiz = await this.api.getQuiz(this.quizId);
            
            if (!this.currentQuiz) {
                throw new Error('Quiz nicht gefunden');
            }

            this.app.hideLoading();

            const container = document.getElementById('app-container');
            if (!container) {
                console.error('App container not found');
                return;
            }
            container.innerHTML = `
                <div class="join-container">
                    <div class="join-card">
                        <div class="join-header">
                            <h1><i class="fas fa-gamepad"></i> ${this.currentQuiz.title}</h1>
                            <p>${this.currentQuiz.description || 'Willkommen zum Quiz!'}</p>
                            <div class="quiz-info">
                                <span class="quiz-id">Quiz-ID: ${this.currentQuiz.id}</span>
                                <span class="quiz-date">Erstellt: ${this.formatDate(this.currentQuiz.createdAt)}</span>
                            </div>
                        </div>
                        
                        <form id="participant-join-form" class="join-form">
                            <div class="form-group">
                                <label for="participant-name-input">Ihr Name</label>
                                <input type="text" 
                                       id="participant-name-input" 
                                       class="form-control" 
                                       placeholder="Geben Sie Ihren Namen ein"
                                       required
                                       minlength="2"
                                       maxlength="50">
                                <small class="form-text">Ihr Name muss in der Teilnehmerliste stehen</small>
                            </div>
                            
                            <button type="submit" class="btn btn-primary btn-large">
                                <i class="fas fa-sign-in-alt"></i> Quiz beitreten
                            </button>
                        </form>
                        
                        <div class="quiz-stats">
                            <div class="stat">
                                <i class="fas fa-users"></i>
                                <span>${this.currentQuiz.participants?.length || 0} Teilnehmer zugelassen</span>
                            </div>
                            <div class="stat">
                                <i class="fas fa-question-circle"></i>
                                <span>${this.currentQuiz.questions?.length || 0} Fragen</span>
                            </div>
                            <div class="stat">
                                <i class="fas fa-clock"></i>
                                <span>${this.currentQuiz.settings?.timePerQuestion || 30}s pro Frage</span>
                            </div>
                        </div>
                        
                        <div class="join-actions">
                            <button id="back-to-quiz-id" class="btn btn-secondary">
                                <i class="fas fa-arrow-left"></i> Andere Quiz-ID eingeben
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            this.setupEventListeners();
            
        } catch (error) {
            this.app.hideLoading();
            console.error('Failed to load quiz:', error);
            
            const container = document.getElementById('app-container');
            if (!container) {
                console.error('App container not found');
                return;
            }
            container.innerHTML = `
                <div class="join-container">
                    <div class="join-card error">
                        <div class="error-header">
                            <h1><i class="fas fa-exclamation-triangle"></i> Quiz nicht gefunden</h1>
                            <p>Das Quiz mit der ID "${this.quizId}" konnte nicht gefunden werden.</p>
                        </div>
                        
                        <div class="error-actions">
                            <button onclick="window.app.components.participantJoin.showJoinIdForm()" class="btn btn-primary">
                                <i class="fas fa-arrow-left"></i> Neue Quiz-ID eingeben
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    async handleQuizIdSubmit() {
        const quizIdInput = document.getElementById('quiz-id-input');
        if (!quizIdInput) return;

        const quizId = quizIdInput.value.trim().toUpperCase();
        
        if (!quizId.match(/^[A-Z0-9]{8}$/)) {
            this.app.showNotification('Quiz-ID muss 8 Zeichen lang sein (A-Z, 0-9)', 'error');
            return;
        }

        this.quizId = quizId;
        
        // Update URL without page reload
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('quiz', quizId);
        newUrl.searchParams.set('join', 'true');
        window.history.pushState({}, '', newUrl);
        
        await this.showJoinForm();
    }

    async handleJoinSubmit() {
        const nameInput = document.getElementById('participant-name-input');
        if (!nameInput) return;

        const participantName = nameInput.value.trim();
        
        if (!participantName) {
            this.app.showNotification('Bitte geben Sie Ihren Namen ein', 'error');
            return;
        }

        try {
            this.app.showLoading('Überprüfe Teilnahmeberechtigung...');
            
            // Check if participant is authorized
            const authorizedParticipant = this.currentQuiz.participants?.find(p => 
                p.name.toLowerCase() === participantName.toLowerCase()
            );
            
            if (!authorizedParticipant) {
                this.app.hideLoading();
                this.app.showNotification('Sie sind nicht für dieses Quiz berechtigt. Bitte wenden Sie sich an den Quiz-Administrator.', 'error');
                return;
            }

            // Create participant session
            const participantSession = {
                id: 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                quizId: this.currentQuiz.id,
                participantId: authorizedParticipant.id,
                participantName: authorizedParticipant.name,
                joinedAt: new Date().toISOString(),
                status: 'joined'
            };

            // Store session information
            this.currentParticipant = participantSession;
            this.app.setState({ 
                participantSession: participantSession,
                currentQuiz: this.currentQuiz 
            });

            this.app.hideLoading();
            this.app.showNotification(`Willkommen, ${participantName}!`, 'success');
            
            // Redirect to participant interface
            await this.showParticipantInterface();
            
        } catch (error) {
            this.app.hideLoading();
            console.error('Failed to join quiz:', error);
            this.app.showNotification('Fehler beim Beitreten zum Quiz: ' + error.message, 'error');
        }
    }

    async showParticipantInterface() {
        // Load participant interface component
        if (!this.app.components.participant) {
            const { Participant } = await import('./participant.js');
            this.app.components.participant = new Participant(this.app);
        }
        
        // Initialize participant component with quiz and participant data
        await this.app.components.participant.init({
            quiz: this.currentQuiz,
            participant: this.currentParticipant
        });
    }

    showBasicParticipantInterface() {
        const container = document.getElementById('app-container');
        if (!container) {
            console.error('App container not found');
            return;
        }
        container.innerHTML = `
            <div class="participant-container">
                <div class="participant-header">
                    <h1><i class="fas fa-gamepad"></i> ${this.currentQuiz.title}</h1>
                    <div class="participant-info">
                        <span class="participant-name">${this.currentParticipant.participantName}</span>
                        <span class="quiz-id">Quiz-ID: ${this.currentQuiz.id}</span>
                    </div>
                </div>
                
                <div class="participant-content">
                    <div class="waiting-state">
                        <i class="fas fa-clock fa-3x"></i>
                        <h2>Warten auf Quiz-Start</h2>
                        <p>Sie sind erfolgreich dem Quiz beigetreten. Warten Sie auf den Start durch den Quiz-Administrator.</p>
                        
                        <div class="quiz-info">
                            <div class="info-item">
                                <i class="fas fa-question-circle"></i>
                                <span>${this.currentQuiz.questions?.length || 0} Fragen</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-clock"></i>
                                <span>${this.currentQuiz.settings?.timePerQuestion || 30}s pro Frage</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="participant-actions">
                    <button onclick="window.location.reload()" class="btn btn-secondary">
                        <i class="fas fa-sync"></i> Aktualisieren
                    </button>
                    <button onclick="window.app.components.participantJoin.leaveQuiz()" class="btn btn-danger">
                        <i class="fas fa-sign-out-alt"></i> Quiz verlassen
                    </button>
                </div>
            </div>
        `;
    }

    leaveQuiz() {
        if (confirm('Möchten Sie das Quiz wirklich verlassen?')) {
            // Clear session
            this.app.setState({ participantSession: null, currentQuiz: null });
            
            // Clear URL parameters
            const newUrl = new URL(window.location);
            newUrl.search = '';
            window.history.pushState({}, '', newUrl);
            
            // Return to join form
            this.showJoinIdForm();
        }
    }

    formatDate(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}
