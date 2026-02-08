/**
 * Click1Solutions Security Module
 * ================================
 * Strong security system with:
 * - SHA-256 hashing
 * - AES-like encryption for LocalStorage
 * - Session management
 * - Login attempt limiting
 * - Auto-logout on inactivity
 */

// ==================== CONFIGURATION ====================
const SECURITY_CONFIG = {
    MAX_LOGIN_ATTEMPTS: 3,
    LOCKOUT_DURATION_MINUTES: 10,
    SESSION_DURATION_MINUTES: 15,
    INACTIVITY_TIMEOUT_MINUTES: 5,
    MIN_PASSWORD_LENGTH: 8,
    TOKEN_LENGTH: 32
};

// Admin credentials (SHA-256 hashed)
// Default: username: admin, password: Click1Secure@2024
const ADMIN_CREDENTIALS = {
    usernameHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // 'admin'
    passwordHash: '9bae9f9a0120f788b1838162c1413762115340596aff8e626ee1c9f5d5f3b469'  // 'Click1Secure@2024' - CORRECTED!
};

// Company contact (shown after approval)
const COMPANY_CONTACT = {
    phone: '+91-98765-43210',
    email: 'contact@click1solutions.in',
    address: 'Hamirpur District, Himachal Pradesh, India'
};

// ==================== SHA-256 HASHING ====================
/**
 * Generate SHA-256 hash of input string
 * @param {string} input - String to hash
 * @returns {string} - Hexadecimal hash
 */
async function sha256(input) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify password against stored hash
 * @param {string} input - User input
 * @param {string} storedHash - Stored hash to compare
 * @returns {boolean} - Match result
 */
async function verifyHash(input, storedHash) {
    const inputHash = await sha256(input);
    return inputHash === storedHash;
}

// ==================== ENCRYPTION (AES-LIKE) ====================
/**
 * Generate encryption key from password using PBKDF2-like approach
 * @param {string} password - Base password
 * @param {string} salt - Salt string
 * @returns {Promise<CryptoKey>} - Derived key
 */
async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', passwordData);
    
    return await crypto.subtle.importKey(
        'raw',
        hashBuffer,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Generate random IV
 * @returns {Uint8Array} - 12-byte IV
 */
function generateIV() {
    return crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Encrypt data using AES-GCM
 * @param {string} data - Data to encrypt
 * @param {string} keyPassword - Key derivation password
 * @returns {Promise<string>} - Encrypted data as base64
 */
async function encryptData(data, keyPassword = 'Click1SecureKey2024') {
    try {
        const encoder = new TextEncoder();
        const iv = generateIV();
        const key = await deriveKey(keyPassword, 'Click1Salt');
        
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encoder.encode(data)
        );
        
        // Combine IV + encrypted data
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);
        
        // Convert to base64
        return btoa(String.fromCharCode(...combined));
    } catch (error) {
        console.error('Encryption error:', error);
        return null;
    }
}

/**
 * Decrypt data using AES-GCM
 * @param {string} encryptedBase64 - Encrypted base64 data
 * @param {string} keyPassword - Key derivation password
 * @returns {Promise<string>} - Decrypted data
 */
async function decryptData(encryptedBase64, keyPassword = 'Click1SecureKey2024') {
    try {
        const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
        
        // Extract IV (first 12 bytes)
        const iv = combined.slice(0, 12);
        const encrypted = combined.slice(12);
        
        const key = await deriveKey(keyPassword, 'Click1Salt');
        
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encrypted
        );
        
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (error) {
        console.error('Decryption error:', error);
        return null;
    }
}

// ==================== LOCALSTORAGE ENCRYPTION ====================
/**
 * Securely store data in LocalStorage (encrypted)
 * @param {string} key - Storage key
 * @param {*} data - Data to store
 */
async function secureStore(key, data) {
    const jsonData = JSON.stringify(data);
    const encrypted = await encryptData(jsonData);
    if (encrypted) {
        localStorage.setItem(key, encrypted);
    }
}

/**
 * Retrieve and decrypt data from LocalStorage
 * @param {string} key - Storage key
 * @returns {Promise<*>} - Decrypted data
 */
async function secureRetrieve(key) {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    
    const decrypted = await decryptData(encrypted);
    if (!decrypted) return null;
    
    try {
        return JSON.parse(decrypted);
    } catch {
        return null;
    }
}

/**
 * Remove secure data from LocalStorage
 * @param {string} key - Storage key
 */
function secureRemove(key) {
    localStorage.removeItem(key);
}

// ==================== SESSION MANAGEMENT ====================
/**
 * Generate secure random token
 * @param {number} length - Token length
 * @returns {string} - Random token
 */
function generateSessionToken(length = SECURITY_CONFIG.TOKEN_LENGTH) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => chars[byte % chars.length]).join('');
}

/**
 * Create new session
 * @returns {Object} - Session data
 */
function createSession() {
    const token = generateSessionToken();
    const now = Date.now();
    const session = {
        token: token,
        createdAt: now,
        expiresAt: now + (SECURITY_CONFIG.SESSION_DURATION_MINUTES * 60 * 1000),
        lastActivity: now
    };
    
    sessionStorage.setItem('adminSession', JSON.stringify(session));
    return session;
}

/**
 * Get current session
 * @returns {Object|null} - Session data or null
 */
function getSession() {
    const sessionData = sessionStorage.getItem('adminSession');
    if (!sessionData) return null;
    
    try {
        const session = JSON.parse(sessionData);
        const now = Date.now();
        
        // Check if session expired
        if (now > session.expiresAt) {
            clearSession();
            return null;
        }
        
        return session;
    } catch {
        return null;
    }
}

/**
 * Verify session token
 * @param {string} token - Token to verify
 * @returns {boolean} - Valid or not
 */
function verifySessionToken(token) {
    const session = getSession();
    return session && session.token === token;
}

/**
 * Update last activity timestamp
 */
function updateActivity() {
    const session = getSession();
    if (session) {
        session.lastActivity = Date.now();
        sessionStorage.setItem('adminSession', JSON.stringify(session));
    }
}

/**
 * Clear session (logout)
 */
function clearSession() {
    sessionStorage.removeItem('adminSession');
}

/**
 * Check if session is valid
 * @returns {boolean} - Session validity
 */
function isSessionValid() {
    const session = getSession();
    if (!session) return false;
    
    const now = Date.now();
    
    // Check session expiration
    if (now > session.expiresAt) {
        clearSession();
        return false;
    }
    
    // Check inactivity
    const inactiveTime = now - session.lastActivity;
    const maxInactiveTime = SECURITY_CONFIG.INACTIVITY_TIMEOUT_MINUTES * 60 * 1000;
    
    if (inactiveTime > maxInactiveTime) {
        clearSession();
        return false;
    }
    
    return true;
}

// ==================== LOGIN ATTEMPT TRACKING ====================
const LOGIN_ATTEMPTS_KEY = 'loginAttempts';
const LOCKOUT_KEY = 'loginLockout';

/**
 * Get login attempts data
 * @returns {Object} - Attempts data
 */
function getLoginAttempts() {
    const data = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
    return data ? JSON.parse(data) : { count: 0, timestamp: null };
}

/**
 * Record failed login attempt
 */
function recordFailedAttempt() {
    const attempts = getLoginAttempts();
    attempts.count++;
    attempts.timestamp = Date.now();
    localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(attempts));
    
    // Lock if max attempts reached
    if (attempts.count >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
        setLockout();
    }
}

/**
 * Reset login attempts
 */
function resetLoginAttempts() {
    localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
}

/**
 * Set lockout
 */
function setLockout() {
    const lockoutEnd = Date.now() + (SECURITY_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000);
    localStorage.setItem(LOCKOUT_KEY, JSON.stringify({ until: lockoutEnd }));
}

/**
 * Check if login is locked
 * @returns {Object} - Lock status
 */
function isLoginLocked() {
    const lockData = localStorage.getItem(LOCKOUT_KEY);
    if (!lockData) return { locked: false, remaining: 0 };
    
    const lockout = JSON.parse(lockData);
    const now = Date.now();
    
    if (now < lockout.until) {
        const remaining = Math.ceil((lockout.until - now) / 1000 / 60);
        return { locked: true, remaining: remaining };
    } else {
        // Lock expired, clear it
        localStorage.removeItem(LOCKOUT_KEY);
        resetLoginAttempts();
        return { locked: false, remaining: 0 };
    }
}

// ==================== INPUT SANITIZATION ====================
/**
 * Sanitize user input to prevent XSS
 * @param {string} input - Raw input
 * @returns {string} - Sanitized input
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - Valid or not
 */
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Validate phone number (Indian format)
 * @param {string} phone - Phone to validate
 * @returns {boolean} - Valid or not
 */
function isValidPhone(phone) {
    const regex = /^[6-9]\d{9}$/;
    return regex.test(phone.replace(/\s/g, ''));
}

/**
 * Validate form field is not empty
 * @param {string} value - Field value
 * @returns {boolean} - Valid or not
 */
function isNotEmpty(value) {
    return value && value.trim().length > 0;
}

// ==================== ADMIN AUTHENTICATION ====================
/**
 * Authenticate admin
 * @param {string} username - Admin username
 * @param {string} password - Admin password
 * @returns {Promise<Object>} - Auth result
 */
async function authenticateAdmin(username, password) {
    // Check lockout
    const lockStatus = isLoginLocked();
    if (lockStatus.locked) {
        return {
            success: false,
            message: `Account locked. Try again in ${lockStatus.remaining} minutes.`,
            locked: true
        };
    }
    
    // Validate password length
    if (password.length < SECURITY_CONFIG.MIN_PASSWORD_LENGTH) {
        return {
            success: false,
            message: `Password must be at least ${SECURITY_CONFIG.MIN_PASSWORD_LENGTH} characters.`,
            locked: false
        };
    }
    
    // Hash and compare
    const usernameMatch = await verifyHash(username, ADMIN_CREDENTIALS.usernameHash);
    const passwordMatch = await verifyHash(password, ADMIN_CREDENTIALS.passwordHash);
    
    if (usernameMatch && passwordMatch) {
        resetLoginAttempts();
        const session = createSession();
        return {
            success: true,
            message: 'Login successful',
            token: session.token
        };
    } else {
        recordFailedAttempt();
        const attempts = getLoginAttempts();
        const remaining = SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - attempts.count;
        
        return {
            success: false,
            message: remaining > 0 
                ? `Invalid credentials. ${remaining} attempts remaining.`
                : 'Account locked due to too many failed attempts.',
            locked: remaining === 0
        };
    }
}

// ==================== PAGE PROTECTION ====================
/**
 * Protect admin page - redirect if not authenticated
 */
function protectAdminPage() {
    if (!isSessionValid()) {
        clearSession();
        window.location.href = 'admin-login.html';
        return false;
    }
    updateActivity();
    return true;
}

/**
 * Prevent back button after logout
 */
function preventBackAfterLogout() {
    if (!isSessionValid()) {
        window.history.pushState(null, '', window.location.href);
        window.onpopstate = function() {
            window.history.pushState(null, '', window.location.href);
            window.location.href = 'admin-login.html';
        };
    }
}

/**
 * Setup inactivity monitoring
 */
function setupInactivityMonitor() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
        document.addEventListener(event, updateActivity, true);
    });
    
    // Periodic check
    setInterval(() => {
        if (!isSessionValid() && window.location.pathname.includes('admin-dashboard')) {
            clearSession();
            alert('Session expired due to inactivity.');
            window.location.href = 'admin-login.html';
        }
    }, 30000); // Check every 30 seconds
}

/**
 * Setup visibility change detection
 */
function setupVisibilityDetection() {
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Tab hidden - could optionally logout here
            // For now, we rely on inactivity timeout
        } else {
            // Tab visible again - check session
            if (window.location.pathname.includes('admin-dashboard') && !isSessionValid()) {
                window.location.href = 'admin-login.html';
            }
        }
    });
}

// ==================== INITIALIZATION ====================
/**
 * Initialize security for admin pages
 */
function initAdminSecurity() {
    if (window.location.pathname.includes('admin-dashboard')) {
        protectAdminPage();
        preventBackAfterLogout();
        setupInactivityMonitor();
        setupVisibilityDetection();
    }
}

// Run initialization
document.addEventListener('DOMContentLoaded', initAdminSecurity);

// Export for use in other scripts
window.SecurityModule = {
    sha256,
    verifyHash,
    encryptData,
    decryptData,
    secureStore,
    secureRetrieve,
    secureRemove,
    createSession,
    getSession,
    verifySessionToken,
    clearSession,
    isSessionValid,
    updateActivity,
    authenticateAdmin,
    isLoginLocked,
    sanitizeInput,
    isValidEmail,
    isValidPhone,
    isNotEmpty,
    protectAdminPage,
    COMPANY_CONTACT,
    SECURITY_CONFIG
};
