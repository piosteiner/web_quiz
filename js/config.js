// Cloud Server Configuration
const CONFIG = {
    // Dynamic server configuration based on environment
    API_BASE_URL: (() => {
        // Production: Same-origin requests (much simpler!)
        if (window.location.hostname === 'quiz.piogino.ch') {
            return '/api';  // Same origin, HTTPS if site is HTTPS
        }
        // Local development
        return 'http://localhost:3002/api';
    })(),
    
    WEBSOCKET_URL: (() => {
        // Production: Same-origin WebSocket
        if (window.location.hostname === 'quiz.piogino.ch') {
            return window.location.protocol === 'https:' ? 'wss://' + window.location.host : 'ws://' + window.location.host;
        }
        // Local development
        return 'ws://localhost:3002';
    })(),
    
    // API Endpoints
    ENDPOINTS: {
        // Quiz Management
        QUIZZES: '/quizzes',
        QUIZ_BY_ID: '/quizzes/:id',
        CREATE_QUIZ: '/quizzes',
        UPDATE_QUIZ: '/quizzes/:id',
        DELETE_QUIZ: '/quizzes/:id',
        PUBLISH_QUIZ: '/quizzes/:id/publish',
        
        // Live Quiz Sessions
        SESSIONS: '/sessions',
        SESSION_BY_ID: '/sessions/:id',
        CREATE_SESSION: '/sessions',
        GET_SESSION: '/sessions/:id',
        JOIN_SESSION: '/sessions/join',
        JOIN_QUIZ_BY_NAME: '/quiz/join',
        LEAVE_SESSION: '/sessions/:sessionId/participants/:participantId/leave',
        START_SESSION: '/sessions/:id/start',
        PAUSE_SESSION: '/sessions/:id/pause',
        END_SESSION: '/sessions/:id/end',
        SESSION_PARTICIPANTS: '/sessions/:sessionId/participants',
        
        // Real-time Data
        LIVE_SCORES: '/sessions/:id/scores',
        SUBMIT_ANSWER: '/sessions/:sessionId/answer',
        SESSION_STATUS: '/sessions/:id/status',
        
        // Analytics
        QUIZ_STATS: '/quizzes/:id/stats',
        SESSION_RESULTS: '/sessions/:id/results',
        USER_PROGRESS: '/users/:id/progress'
    },
    
    // WebSocket Events
    WS_EVENTS: {
        // Connection
        CONNECT: 'connect',
        DISCONNECT: 'disconnect',
        JOIN_ROOM: 'join_room',
        LEAVE_ROOM: 'leave_room',
        
        // Quiz Session Events
        SESSION_STARTED: 'session_started',
        SESSION_ENDED: 'session_ended',
        QUESTION_CHANGED: 'question_changed',
        TIMER_UPDATE: 'timer_update',
        TIMER_ENDED: 'timer_ended',
        
        // Participant Events
        PARTICIPANT_JOINED: 'participant_joined',
        PARTICIPANT_LEFT: 'participant_left',
        ANSWER_SUBMITTED: 'answer_submitted',
        
        // Scoreboard Events
        SCORE_UPDATE: 'score_update',
        LEADERBOARD_UPDATE: 'leaderboard_update',
        FINAL_RESULTS: 'final_results'
    },
    
    // Local Storage Keys
    STORAGE_KEYS: {
        AUTH_TOKEN: 'quiz_auth_token',
        USER_ID: 'quiz_user_id',
        CACHED_QUIZZES: 'quiz_cached_data',
        SYNC_QUEUE: 'quiz_sync_queue'
    },
    
    // Default Settings
    DEFAULTS: {
        SYNC_INTERVAL: 30000, // 30 seconds
        RECONNECT_ATTEMPTS: 5,
        RECONNECT_DELAY: 2000, // 2 seconds
        CACHE_EXPIRY: 300000,  // 5 minutes
        HEARTBEAT_INTERVAL: 25000 // 25 seconds
    }
};

// Environment-specific configurations
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Development configuration
    CONFIG.API_BASE_URL = 'http://localhost:3002/api';
    CONFIG.WEBSOCKET_URL = 'http://localhost:3002';
}
// Note: Production configuration is already set above in the dynamic functions

export default CONFIG;
