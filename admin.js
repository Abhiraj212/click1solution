/**
 * Click1Solutions - Admin Dashboard JavaScript
 * ============================================
 * Admin dashboard functionality for managing staff/vendor requests
 */

// ==================== ADMIN AUTHENTICATION CHECK ====================
document.addEventListener('DOMContentLoaded', async function() {
    // Check if security module is loaded
    if (typeof SecurityModule === 'undefined') {
        console.error('Security module not loaded');
        window.location.href = 'admin-login.html';
        return;
    }
    
    // Verify session
    if (!SecurityModule.isSessionValid()) {
        SecurityModule.clearSession();
        window.location.href = 'admin-login.html';
        return;
    }
    
    // Update activity on user interaction
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
        document.addEventListener(event, SecurityModule.updateActivity, true);
    });
    
    // Initialize dashboard
    await initDashboard();
});

// ==================== DASHBOARD INITIALIZATION ====================
async function initDashboard() {
    await updateStats();
    await renderRequests('all');
}

// ==================== UPDATE STATISTICS ====================
async function updateStats() {
    try {
        const requests = await SecurityModule.secureRetrieve('staffRequests') || [];
        
        const pending = requests.filter(r => r.status === 'pending').length;
        const approved = requests.filter(r => r.status === 'approved').length;
        const rejected = requests.filter(r => r.status === 'rejected').length;
        const total = requests.length;
        
        document.getElementById('pendingCount').textContent = pending;
        document.getElementById('approvedCount').textContent = approved;
        document.getElementById('rejectedCount').textContent = rejected;
        document.getElementById('totalCount').textContent = total;
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// ==================== RENDER REQUESTS TABLE ====================
async function renderRequests(filter = 'all') {
    try {
        const requests = await SecurityModule.secureRetrieve('staffRequests') || [];
        const tableBody = document.getElementById('requestsTableBody');
        const emptyState = document.getElementById('emptyState');
        const table = document.getElementById('requestsTable');
        
        // Filter requests
        let filteredRequests = requests;
        if (filter !== 'all') {
            filteredRequests = requests.filter(r => r.status === filter);
        }
        
        // Sort by date (newest first)
        filteredRequests.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        
        // Show/hide empty state
        if (filteredRequests.length === 0) {
            table.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        } else {
            table.style.display = 'table';
            emptyState.style.display = 'none';
        }
        
        // Render table rows
        tableBody.innerHTML = filteredRequests.map(request => `
            <tr data-id="${request.id}">
                <td>
                    <strong>${escapeHtml(request.fullName)}</strong>
                    <br>
                    <small style="color: var(--gray);">${escapeHtml(request.email)}</small>
                </td>
                <td>${formatServiceCategory(request.serviceCategory, request.otherService)}</td>
                <td>${escapeHtml(request.location)}</td>
                <td>${formatDate(request.submittedAt)}</td>
                <td><span class="status-badge ${request.status}">${request.status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" onclick="viewDetails('${request.id}')" title="View Details">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                        ${request.status === 'pending' ? `
                            <button class="action-btn approve" onclick="showApproveModal('${request.id}')" title="Approve">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </button>
                            <button class="action-btn reject" onclick="showRejectModal('${request.id}')" title="Reject">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        ` : ''}
                        <button class="action-btn" style="background: rgba(239, 68, 68, 0.1); color: var(--danger);" onclick="showCancelModalStep1('${request.id}')" title="Cancel/Delete">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error rendering requests:', error);
        showToast('Error loading requests', 'error');
    }
}

// ==================== VIEW DETAILS ====================
async function viewDetails(requestId) {
    try {
        const requests = await SecurityModule.secureRetrieve('staffRequests') || [];
        const request = requests.find(r => r.id === requestId);
        
        if (!request) {
            showToast('Request not found', 'error');
            return;
        }
        
        const detailsHtml = `
            <div style="margin-bottom: var(--space-md);">
                <strong style="color: var(--gray); font-size: 0.875rem;">Full Name</strong>
                <p style="margin-top: 4px;">${escapeHtml(request.fullName)}</p>
            </div>
            <div style="margin-bottom: var(--space-md);">
                <strong style="color: var(--gray); font-size: 0.875rem;">Email</strong>
                <p style="margin-top: 4px;">${escapeHtml(request.email)}</p>
            </div>
            <div style="margin-bottom: var(--space-md);">
                <strong style="color: var(--gray); font-size: 0.875rem;">Phone</strong>
                <p style="margin-top: 4px;">${escapeHtml(request.phone)}</p>
            </div>
            <div style="margin-bottom: var(--space-md);">
                <strong style="color: var(--gray); font-size: 0.875rem;">Service Category</strong>
                <p style="margin-top: 4px;">${formatServiceCategory(request.serviceCategory, request.otherService)}</p>
            </div>
            <div style="margin-bottom: var(--space-md);">
                <strong style="color: var(--gray); font-size: 0.875rem;">Experience</strong>
                <p style="margin-top: 4px;">${escapeHtml(request.experience)} years</p>
            </div>
            <div style="margin-bottom: var(--space-md);">
                <strong style="color: var(--gray); font-size: 0.875rem;">Location</strong>
                <p style="margin-top: 4px;">${escapeHtml(request.location)}</p>
            </div>
            <div style="margin-bottom: var(--space-md);">
                <strong style="color: var(--gray); font-size: 0.875rem;">Description</strong>
                <p style="margin-top: 4px; line-height: 1.6;">${escapeHtml(request.description)}</p>
            </div>
            <div style="margin-bottom: var(--space-md);">
                <strong style="color: var(--gray); font-size: 0.875rem;">Submitted On</strong>
                <p style="margin-top: 4px;">${formatDateTime(request.submittedAt)}</p>
            </div>
            <div>
                <strong style="color: var(--gray); font-size: 0.875rem;">Status</strong>
                <p style="margin-top: 4px;"><span class="status-badge ${request.status}">${request.status}</span></p>
            </div>
        `;
        
        document.getElementById('requestDetails').innerHTML = detailsHtml;
        document.getElementById('detailsModal').classList.add('active');
    } catch (error) {
        console.error('Error viewing details:', error);
        showToast('Error loading details', 'error');
    }
}

// ==================== APPROVE REQUEST ====================
let currentActionId = null;

function showApproveModal(requestId) {
    currentActionId = requestId;
    document.getElementById('approvalModal').classList.add('active');
}

async function approveRequest() {
    if (!currentActionId) return;
    
    try {
        let requests = await SecurityModule.secureRetrieve('staffRequests') || [];
        const requestIndex = requests.findIndex(r => r.id === currentActionId);
        
        if (requestIndex === -1) {
            showToast('Request not found', 'error');
            return;
        }
        
        // Update status
        requests[requestIndex].status = 'approved';
        requests[requestIndex].approvedAt = new Date().toISOString();
        
        // Save updated data
        await SecurityModule.secureStore('staffRequests', requests);
        
        // Close modal
        closeApprovalModal();
        
        // Refresh display
        await updateStats();
        const activeFilter = document.querySelector('.filter-btn.active');
        await renderRequests(activeFilter ? activeFilter.dataset.filter : 'all');
        
        showToast('Request approved successfully', 'success');
    } catch (error) {
        console.error('Error approving request:', error);
        showToast('Error approving request', 'error');
    }
    
    currentActionId = null;
}

// ==================== REJECT REQUEST ====================
function showRejectModal(requestId) {
    currentActionId = requestId;
    document.getElementById('rejectionModal').classList.add('active');
}

async function rejectRequest() {
    if (!currentActionId) return;
    
    try {
        let requests = await SecurityModule.secureRetrieve('staffRequests') || [];
        const requestIndex = requests.findIndex(r => r.id === currentActionId);
        
        if (requestIndex === -1) {
            showToast('Request not found', 'error');
            return;
        }
        
        // Update status
        requests[requestIndex].status = 'rejected';
        requests[requestIndex].rejectedAt = new Date().toISOString();
        
        // Save updated data
        await SecurityModule.secureStore('staffRequests', requests);
        
        // Close modal
        closeRejectionModal();
        
        // Refresh display
        await updateStats();
        const activeFilter = document.querySelector('.filter-btn.active');
        await renderRequests(activeFilter ? activeFilter.dataset.filter : 'all');
        
        showToast('Request rejected', 'success');
    } catch (error) {
        console.error('Error rejecting request:', error);
        showToast('Error rejecting request', 'error');
    }
    
    currentActionId = null;
}

// ==================== CANCEL/DELETE REQUEST (DOUBLE CONFIRMATION) ====================
let cancelStep = 1;

function showCancelModalStep1(requestId) {
    currentActionId = requestId;
    cancelStep = 1;
    document.getElementById('cancelStep1').classList.add('active');
    document.getElementById('cancelStep2').classList.remove('active');
    document.getElementById('cancelModal').classList.add('active');
}

function proceedToCancelStep2() {
    cancelStep = 2;
    document.getElementById('cancelStep1').classList.remove('active');
    document.getElementById('cancelStep2').classList.add('active');
}

function goBackToCancelStep1() {
    cancelStep = 1;
    document.getElementById('cancelStep2').classList.remove('active');
    document.getElementById('cancelStep1').classList.add('active');
}

function closeCancelModal() {
    document.getElementById('cancelModal').classList.remove('active');
    currentActionId = null;
    cancelStep = 1;
}

async function confirmCancelRequest() {
    if (!currentActionId) return;
    
    try {
        let requests = await SecurityModule.secureRetrieve('staffRequests') || [];
        const initialLength = requests.length;
        
        // Remove the request completely
        requests = requests.filter(r => r.id !== currentActionId);
        
        if (requests.length < initialLength) {
            // Save updated list
            await SecurityModule.secureStore('staffRequests', requests);
            
            // Close modal
            closeCancelModal();
            
            // Refresh display
            await updateStats();
            const activeFilter = document.querySelector('.filter-btn.active');
            await renderRequests(activeFilter ? activeFilter.dataset.filter : 'all');
            
            showToast('Request permanently deleted', 'success');
        } else {
            showToast('Request not found', 'error');
            closeCancelModal();
        }
    } catch (error) {
        console.error('Error deleting request:', error);
        showToast('Error deleting request', 'error');
        closeCancelModal();
    }
}

// ==================== HELPER FUNCTIONS ====================
/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format service category for display
 * @param {string} category - Category code
 * @param {string} otherService - Other service text
 * @returns {string} - Formatted category
 */
function formatServiceCategory(category, otherService) {
    const categories = {
        'construction': 'Construction',
        'food': 'Food Services',
        'travel': 'Travel & Tourism',
        'gst': 'GST Services',
        'marketing': 'Digital Marketing',
        'it': 'IT Solutions',
        'other': otherService || 'Other'
    };
    return categories[category] || category;
}

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * Format date and time for display
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date and time
 */
function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${type === 'success' 
                ? '<polyline points="20 6 9 17 4 12"></polyline>'
                : type === 'error'
                ? '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'
                : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>'
            }
        </svg>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', function() {
    // Confirm approve button
    const confirmApproveBtn = document.getElementById('confirmApproveBtn');
    if (confirmApproveBtn) {
        confirmApproveBtn.addEventListener('click', approveRequest);
    }
    
    // Confirm reject button
    const confirmRejectBtn = document.getElementById('confirmRejectBtn');
    if (confirmRejectBtn) {
        confirmRejectBtn.addEventListener('click', rejectRequest);
    }
});

// ==================== PREVENT BACK BUTTON AFTER LOGOUT ====================
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        // Page was loaded from cache (back button)
        if (!SecurityModule.isSessionValid()) {
            window.location.href = 'admin-login.html';
        }
    }
});

// ==================== VISIBILITY CHANGE HANDLER ====================
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        // Check session when tab becomes visible
        if (!SecurityModule.isSessionValid()) {
            SecurityModule.clearSession();
            window.location.href = 'admin-login.html';
        }
    }
});

// ==================== EXPORT FUNCTIONS ====================
window.viewDetails = viewDetails;
window.showApproveModal = showApproveModal;
window.showRejectModal = showRejectModal;
window.closeApprovalModal = function() {
    document.getElementById('approvalModal').classList.remove('active');
    currentActionId = null;
};
window.closeRejectionModal = function() {
    document.getElementById('rejectionModal').classList.remove('active');
    currentActionId = null;
};
window.closeDetailsModal = function() {
    document.getElementById('detailsModal').classList.remove('active');
};
