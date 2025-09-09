/**
 * Quiz Editor Component
 * Handles quiz creation, editing, and question management
 */

export class QuizEditor {
    constructor(app) {
        this.app = app;
        this.cloudAPI = app.getCloudAPI();
        
        this.currentQuiz = null;
        this.currentQuestions = [];
        this.isEditing = false;
        this.draggedQuestion = null;
        this.autoSaveTimeout = null;
        this.hasUnsavedChanges = false;
    }

    async init(params = {}) {
        console.log('📝 Initializing Quiz Editor');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Back to list button
        const backToListBtn = document.getElementById('back-to-list');
        backToListBtn?.addEventListener('click', () => {
            this.exitEditor();
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
                this.markAsChanged();
                this.scheduleAutoSave();
            }
        });

        // Prevent accidental navigation away
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = 'Sie haben ungespeicherte Änderungen. Möchten Sie wirklich fortfahren?';
            }
        });
    }

    // Editor Management
    openEditor(quiz = null) {
        this.isEditing = true;
        
        if (quiz) {
            // Edit existing quiz
            this.currentQuiz = { ...quiz };
            this.currentQuestions = [...(quiz.questions || [])];
        } else {
            // Create new quiz
            this.currentQuiz = this.createNewQuizTemplate();
            this.currentQuestions = [];
        }
        
        this.showEditor();
        this.populateEditor();
        this.renderQuestions();
        this.hasUnsavedChanges = false;
    }

    exitEditor() {
        if (this.hasUnsavedChanges) {
            if (!confirm('Sie haben ungespeicherte Änderungen. Möchten Sie wirklich zurück zur Liste?')) {
                return;
            }
        }
        
        this.isEditing = false;
        this.currentQuiz = null;
        this.currentQuestions = [];
        this.hasUnsavedChanges = false;
        
        // Notify admin component to show quiz list
        this.app.components.admin.showQuizList();
    }

    showEditor() {
        document.getElementById('quiz-list-view').style.display = 'none';
        document.getElementById('quiz-editor-view').style.display = 'block';
    }

    createNewQuizTemplate() {
        const quizId = this.generateUniqueQuizId();
        return {
            id: quizId,
            title: 'Neues Quiz',
            description: '',
            questions: [],
            participants: [],
            settings: {
                timePerQuestion: 30,
                maxParticipants: 50,
                category: 'general'
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

    populateEditor() {
        if (!this.currentQuiz) return;
        
        // Populate quiz settings
        document.getElementById('quiz-title').value = this.currentQuiz.title || '';
        document.getElementById('quiz-description').value = this.currentQuiz.description || '';
        document.getElementById('time-per-question').value = this.currentQuiz.settings?.timePerQuestion || 30;
        document.getElementById('max-participants').value = this.currentQuiz.settings?.maxParticipants || 50;
        document.getElementById('quiz-category').value = this.currentQuiz.settings?.category || 'general';
        
        // Populate quiz ID display
        const quizIdDisplay = document.getElementById('quiz-id-display');
        if (quizIdDisplay) {
            quizIdDisplay.textContent = this.currentQuiz.id;
        }
        
        // Populate creation date
        const creationDateDisplay = document.getElementById('creation-date-display');
        if (creationDateDisplay && this.currentQuiz.createdAt) {
            const date = new Date(this.currentQuiz.createdAt);
            creationDateDisplay.textContent = date.toLocaleDateString('de-DE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        // Populate participant list
        this.renderParticipantList();
        
        // Update publish button state
        const publishBtn = document.getElementById('publish-quiz');
        if (publishBtn) {
            publishBtn.innerHTML = this.currentQuiz.published 
                ? '<i class="fas fa-eye-slash"></i> Unveröffentlichen'
                : '<i class="fas fa-eye"></i> Veröffentlichen';
        }

        this.updateQuestionCount();
    }

    // Participant Management
    renderParticipantList() {
        const participantsList = document.getElementById('participants-list');
        if (!participantsList) return;

        const participants = this.currentQuiz.participants || [];
        
        participantsList.innerHTML = `
            <div class="participants-section">
                <div class="section-header">
                    <h3><i class="fas fa-users"></i> Teilnehmer (${participants.length})</h3>
                    <div class="participant-actions">
                        <button class="btn btn-secondary" onclick="window.app.components.editor.addParticipant()">
                            <i class="fas fa-plus"></i> Teilnehmer hinzufügen
                        </button>
                        <button class="btn btn-info" onclick="window.app.components.editor.showJoinLink()">
                            <i class="fas fa-link"></i> Join-Link anzeigen
                        </button>
                    </div>
                </div>
                
                <div class="participant-input-section">
                    <div class="input-group">
                        <input type="text" 
                               id="new-participant-name" 
                               placeholder="Name des Teilnehmers eingeben..."
                               class="form-control">
                        <button class="btn btn-primary" onclick="window.app.components.editor.addParticipantFromInput()">
                            <i class="fas fa-plus"></i> Hinzufügen
                        </button>
                    </div>
                    <div class="bulk-import">
                        <textarea id="bulk-participants" 
                                  placeholder="Mehrere Namen eingeben (einen pro Zeile)..."
                                  class="form-control"
                                  rows="3"></textarea>
                        <button class="btn btn-secondary" onclick="window.app.components.editor.addBulkParticipants()">
                            <i class="fas fa-users"></i> Alle hinzufügen
                        </button>
                    </div>
                </div>

                <div class="participants-list-container">
                    ${participants.length > 0 ? participants.map((participant, index) => `
                        <div class="participant-item" data-participant-id="${participant.id}">
                            <div class="participant-info">
                                <span class="participant-name">${participant.name}</span>
                                <span class="participant-status ${participant.status || 'pending'}">${this.getParticipantStatusText(participant.status || 'pending')}</span>
                            </div>
                            <div class="participant-actions">
                                <button class="btn-icon" onclick="window.app.components.editor.editParticipant('${participant.id}')" title="Bearbeiten">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-icon delete-btn" onclick="window.app.components.editor.removeParticipant('${participant.id}')" title="Entfernen">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('') : '<div class="empty-state">Noch keine Teilnehmer hinzugefügt</div>'}
                </div>
            </div>
        `;

        // Add enter key listener for participant input
        const participantInput = document.getElementById('new-participant-name');
        if (participantInput) {
            participantInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addParticipantFromInput();
                }
            });
        }
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

    addParticipant() {
        const participantInput = document.getElementById('new-participant-name');
        if (participantInput) {
            participantInput.focus();
        }
    }

    addParticipantFromInput() {
        const participantInput = document.getElementById('new-participant-name');
        if (!participantInput) return;

        const name = participantInput.value.trim();
        if (!name) {
            this.app.showNotification('Bitte geben Sie einen Namen ein', 'warning');
            return;
        }

        // Check for duplicate names
        const existingParticipant = this.currentQuiz.participants?.find(p => 
            p.name.toLowerCase() === name.toLowerCase()
        );
        
        if (existingParticipant) {
            this.app.showNotification('Ein Teilnehmer mit diesem Namen existiert bereits', 'warning');
            return;
        }

        const participant = {
            id: 'participant-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            name: name,
            status: 'pending',
            addedAt: new Date().toISOString()
        };

        if (!this.currentQuiz.participants) {
            this.currentQuiz.participants = [];
        }
        
        this.currentQuiz.participants.push(participant);
        participantInput.value = '';
        
        this.renderParticipantList();
        this.markAsChanged();
        this.app.showNotification(`Teilnehmer "${name}" hinzugefügt`, 'success');
    }

    addBulkParticipants() {
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
            addedCount++;
        });

        bulkInput.value = '';
        this.renderParticipantList();
        this.markAsChanged();

        if (addedCount > 0) {
            this.app.showNotification(`${addedCount} Teilnehmer hinzugefügt`, 'success');
        }

        if (duplicates.length > 0) {
            this.app.showNotification(`Duplikate übersprungen: ${duplicates.join(', ')}`, 'warning');
        }
    }

    editParticipant(participantId) {
        const participant = this.currentQuiz.participants?.find(p => p.id === participantId);
        if (!participant) return;

        const newName = prompt('Neuer Name:', participant.name);
        if (!newName || newName.trim() === '') return;

        const trimmedName = newName.trim();
        
        // Check for duplicate names (excluding current participant)
        const existingParticipant = this.currentQuiz.participants.find(p => 
            p.id !== participantId && p.name.toLowerCase() === trimmedName.toLowerCase()
        );
        
        if (existingParticipant) {
            this.app.showNotification('Ein Teilnehmer mit diesem Namen existiert bereits', 'warning');
            return;
        }

        participant.name = trimmedName;
        participant.updatedAt = new Date().toISOString();
        
        this.renderParticipantList();
        this.markAsChanged();
        this.app.showNotification(`Teilnehmer umbenannt in "${trimmedName}"`, 'success');
    }

    removeParticipant(participantId) {
        const participant = this.currentQuiz.participants?.find(p => p.id === participantId);
        if (!participant) return;

        if (!confirm(`Teilnehmer "${participant.name}" wirklich entfernen?`)) {
            return;
        }

        this.currentQuiz.participants = this.currentQuiz.participants.filter(p => p.id !== participantId);
        
        this.renderParticipantList();
        this.markAsChanged();
        this.app.showNotification(`Teilnehmer "${participant.name}" entfernt`, 'success');
    }

    showJoinLink() {
        if (!this.currentQuiz.id) {
            this.app.showNotification('Quiz muss zuerst gespeichert werden', 'warning');
            return;
        }

        const baseUrl = window.location.origin + window.location.pathname;
        const joinUrl = `${baseUrl}?quiz=${this.currentQuiz.id}&join=true`;
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-link"></i> Quiz Join-Link</h3>
                    <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Teilen Sie diesen Link mit den Teilnehmern:</p>
                    <div class="link-container">
                        <input type="text" value="${joinUrl}" class="form-control" id="join-link-input" readonly>
                        <button class="btn btn-primary" onclick="window.app.components.editor.copyJoinLink()">
                            <i class="fas fa-copy"></i> Kopieren
                        </button>
                    </div>
                    <div class="quiz-info">
                        <p><strong>Quiz-ID:</strong> ${this.currentQuiz.id}</p>
                        <p><strong>Zugelassene Teilnehmer:</strong> ${this.currentQuiz.participants?.length || 0}</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    copyJoinLink() {
        const linkInput = document.getElementById('join-link-input');
        if (linkInput) {
            linkInput.select();
            document.execCommand('copy');
            this.app.showNotification('Link in Zwischenablage kopiert', 'success');
        }
    }

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

    markAsChanged() {
        this.hasUnsavedChanges = true;
    }

    // Question Management
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
        this.markAsChanged();
        
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
                <div class="question-header" onclick="window.app.components.editor.toggleQuestion('${question.id}')">
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
                        <button class="answer-action-btn" onclick="event.stopPropagation(); window.app.components.editor.duplicateQuestion('${question.id}')" title="Frage duplizieren">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="answer-action-btn delete-btn" onclick="event.stopPropagation(); window.app.components.editor.deleteQuestion('${question.id}')" title="Frage löschen">
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
                        onkeyup="window.app.components.editor.updateQuestionText('${question.id}', this.value)"
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
                            <div class="answer-label-input" onclick="window.app.components.editor.toggleCorrectAnswer('${question.id}', '${answer.id}')">
                                ${String.fromCharCode(65 + answerIndex)}
                            </div>
                            <input 
                                type="text" 
                                class="answer-input" 
                                placeholder="Antworttext eingeben..."
                                value="${answer.text}"
                                onkeyup="window.app.components.editor.updateAnswerText('${question.id}', '${answer.id}', this.value)"
                            >
                            <div class="answer-actions">
                                <button type="button" class="answer-action-btn correct-btn" 
                                        onclick="window.app.components.editor.toggleCorrectAnswer('${question.id}', '${answer.id}')"
                                        title="Als richtige Antwort markieren">
                                    <i class="fas fa-check"></i>
                                </button>
                                ${question.answers.length > 2 ? `
                                    <button type="button" class="answer-action-btn delete-btn" 
                                            onclick="window.app.components.editor.deleteAnswer('${question.id}', '${answer.id}')"
                                            title="Antwort löschen">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                    ${question.answers.length < 6 ? `
                        <button type="button" class="add-answer-btn" onclick="window.app.components.editor.addAnswer('${question.id}')">
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
                            onchange="window.app.components.editor.updateQuestionTimeLimit('${question.id}', this.value)"
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
                            onchange="window.app.components.editor.updateQuestionPoints('${question.id}', this.value)"
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
            this.markAsChanged();
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
            
            this.markAsChanged();
        }
    }

    updateAnswerText(questionId, answerId, text) {
        const question = this.currentQuestions.find(q => q.id === questionId);
        if (question) {
            const answer = question.answers.find(a => a.id === answerId);
            if (answer) {
                answer.text = text;
                this.markAsChanged();
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
            this.markAsChanged();
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
            this.markAsChanged();
        }
    }

    duplicateQuestion(questionId) {
        const question = this.currentQuestions.find(q => q.id === questionId);
        if (question) {
            const duplicatedQuestion = {
                ...question,
                id: 'question-' + Date.now(),
                number: this.currentQuestions.length + 1,
                text: question.text + ' (Kopie)',
                answers: question.answers.map(answer => ({ ...answer }))
            };
            this.currentQuestions.push(duplicatedQuestion);
            this.renderQuestions();
            this.updateQuestionCount();
            this.markAsChanged();
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
            this.markAsChanged();
            this.app.showNotification('Frage gelöscht', 'success');
        }
    }

    updateQuestionTimeLimit(questionId, timeLimit) {
        const question = this.currentQuestions.find(q => q.id === questionId);
        if (question) {
            question.settings = question.settings || {};
            question.settings.timeLimit = parseInt(timeLimit);
            this.markAsChanged();
        }
    }

    updateQuestionPoints(questionId, points) {
        const question = this.currentQuestions.find(q => q.id === questionId);
        if (question) {
            question.settings = question.settings || {};
            question.settings.points = parseInt(points);
            this.markAsChanged();
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
            this.markAsChanged();
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
            
            // Notify admin component to save
            await this.app.components.admin.saveQuiz(this.currentQuiz);
            
            this.hasUnsavedChanges = false;
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
            
            this.populateEditor(); // Update UI
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

    setupQuestionDragAndDrop() {
        const questionItems = document.querySelectorAll('.question-item');
        
        questionItems.forEach(item => {
            const dragHandle = item.querySelector('.drag-handle');
            
            dragHandle.addEventListener('dragstart', (e) => {
                this.draggedQuestion = item.dataset.questionId;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            
            dragHandle.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                this.draggedQuestion = null;
            });
        });
        
        const container = document.getElementById('questions-container');
        
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            container.classList.add('drag-over');
        });
        
        container.addEventListener('dragleave', () => {
            container.classList.remove('drag-over');
        });
        
        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.classList.remove('drag-over');
            
            if (this.draggedQuestion) {
                const dropTarget = e.target.closest('.question-item');
                if (dropTarget && dropTarget.dataset.questionId !== this.draggedQuestion) {
                    this.reorderQuestion(this.draggedQuestion, dropTarget.dataset.questionId);
                }
            }
        });
    }

    reorderQuestion(draggedId, targetId) {
        const draggedIndex = this.currentQuestions.findIndex(q => q.id === draggedId);
        const targetIndex = this.currentQuestions.findIndex(q => q.id === targetId);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
            const [draggedQuestion] = this.currentQuestions.splice(draggedIndex, 1);
            this.currentQuestions.splice(targetIndex, 0, draggedQuestion);
            
            // Renumber questions
            this.currentQuestions.forEach((question, index) => {
                question.number = index + 1;
            });
            
            this.renderQuestions();
            this.markAsChanged();
            this.app.showNotification('Fragen neu angeordnet', 'success');
        }
    }

    // Public API for external access
    getCurrentQuiz() {
        return this.currentQuiz;
    }

    getCurrentQuestions() {
        return this.currentQuestions;
    }

    isCurrentlyEditing() {
        return this.isEditing;
    }
}
