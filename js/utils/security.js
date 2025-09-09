/**
 * Security Utilities
 * Provides functions to prevent XSS and code injection attacks
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} unsafe - The unsafe string that might contain HTML
 * @returns {string} - The escaped string safe for innerHTML
 */
export function escapeHTML(unsafe) {
    if (typeof unsafe !== 'string') {
        return String(unsafe || '');
    }
    
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/\//g, "&#x2F;");
}

/**
 * Sanitizes text input by removing potentially dangerous characters
 * @param {string} input - The input string to sanitize
 * @returns {string} - The sanitized string
 */
export function sanitizeInput(input) {
    if (typeof input !== 'string') {
        return String(input || '');
    }
    
    // Remove script tags and other dangerous elements
    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
        .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
        .replace(/<link\b[^>]*>/gi, '')
        .replace(/<meta\b[^>]*>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/on\w+\s*=/gi, ''); // Remove event handlers like onclick, onload, etc.
}

/**
 * Validates quiz title input
 * @param {string} title - The title to validate
 * @returns {object} - {isValid: boolean, error: string, sanitized: string}
 */
export function validateQuizTitle(title) {
    if (!title || typeof title !== 'string') {
        return {
            isValid: false,
            error: 'Quiz-Titel ist erforderlich',
            sanitized: ''
        };
    }
    
    const sanitized = sanitizeInput(title.trim());
    
    if (sanitized.length < 2) {
        return {
            isValid: false,
            error: 'Quiz-Titel muss mindestens 2 Zeichen lang sein',
            sanitized
        };
    }
    
    if (sanitized.length > 100) {
        return {
            isValid: false,
            error: 'Quiz-Titel darf maximal 100 Zeichen lang sein',
            sanitized: sanitized.substring(0, 100)
        };
    }
    
    return {
        isValid: true,
        error: null,
        sanitized
    };
}

/**
 * Validates question text input
 * @param {string} text - The question text to validate
 * @returns {object} - {isValid: boolean, error: string, sanitized: string}
 */
export function validateQuestionText(text) {
    if (!text || typeof text !== 'string') {
        return {
            isValid: false,
            error: 'Frage-Text ist erforderlich',
            sanitized: ''
        };
    }
    
    const sanitized = sanitizeInput(text.trim());
    
    if (sanitized.length < 5) {
        return {
            isValid: false,
            error: 'Frage-Text muss mindestens 5 Zeichen lang sein',
            sanitized
        };
    }
    
    if (sanitized.length > 500) {
        return {
            isValid: false,
            error: 'Frage-Text darf maximal 500 Zeichen lang sein',
            sanitized: sanitized.substring(0, 500)
        };
    }
    
    return {
        isValid: true,
        error: null,
        sanitized
    };
}

/**
 * Validates participant name input
 * @param {string} name - The participant name to validate
 * @returns {object} - {isValid: boolean, error: string, sanitized: string}
 */
export function validateParticipantName(name) {
    if (!name || typeof name !== 'string') {
        return {
            isValid: false,
            error: 'Teilnehmer-Name ist erforderlich',
            sanitized: ''
        };
    }
    
    const sanitized = sanitizeInput(name.trim());
    
    if (sanitized.length < 2) {
        return {
            isValid: false,
            error: 'Teilnehmer-Name muss mindestens 2 Zeichen lang sein',
            sanitized
        };
    }
    
    if (sanitized.length > 50) {
        return {
            isValid: false,
            error: 'Teilnehmer-Name darf maximal 50 Zeichen lang sein',
            sanitized: sanitized.substring(0, 50)
        };
    }
    
    // Check for potentially malicious patterns
    const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /on\w+=/i,
        /<iframe/i,
        /<object/i,
        /<embed/i
    ];
    
    for (const pattern of dangerousPatterns) {
        if (pattern.test(sanitized)) {
            return {
                isValid: false,
                error: 'Teilnehmer-Name enthält unerlaubte Zeichen',
                sanitized: sanitized.replace(pattern, '')
            };
        }
    }
    
    return {
        isValid: true,
        error: null,
        sanitized
    };
}

/**
 * Creates a safe DOM element with escaped text content
 * @param {string} tagName - The HTML tag name
 * @param {string} textContent - The text content to escape
 * @param {object} attributes - Optional attributes to set
 * @returns {HTMLElement} - The created DOM element
 */
export function createSafeElement(tagName, textContent = '', attributes = {}) {
    const element = document.createElement(tagName);
    
    // Use textContent instead of innerHTML for safety
    if (textContent) {
        element.textContent = textContent;
    }
    
    // Set attributes safely
    for (const [key, value] of Object.entries(attributes)) {
        if (typeof value === 'string' || typeof value === 'number') {
            element.setAttribute(key, String(value));
        }
    }
    
    return element;
}

/**
 * Safely updates text content of an element
 * @param {HTMLElement|string} element - The element or element ID
 * @param {string} content - The content to set
 */
export function safeSetTextContent(element, content) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (el) {
        el.textContent = escapeHTML(content);
    }
}

export default {
    escapeHTML,
    sanitizeInput,
    validateQuizTitle,
    validateQuestionText,
    validateParticipantName,
    createSafeElement,
    safeSetTextContent
};
