// --- Global State ---
let currentUser = null;
let sseSource = null;

// --- DOM Elements ---
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const themeToggle = document.getElementById('theme-toggle');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    checkAuth();
    setupEventListeners();
});

// --- Theme ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
});

// --- Utilities ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function getAuthHeaders(isFileUpload = false) {
    const token = sessionStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };
    if (!isFileUpload) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
}

// --- Authentication ---
async function checkAuth() {
    const token = sessionStorage.getItem('token');
    if (!token) {
        showLogin();
        return;
    }

    try {
        const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
        if (res.ok) {
            const data = await res.json();
            currentUser = data.user;
            showDashboard();
        } else {
            sessionStorage.removeItem('token');
            showLogin();
        }
    } catch (err) {
        showLogin();
    }
}

function showLogin() {
    loginView.classList.add('active-view');
    loginView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
    dashboardView.classList.remove('active-view');
    if (sseSource) sseSource.close();
}

function showDashboard() {
    loginView.classList.add('hidden');
    loginView.classList.remove('active-view');
    dashboardView.classList.remove('hidden');
    dashboardView.classList.add('active-view');
    
    // Set user info
    document.getElementById('user-avatar').textContent = currentUser.username.charAt(0).toUpperCase();
    document.getElementById('user-name-display').textContent = currentUser.username;
    document.getElementById('user-role-display').textContent = currentUser.role;

    // Handle Role UI
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = currentUser.role === 'admin' ? '' : 'none';
    });
    document.querySelectorAll('.analyst-admin-only').forEach(el => {
        el.style.display = (currentUser.role === 'admin' || currentUser.role === 'analyst') ? '' : 'none';
    });

    loadSection('section-incidents');
    setupSSE();
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        
        if (res.ok) {
            sessionStorage.setItem('token', data.token);
            currentUser = data.user;
            showDashboard();
            showToast('Logged in successfully');
        } else {
            showToast(data.error || 'Login failed', 'error');
        }
    } catch (err) {
        showToast('Connection error', 'error');
    }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        await fetch('/api/auth/logout', { method: 'POST', headers: getAuthHeaders() });
    } catch (e) {} // ignore errors on logout
    sessionStorage.removeItem('token');
    currentUser = null;
    showLogin();
});

// --- Navigation ---
function setupEventListeners() {
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('nav-active'));
            link.classList.add('nav-active');
            const target = link.getAttribute('data-target');
            loadSection(target);
        });
    });

    // Modals Close
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.add('hidden');
        });
    });

    // Alert Ticker
    document.getElementById('close-ticker').addEventListener('click', () => {
        document.getElementById('alert-ticker').classList.add('hidden');
    });

    // Incidents Setup
    document.getElementById('btn-new-incident').addEventListener('click', openIncidentModal);
    document.getElementById('incident-form').addEventListener('submit', handleIncidentSubmit);
    
    // Filters
    document.getElementById('search-incidents').addEventListener('input', fetchIncidents);
    document.getElementById('filter-severity').addEventListener('change', fetchIncidents);
    document.getElementById('filter-status').addEventListener('change', fetchIncidents);

    // Messages Setup
    document.getElementById('btn-compose-message').addEventListener('click', openComposeModal);
    document.getElementById('message-form').addEventListener('submit', handleMessageSubmit);

    // Alerts Setup
    document.getElementById('btn-simulate-alert').addEventListener('click', () => {
        document.getElementById('simulate-alert-modal').classList.remove('hidden');
    });
    document.getElementById('simulate-alert-form').addEventListener('submit', handleSimulateAlert);

    // Audit Setup
    document.getElementById('btn-clear-logs').addEventListener('click', clearAuditLogs);

    // Export/Import Setup
    document.getElementById('btn-export-json').addEventListener('click', () => window.open('/api/export/json?token=' + sessionStorage.getItem('token'), '_blank'));
    document.getElementById('btn-export-csv').addEventListener('click', () => window.open('/api/export/csv?token=' + sessionStorage.getItem('token'), '_blank'));
    document.getElementById('import-form').addEventListener('submit', handleImport);
}

function loadSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');

    if (sectionId === 'section-incidents') fetchIncidents();
    if (sectionId === 'section-messages') fetchMessages();
    if (sectionId === 'section-alerts') fetchAlertsHistory();
    if (sectionId === 'section-audit') fetchAuditLogs();
}

// --- SSE Setup ---
function setupSSE() {
    if (sseSource) sseSource.close();
    sseSource = new EventSource('/api/alerts/stream');
    
    sseSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.connected) return;

        // Show Ticker
        const ticker = document.getElementById('alert-ticker');
        const tickerText = document.getElementById('latest-alert-text');
        tickerText.textContent = `${data.severity.toUpperCase()}: ${data.message} (${new Date(data.timestamp).toLocaleTimeString()})`;
        ticker.classList.remove('hidden');
        
        // Refresh alerts history if on that page
        if (!document.getElementById('section-alerts').classList.contains('hidden')) {
            fetchAlertsHistory();
        }
    };
}

// --- Incidents ---
async function fetchIncidents() {
    const search = document.getElementById('search-incidents').value;
    const severity = document.getElementById('filter-severity').value;
    const status = document.getElementById('filter-status').value;

    let url = `/api/incidents?search=${encodeURIComponent(search)}&severity=${severity}&status=${status}`;

    try {
        const res = await fetch(url, { headers: getAuthHeaders() });
        const incidents = await res.json();
        renderIncidents(incidents);
    } catch (err) {
        showToast('Failed to load incidents', 'error');
    }
}

function renderIncidents(incidents) {
    const tbody = document.getElementById('incidents-tbody');
    tbody.innerHTML = '';
    
    incidents.forEach(inc => {
        const tr = document.createElement('tr');
        
        const attachCount = inc.attachments ? inc.attachments.length : 0;

        tr.innerHTML = `
            <td class="admin-only" style="display: ${currentUser.role === 'admin' ? '' : 'none'}"><input type="checkbox" class="incident-checkbox" value="${inc.id}"></td>
            <td><strong>${inc.name}</strong><br><small class="text-muted">${inc.creator_name || 'Unknown'}</small></td>
            <td>${inc.type}</td>
            <td><span class="badge severity-${inc.severity}">${inc.severity}</span></td>
            <td><span class="badge status-${inc.status}">${inc.status.replace('_', ' ')}</span></td>
            <td>${new Date(inc.date_reported).toLocaleDateString()}</td>
            <td class="actions-cell">
                ${attachCount > 0 ? `<button class="btn btn-secondary btn-view-attach" data-id="${inc.id}">📎 (${attachCount})</button>` : ''}
                ${(currentUser.role === 'admin' || currentUser.role === 'analyst') ? `<button class="btn btn-primary btn-edit" data-id="${inc.id}">Edit</button>` : ''}
                ${currentUser.role === 'admin' ? `<button class="btn btn-danger btn-delete" data-id="${inc.id}">Delete</button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);

        // Attach data for modals
        tr.dataset.incident = JSON.stringify(inc);
    });

    // Edit Events
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            const inc = JSON.parse(row.dataset.incident);
            openIncidentModal(inc);
        });
    });

    // Delete Events
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm('Are you sure you want to delete this incident?')) return;
            const id = e.target.dataset.id;
            try {
                await fetch(`/api/incidents/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
                showToast('Incident deleted');
                fetchIncidents();
            } catch (err) { showToast('Error deleting', 'error'); }
        });
    });

    // View Attachments Events
    document.querySelectorAll('.btn-view-attach').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            const inc = JSON.parse(row.dataset.incident);
            openAttachmentsModal(inc.attachments);
        });
    });
}

function openIncidentModal(incident = null) {
    const modal = document.getElementById('incident-modal');
    const form = document.getElementById('incident-form');
    form.reset();
    document.getElementById('existing-attachments').innerHTML = '';

    if (incident && incident.id) {
        document.getElementById('incident-modal-title').textContent = 'Edit Incident';
        document.getElementById('incident-id').value = incident.id;
        document.getElementById('inc-name').value = incident.name;
        document.getElementById('inc-type').value = incident.type;
        document.getElementById('inc-severity').value = incident.severity;
        document.getElementById('inc-status').value = incident.status;
        document.getElementById('inc-visibility').value = incident.visibility;
        document.getElementById('inc-date').value = incident.date_reported.slice(0, 16);
        document.getElementById('inc-notes').value = incident.notes || '';
        
        // Store existing attachments to send back on update
        if (incident.attachments && incident.attachments.length > 0) {
            form.dataset.existingAttachments = JSON.stringify(incident.attachments);
            incident.attachments.forEach((att, idx) => {
                const p = document.createElement('div');
                p.textContent = `📁 ${att.originalname}`;
                document.getElementById('existing-attachments').appendChild(p);
            });
        } else {
            form.dataset.existingAttachments = '[]';
        }
    } else {
        document.getElementById('incident-modal-title').textContent = 'Report Incident';
        document.getElementById('incident-id').value = '';
        form.dataset.existingAttachments = '[]';
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('inc-date').value = now.toISOString().slice(0, 16);
    }
    
    modal.classList.remove('hidden');
}

async function handleIncidentSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const id = document.getElementById('incident-id').value;
    const isUpdate = !!id;

    const formData = new FormData();
    formData.append('name', document.getElementById('inc-name').value);
    formData.append('type', document.getElementById('inc-type').value);
    formData.append('severity', document.getElementById('inc-severity').value);
    formData.append('status', document.getElementById('inc-status').value);
    formData.append('visibility', document.getElementById('inc-visibility').value);
    
    // Add :00 Z to make it full ISO string if needed
    const d = new Date(document.getElementById('inc-date').value);
    formData.append('date_reported', d.toISOString());
    
    formData.append('notes', document.getElementById('inc-notes').value);

    if (isUpdate) {
        formData.append('existing_attachments', form.dataset.existingAttachments);
    }

    const files = document.getElementById('inc-attachments').files;
    for (let i = 0; i < files.length; i++) {
        formData.append('attachments', files[i]);
    }

    try {
        const url = isUpdate ? `/api/incidents/${id}` : '/api/incidents';
        const method = isUpdate ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: getAuthHeaders(true),
            body: formData
        });

        if (res.ok) {
            showToast(isUpdate ? 'Incident updated' : 'Incident created');
            document.getElementById('incident-modal').classList.add('hidden');
            fetchIncidents();
        } else {
            const data = await res.json();
            showToast(data.error || 'Failed to save', 'error');
        }
    } catch (err) {
        showToast('Connection error', 'error');
    }
}

function openAttachmentsModal(attachments) {
    const list = document.getElementById('view-attachments-list');
    list.innerHTML = '';
    
    attachments.forEach(att => {
        const card = document.createElement('div');
        card.className = 'attachment-card';
        
        let preview = '';
        if (att.mimetype.startsWith('image/')) {
            preview = `<img src="${att.path}" alt="preview">`;
        } else {
            preview = `<div style="font-size: 2rem; margin-bottom:0.5rem">📄</div>`;
        }
        
        card.innerHTML = `
            ${preview}
            <a href="${att.path}" target="_blank" download="${att.originalname}">${att.originalname}</a>
        `;
        list.appendChild(card);
    });
    
    document.getElementById('attachments-modal').classList.remove('hidden');
}

// --- Messages ---
async function fetchMessages() {
    try {
        const res = await fetch('/api/messages/inbox', { headers: getAuthHeaders() });
        const msgs = await res.json();
        const list = document.getElementById('inbox-list');
        list.innerHTML = '';
        
        if (msgs.length === 0) {
            list.innerHTML = '<p class="text-muted">Inbox is empty.</p>';
            return;
        }

        msgs.forEach(msg => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="list-item-header">
                    <div class="list-item-title">${msg.subject}</div>
                    <div class="badge ${!msg.recipient_id ? 'status-open' : ''}">${!msg.recipient_id ? 'BROADCAST' : 'DIRECT'}</div>
                </div>
                <div class="list-item-meta">From: ${msg.sender_name} | ${new Date(msg.timestamp).toLocaleString()}</div>
            `;
            item.addEventListener('click', () => {
                document.getElementById('view-msg-subject').textContent = msg.subject;
                document.getElementById('view-msg-sender').textContent = `From: ${msg.sender_name}`;
                document.getElementById('view-msg-date').textContent = new Date(msg.timestamp).toLocaleString();
                document.getElementById('view-msg-content').textContent = msg.content;
                document.getElementById('view-message-modal').classList.remove('hidden');
            });
            list.appendChild(item);
        });
    } catch (err) {
        showToast('Failed to load messages', 'error');
    }
}

async function openComposeModal() {
    const select = document.getElementById('msg-recipient');
    select.innerHTML = '<option value="broadcast">All Users (Broadcast)</option>';
    
    try {
        const res = await fetch('/api/messages/users', { headers: getAuthHeaders() });
        const users = await res.json();
        users.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = u.username;
            select.appendChild(opt);
        });
    } catch (err) {}
    
    document.getElementById('message-form').reset();
    document.getElementById('message-modal').classList.remove('hidden');
}

async function handleMessageSubmit(e) {
    e.preventDefault();
    const recipient_id = document.getElementById('msg-recipient').value;
    const subject = document.getElementById('msg-subject').value;
    const content = document.getElementById('msg-content').value;

    try {
        const res = await fetch('/api/messages', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ recipient_id, subject, content })
        });
        if (res.ok) {
            showToast('Message sent');
            document.getElementById('message-modal').classList.add('hidden');
            fetchMessages();
        } else {
            showToast('Failed to send message', 'error');
        }
    } catch (err) {
        showToast('Error sending message', 'error');
    }
}

// --- Alerts ---
async function fetchAlertsHistory() {
    try {
        const res = await fetch('/api/alerts', { headers: getAuthHeaders() });
        const alerts = await res.json();
        const list = document.getElementById('alerts-list');
        list.innerHTML = '';
        
        alerts.forEach(al => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="list-item-header">
                    <div class="list-item-title">${al.message}</div>
                    <span class="badge severity-${al.severity}">${al.severity}</span>
                </div>
                <div class="list-item-meta">${new Date(al.timestamp).toLocaleString()}</div>
            `;
            list.appendChild(item);
        });
    } catch (err) {
        showToast('Failed to load alerts', 'error');
    }
}

async function handleSimulateAlert(e) {
    e.preventDefault();
    const message = document.getElementById('sim-alert-message').value;
    const severity = document.getElementById('sim-alert-severity').value;

    try {
        const res = await fetch('/api/alerts/simulate', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ message, severity })
        });
        if (res.ok) {
            showToast('Alert simulated successfully');
            document.getElementById('simulate-alert-modal').classList.add('hidden');
            // SSE will trigger UI update automatically
        } else {
            showToast('Failed to simulate', 'error');
        }
    } catch (err) {
        showToast('Connection error', 'error');
    }
}

// --- Audit Logs ---
async function fetchAuditLogs() {
    try {
        const res = await fetch('/api/audit', { headers: getAuthHeaders() });
        const logs = await res.json();
        const tbody = document.getElementById('audit-tbody');
        tbody.innerHTML = '';
        
        logs.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td>${log.username || 'System'}</td>
                <td><span class="badge">${log.action.replace(/_/g, ' ')}</span></td>
                <td><small>${log.details}</small></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        showToast('Failed to load logs', 'error');
    }
}

async function clearAuditLogs() {
    if (!confirm('Are you sure you want to clear all audit logs?')) return;
    try {
        const res = await fetch('/api/audit', { method: 'DELETE', headers: getAuthHeaders() });
        if (res.ok) {
            showToast('Logs cleared');
            fetchAuditLogs();
        } else {
            showToast('Failed to clear logs', 'error');
        }
    } catch (err) {
        showToast('Connection error', 'error');
    }
}

// --- Data Import ---
async function handleImport(e) {
    e.preventDefault();
    const file = document.getElementById('import-file').files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            const res = await fetch('/api/export/json', { // It's mapped to POST /api/import/json conceptually, let's fix the route name. Wait, the route is POST /api/import/json!
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });
            if (res.ok) {
                showToast('Import successful. Please wait while the page reloads.');
                setTimeout(() => location.reload(), 2000);
            } else {
                showToast('Import failed', 'error');
            }
        } catch (err) {
            showToast('Invalid JSON file', 'error');
        }
    };
    reader.readAsText(file);
}

// Fix the import fetch call above to use correct URL
document.getElementById('import-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = document.getElementById('import-file').files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            const data = JSON.parse(evt.target.result);
            const res = await fetch('/api/import/json', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });
            if (res.ok) {
                showToast('Import successful!');
                document.getElementById('import-form').reset();
            } else {
                showToast('Import failed', 'error');
            }
        } catch (err) {
            showToast('Invalid JSON file', 'error');
        }
    };
    reader.readAsText(file);
});
