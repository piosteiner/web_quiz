/**
 * Common Utilities and Template Helpers
 * Consolidates repeated functionality across components
 */

import { escapeHTML } from './security.js';

/**
 * Answer Letter Generator
 */
export function getAnswerLetter(index) {
    return String.fromCharCode(65 + index); // A, B, C, D...
}

/**
 * Date Formatting Utilities
 */
export function formatDate(dateString) {
    if (!dateString) return 'Unbekannt';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Ungültiges Datum';
    }
}

export function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Template Generators for Common UI Elements
 */
export const Templates = {
    /**
     * Generate answer option HTML
     */
    answerOption(answer, index, options = {}) {
        const { 
            isCorrect = false, 
            isSelected = false, 
            showCorrect = false,
            clickHandler = '',
            dataAttributes = {}
        } = options;
        
        const classes = [
            'answer-option',
            isCorrect && showCorrect ? 'correct' : '',
            isSelected ? 'selected' : '',
            answer.correct && showCorrect ? 'is-correct' : ''
        ].filter(Boolean).join(' ');
        
        const dataAttrs = Object.entries(dataAttributes)
            .map(([key, value]) => `data-${key}="${escapeHTML(value)}"`)
            .join(' ');
        
        return `
            <button class="${classes}" 
                    data-answer-id="${answer.id}" 
                    data-answer-index="${index}"
                    ${dataAttrs}
                    ${clickHandler ? `onclick="${clickHandler}"` : ''}>
                <span class="answer-letter">${getAnswerLetter(index)}</span>
                <span class="answer-text">${escapeHTML(answer.text)}</span>
            </button>
        `;
    },

    /**
     * Generate question display HTML
     */
    questionDisplay(question, index, options = {}) {
        const { 
            showAnswers = false, 
            showCorrectAnswers = false,
            answerClickHandler = '',
            className = 'question-display'
        } = options;
        
        const answersHtml = showAnswers && question.answers ? 
            question.answers.map((answer, answerIndex) => 
                this.answerOption(answer, answerIndex, {
                    showCorrect: showCorrectAnswers,
                    clickHandler: answerClickHandler
                })
            ).join('') : '';
        
        return `
            <div class="${className}" data-question-id="${question.id}">
                <div class="question-header">
                    <span class="question-number">Frage ${index + 1}</span>
                    <h3 class="question-text">${escapeHTML(question.text)}</h3>
                </div>
                ${answersHtml ? `<div class="answers-container">${answersHtml}</div>` : ''}
            </div>
        `;
    },

    /**
     * Generate participant item HTML
     */
    participantItem(participant, options = {}) {
        const { 
            showEmail = false, 
            showStatus = false, 
            showScore = false,
            showActions = false,
            actionHandlers = {}
        } = options;
        
        const actionsHtml = showActions ? `
            <div class="participant-actions">
                ${actionHandlers.edit ? `
                    <button class="btn-icon" onclick="${actionHandlers.edit}" title="Bearbeiten">
                        <i class="fas fa-edit"></i>
                    </button>
                ` : ''}
                ${actionHandlers.remove ? `
                    <button class="btn-icon delete-btn" onclick="${actionHandlers.remove}" title="Entfernen">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        ` : '';
        
        return `
            <div class="participant-item" data-participant-id="${participant.id}">
                <div class="participant-info">
                    <div class="participant-name">${escapeHTML(participant.name)}</div>
                    ${showEmail ? `<div class="participant-email">${escapeHTML(participant.email || 'Keine E-Mail')}</div>` : ''}
                    ${showStatus ? `<div class="participant-status ${participant.status || 'pending'}">${participant.status || 'Ausstehend'}</div>` : ''}
                    ${showScore ? `<div class="participant-score">${participant.score || 0} Punkte</div>` : ''}
                </div>
                ${actionsHtml}
            </div>
        `;
    },

    /**
     * Generate quiz card HTML
     */
    quizCard(quiz, options = {}) {
        const { showActions = false, actionHandlers = {} } = options;
        
        const actionsHtml = showActions ? `
            <div class="quiz-actions">
                ${actionHandlers.edit ? `
                    <button class="btn btn-primary" onclick="${actionHandlers.edit}">
                        <i class="fas fa-edit"></i> Bearbeiten
                    </button>
                ` : ''}
                ${actionHandlers.duplicate ? `
                    <button class="btn btn-secondary" onclick="${actionHandlers.duplicate}">
                        <i class="fas fa-copy"></i> Duplizieren
                    </button>
                ` : ''}
                ${actionHandlers.start && quiz.questions?.length > 0 ? `
                    <button class="btn btn-success" onclick="${actionHandlers.start}">
                        <i class="fas fa-play"></i> Live starten
                    </button>
                ` : ''}
                ${actionHandlers.delete ? `
                    <button class="btn btn-danger" onclick="${actionHandlers.delete}">
                        <i class="fas fa-trash"></i> Löschen
                    </button>
                ` : ''}
            </div>
        ` : '';
        
        return `
            <div class="quiz-card" data-quiz-id="${quiz.id}">
                <div class="quiz-header">
                    <h3 class="quiz-title">${escapeHTML(quiz.title)}</h3>
                    <span class="quiz-status ${quiz.published ? 'published' : 'draft'}">
                        ${quiz.published ? 'Veröffentlicht' : 'Entwurf'}
                    </span>
                </div>
                <div class="quiz-meta">
                    <span><i class="fas fa-question"></i> ${quiz.questions?.length || 0} Fragen</span>
                    <span><i class="fas fa-users"></i> ${quiz.participants?.length || 0} Teilnehmer</span>
                    <span><i class="fas fa-calendar"></i> ${formatDate(quiz.createdAt)}</span>
                </div>
                ${quiz.description ? `<p class="quiz-description">${escapeHTML(quiz.description)}</p>` : ''}
                ${actionsHtml}
            </div>
        `;
    },

    /**
     * Generate leaderboard HTML
     */
    leaderboard(participants, options = {}) {
        const { currentParticipantId = null, isFinal = false } = options;
        
        const sortedParticipants = [...participants].sort((a, b) => (b.score || 0) - (a.score || 0));
        
        const itemsHtml = sortedParticipants.map((participant, index) => `
            <div class="leaderboard-item ${participant.participantId === currentParticipantId ? 'current-user' : ''}">
                <div class="rank">#${index + 1}</div>
                <div class="participant-info">
                    <span class="name">${escapeHTML(participant.name)}</span>
                    <span class="details">${participant.correctAnswers || 0} richtig</span>
                </div>
                <div class="score">${participant.score || 0}</div>
            </div>
        `).join('');
        
        return `
            <div class="leaderboard ${isFinal ? 'final' : ''}">
                <h3>${isFinal ? 'Endergebnis' : 'Zwischenstand'}</h3>
                ${itemsHtml}
            </div>
        `;
    },

    /**
     * Generate timer display HTML
     */
    timer(timeRemaining, options = {}) {
        const { showMilliseconds = false, warningThreshold = 10 } = options;
        
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        const isWarning = timeRemaining <= warningThreshold;
        
        if (showMilliseconds) {
            const milliseconds = (timeRemaining % 1) * 1000;
            return `
                <div class="timer ${isWarning ? 'warning' : ''}">
                    <div class="timer-main">${minutes}:${seconds.toString().padStart(2, '0')}</div>
                    <div class="timer-ms">.${Math.floor(milliseconds / 100)}</div>
                </div>
            `;
        }
        
        return `
            <div class="timer ${isWarning ? 'warning' : ''}">
                ${formatTime(timeRemaining)}
            </div>
        `;
    },

    /**
     * Generate countdown display HTML
     */
    countdown(count) {
        return `<div class="countdown-number">${count}</div>`;
    }
};

/**
 * Common Event Handlers
 */
export class EventHelpers {
    static stopPropagation(handler) {
        return `event.stopPropagation(); ${handler}`;
    }
    
    static confirm(message, handler) {
        return `if(confirm('${escapeHTML(message)}')) { ${handler} }`;
    }
    
    static generateQuizUrl(quizId, baseUrl = window.location.origin) {
        return `${baseUrl}?quiz=${quizId}&join=true`;
    }
}

/**
 * Validation Helpers
 */
export const Validators = {
    email(email) {
        return email && email.includes('@') && email.includes('.');
    },
    
    required(value) {
        return value && value.toString().trim().length > 0;
    },
    
    minLength(value, length) {
        return value && value.toString().length >= length;
    },
    
    maxLength(value, length) {
        return value && value.toString().length <= length;
    }
};

/**
 * ID Generation
 */
export function generateId(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Common CSS Classes
 */
export const CSS_CLASSES = {
    BUTTONS: {
        PRIMARY: 'btn btn-primary',
        SECONDARY: 'btn btn-secondary', 
        SUCCESS: 'btn btn-success',
        DANGER: 'btn btn-danger',
        ICON: 'btn-icon'
    },
    STATUS: {
        PUBLISHED: 'published',
        DRAFT: 'draft',
        CONNECTED: 'connected',
        DISCONNECTED: 'disconnected',
        WARNING: 'warning'
    }
};

export default {
    getAnswerLetter,
    formatDate,
    formatTime,
    Templates,
    EventHelpers,
    Validators,
    generateId,
    CSS_CLASSES
};
