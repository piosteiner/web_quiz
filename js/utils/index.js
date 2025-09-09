/**
 * Consolidated Quiz Platform Utilities
 * Single import point for all common functionality
 */

// Re-export everything from individual utility modules
export { escapeHTML, validateQuestionText, validateQuizTitle, validateParticipantName } from './security.js';
export { 
    getAnswerLetter, 
    formatDate, 
    formatTime, 
    Templates, 
    EventHelpers, 
    Validators, 
    generateId, 
    CSS_CLASSES 
} from './common.js';
export { BaseComponent } from './base-component.js';

// Additional consolidated utilities
export class QuizUtils {
    /**
     * Calculate quiz statistics
     */
    static calculateStats(quiz) {
        const questionCount = quiz.questions?.length || 0;
        const participantCount = quiz.participants?.length || 0;
        const hasCorrectAnswers = quiz.questions?.some(q => 
            q.answers?.some(a => a.correct)
        ) || false;
        
        return {
            questionCount,
            participantCount,
            hasCorrectAnswers,
            isComplete: questionCount > 0 && hasCorrectAnswers,
            averageAnswers: questionCount > 0 ? 
                quiz.questions.reduce((sum, q) => sum + (q.answers?.length || 0), 0) / questionCount : 0
        };
    }

    /**
     * Generate join URL for quiz
     */
    static generateJoinUrl(quizId, baseUrl = window.location.origin) {
        return `${baseUrl}?quiz=${quizId}&join=true`;
    }

    /**
     * Calculate participant score
     */
    static calculateScore(answers, timeBonus = true) {
        let score = 0;
        
        answers.forEach(answer => {
            if (answer.correct) {
                score += 100; // Base points for correct answer
                
                if (timeBonus && answer.responseTime) {
                    // Bonus points for fast answers (max 50 bonus points)
                    const timeBonus = Math.max(0, 50 - Math.floor(answer.responseTime / 100));
                    score += timeBonus;
                }
            }
        });
        
        return score;
    }

    /**
     * Sort leaderboard
     */
    static sortLeaderboard(participants) {
        return [...participants].sort((a, b) => {
            // Primary: Score (higher is better)
            if ((b.score || 0) !== (a.score || 0)) {
                return (b.score || 0) - (a.score || 0);
            }
            
            // Secondary: Correct answers (more is better)
            if ((b.correctAnswers || 0) !== (a.correctAnswers || 0)) {
                return (b.correctAnswers || 0) - (a.correctAnswers || 0);
            }
            
            // Tertiary: Average response time (faster is better)
            return (a.averageResponseTime || Infinity) - (b.averageResponseTime || Infinity);
        });
    }
}

/**
 * Storage utilities for quiz data
 */
export class StorageUtils {
    static save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
            return false;
        }
    }
    
    static load(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.warn('Failed to load from localStorage:', error);
            return defaultValue;
        }
    }
    
    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn('Failed to remove from localStorage:', error);
            return false;
        }
    }
    
    static clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.warn('Failed to clear localStorage:', error);
            return false;
        }
    }
}

/**
 * Animation and UI utilities
 */
export class UIUtils {
    static fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        const start = performance.now();
        
        function animate(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = progress.toString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        
        requestAnimationFrame(animate);
    }
    
    static fadeOut(element, duration = 300) {
        const start = performance.now();
        const startOpacity = parseFloat(getComputedStyle(element).opacity);
        
        function animate(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = (startOpacity * (1 - progress)).toString();
            
            if (progress >= 1) {
                element.style.display = 'none';
            } else {
                requestAnimationFrame(animate);
            }
        }
        
        requestAnimationFrame(animate);
    }
    
    static showModal(content, options = {}) {
        const { 
            title = 'Modal', 
            onClose = null,
            showCloseButton = true 
        } = options;
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>${escapeHTML(title)}</h3>
                    ${showCloseButton ? '<button class="modal-close">&times;</button>' : ''}
                </div>
                <div class="modal-content">${content}</div>
            </div>
        `;
        
        const closeModal = () => {
            document.body.removeChild(modal);
            if (onClose) onClose();
        };
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('modal-close')) {
                closeModal();
            }
        });
        
        document.body.appendChild(modal);
        this.fadeIn(modal);
        
        return { modal, close: closeModal };
    }
}

/**
 * Constants for common values
 */
export const CONSTANTS = {
    QUESTION_TIME_LIMIT: 30, // seconds
    MAX_ANSWERS_PER_QUESTION: 6,
    MAX_QUESTION_TEXT_LENGTH: 500,
    MAX_ANSWER_TEXT_LENGTH: 200,
    MIN_QUESTIONS_FOR_QUIZ: 1,
    MAX_QUESTIONS_PER_QUIZ: 50,
    
    EVENTS: {
        QUIZ_STARTED: 'quiz:started',
        QUIZ_ENDED: 'quiz:ended',
        QUESTION_STARTED: 'question:started',
        QUESTION_ENDED: 'question:ended',
        ANSWER_SUBMITTED: 'answer:submitted',
        PARTICIPANT_JOINED: 'participant:joined',
        PARTICIPANT_LEFT: 'participant:left'
    },
    
    STATUS: {
        DRAFT: 'draft',
        PUBLISHED: 'published',
        ACTIVE: 'active',
        COMPLETED: 'completed'
    }
};

// Default export with everything
export default {
    QuizUtils,
    StorageUtils,
    UIUtils,
    CONSTANTS,
    // Re-export individual utilities for convenience
    getAnswerLetter,
    formatDate,
    formatTime,
    Templates,
    EventHelpers,
    Validators,
    generateId,
    CSS_CLASSES,
    BaseComponent,
    escapeHTML
};
