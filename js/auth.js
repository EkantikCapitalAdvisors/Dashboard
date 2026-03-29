// =====================================================
// CLERK AUTHENTICATION — Phase 1
// Ekantik Capital Dashboard
// =====================================================
//
// Clerk instance: separate from research portal
// Auth method: magic link only
// Sign-up mode: restricted (allowlist-based)
// Admin emails: hjdesai@gmail.com, hd@ekantikcapital.com
// =====================================================

const EkantikAuth = (() => {
    // ── Config ──
    const CLERK_PUB_KEY = window.__CLERK_PUBLISHABLE_KEY__ || '';
    const ADMIN_EMAILS = ['hjdesai@gmail.com', 'hd@ekantikcapital.com'];

    let clerkInstance = null;
    let currentUser = null;

    // ── DOM References ──
    const $ = id => document.getElementById(id);

    // ── Initialization ──
    async function init() {
        // If no Clerk key configured, fall back to open access (dev mode)
        if (!CLERK_PUB_KEY) {
            console.warn('[Auth] No Clerk publishable key found. Running in open mode.');
            showDashboard();
            enableDevAdminFallback();
            return;
        }

        try {
            clerkInstance = new window.Clerk(CLERK_PUB_KEY);
            await clerkInstance.load();

            if (clerkInstance.user) {
                currentUser = clerkInstance.user;
                onAuthenticated();
            } else {
                showSignInGate();
            }
        } catch (err) {
            console.error('[Auth] Clerk initialization failed:', err);
            // On Clerk failure, show gate with error message
            showSignInGate('Authentication service unavailable. Please try again later.');
        }
    }

    // ── Authenticated User Flow ──
    function onAuthenticated() {
        currentUser = clerkInstance.user;
        const email = getPrimaryEmail();
        const isAdmin = checkAdminRole();

        console.log(`[Auth] Authenticated: ${email} | Admin: ${isAdmin}`);

        hideSignInGate();
        showDashboard();

        if (isAdmin) {
            enableAdminFeatures();
        }

        // Add user indicator to header
        renderUserBadge(email, isAdmin);
    }

    // ── Sign-In Gate ──
    function showSignInGate(errorMsg) {
        const gate = $('auth-gate');
        const dashboard = $('dashboard-content');

        if (gate) gate.classList.remove('hidden');
        if (dashboard) {
            dashboard.classList.add('auth-blurred');
            dashboard.setAttribute('aria-hidden', 'true');
            dashboard.inert = true;
        }

        // If there's an error, show it
        if (errorMsg) {
            const errEl = $('auth-error-message');
            if (errEl) {
                errEl.textContent = errorMsg;
                errEl.classList.remove('hidden');
            }
        }
    }

    function hideSignInGate() {
        const gate = $('auth-gate');
        const dashboard = $('dashboard-content');

        if (gate) gate.classList.add('hidden');
        if (dashboard) {
            dashboard.classList.remove('auth-blurred');
            dashboard.removeAttribute('aria-hidden');
            dashboard.inert = false;
        }
    }

    function showDashboard() {
        const dashboard = $('dashboard-content');
        if (dashboard) {
            dashboard.classList.remove('auth-blurred');
            dashboard.removeAttribute('aria-hidden');
            dashboard.inert = false;
        }
    }

    // ── Magic Link Sign-In ──
    async function sendMagicLink(email) {
        if (!clerkInstance) return;

        const statusEl = $('auth-status');
        const emailInput = $('auth-email-input');
        const submitBtn = $('auth-submit-btn');

        // Validate email
        if (!email || !email.includes('@')) {
            showAuthStatus('Please enter a valid email address.', 'error');
            return;
        }

        // Disable form while processing
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sending...';
        }

        try {
            // Try to create a sign-in with magic link
            const signIn = await clerkInstance.client.signIn.create({
                identifier: email,
            });

            // Prepare magic link
            const { supportedFirstFactors } = signIn;
            const emailFactor = supportedFirstFactors.find(
                f => f.strategy === 'email_link' && f.safeIdentifier === email
            );

            if (emailFactor) {
                await signIn.prepareFirstFactor({
                    strategy: 'email_link',
                    emailAddressId: emailFactor.emailAddressId,
                    redirectUrl: window.location.origin + window.location.pathname,
                });
                showMagicLinkSent(email);
            } else {
                // Fallback: try email code if magic link isn't available
                const codeFactor = supportedFirstFactors.find(
                    f => f.strategy === 'email_code'
                );
                if (codeFactor) {
                    await signIn.prepareFirstFactor({
                        strategy: 'email_code',
                        emailAddressId: codeFactor.emailAddressId,
                    });
                    showMagicLinkSent(email);
                } else {
                    showAuthStatus('Unable to send access link. Please try again.', 'error');
                }
            }
        } catch (err) {
            console.error('[Auth] Sign-in error:', err);

            if (err.errors && err.errors[0]) {
                const clerkError = err.errors[0];
                if (clerkError.code === 'form_identifier_not_found') {
                    // Email not on allowlist — show access request form
                    showAccessRequestForm(email);
                    return;
                }
                showAuthStatus(clerkError.longMessage || clerkError.message, 'error');
            } else {
                showAuthStatus('Something went wrong. Please try again.', 'error');
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Send Access Link';
            }
        }
    }

    function showMagicLinkSent(email) {
        const formEl = $('auth-sign-in-form');
        const sentEl = $('auth-link-sent');
        const sentEmail = $('auth-sent-email');

        if (formEl) formEl.classList.add('hidden');
        if (sentEl) sentEl.classList.remove('hidden');
        if (sentEmail) sentEmail.textContent = email;

        // Poll for session completion
        pollForSession();
    }

    async function pollForSession() {
        if (!clerkInstance) return;

        const poll = setInterval(async () => {
            try {
                const client = await clerkInstance.client.fetch();
                if (client.sessions.length > 0) {
                    clearInterval(poll);
                    await clerkInstance.setActive({ session: client.sessions[0].id });
                    onAuthenticated();
                }
            } catch (e) {
                // Silently continue polling
            }
        }, 3000);

        // Stop polling after 10 minutes
        setTimeout(() => clearInterval(poll), 600000);
    }

    // ── Access Request Form (non-allowlisted emails) ──
    function showAccessRequestForm(email) {
        const formEl = $('auth-sign-in-form');
        const requestEl = $('auth-request-form');
        const requestEmail = $('auth-request-email');

        if (formEl) formEl.classList.add('hidden');
        if (requestEl) requestEl.classList.remove('hidden');
        if (requestEmail) requestEmail.value = email || '';
    }

    async function submitAccessRequest() {
        const email = ($('auth-request-email') || {}).value;
        const name = ($('auth-request-name') || {}).value;
        const source = ($('auth-request-source') || {}).value;
        const submitBtn = $('auth-request-submit-btn');

        if (!email || !email.includes('@')) {
            showAuthStatus('Please enter a valid email.', 'error', 'auth-request-status');
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Submitting...';
        }

        try {
            // Store request in localStorage for admin to review
            // In production, this would POST to an API endpoint
            const requests = JSON.parse(localStorage.getItem('eca-access-requests') || '[]');
            requests.push({
                email,
                name: name || null,
                source: source || 'organic',
                requestedAt: new Date().toISOString(),
                status: 'pending'
            });
            localStorage.setItem('eca-access-requests', JSON.stringify(requests));

            // Show confirmation
            const requestEl = $('auth-request-form');
            const confirmEl = $('auth-request-confirmed');
            if (requestEl) requestEl.classList.add('hidden');
            if (confirmEl) confirmEl.classList.remove('hidden');

        } catch (err) {
            console.error('[Auth] Access request error:', err);
            showAuthStatus('Unable to submit request. Please try again.', 'error', 'auth-request-status');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Request Access';
            }
        }
    }

    // ── Admin Role Check ──
    function checkAdminRole() {
        if (!currentUser) return false;

        // Check Clerk publicMetadata for role
        const metadata = currentUser.publicMetadata || {};
        if (metadata.role === 'admin') return true;

        // Fallback: check email against known admin emails
        const email = getPrimaryEmail();
        return ADMIN_EMAILS.includes(email?.toLowerCase());
    }

    function getPrimaryEmail() {
        if (!currentUser) return null;
        const primary = currentUser.primaryEmailAddress;
        return primary ? primary.emailAddress : null;
    }

    // ── Admin Feature Activation ──
    function enableAdminFeatures() {
        // Show all admin-only elements (replaces ?admin URL param check)
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');

        // Auto-expand detailed dashboard for admin
        setTimeout(() => {
            const panel = document.getElementById('detailed-dashboard-discord');
            if (panel && panel.classList.contains('hidden')) {
                if (typeof toggleDetailedDashboard === 'function') {
                    toggleDetailedDashboard('discord');
                }
            }
        }, 500);

        // Add admin indicator
        const adminBadge = document.createElement('div');
        adminBadge.className = 'fixed bottom-4 left-4 z-50 bg-[#d4af37]/20 border border-[#d4af37]/40 rounded-lg px-3 py-1.5 hidden lg:block';
        adminBadge.innerHTML = '<span class="text-[#d4af37] text-[10px] font-bold uppercase tracking-wider"><i class="fas fa-shield-alt mr-1"></i>Admin Mode</span>';
        document.body.appendChild(adminBadge);
    }

    // ── Dev Mode Fallback (no Clerk key) ──
    function enableDevAdminFallback() {
        // Preserve existing ?admin param behavior for development
        if (new URLSearchParams(window.location.search).has('admin')) {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
            setTimeout(() => {
                const panel = document.getElementById('detailed-dashboard-discord');
                if (panel && panel.classList.contains('hidden')) {
                    if (typeof toggleDetailedDashboard === 'function') {
                        toggleDetailedDashboard('discord');
                    }
                }
            }, 500);
        }
    }

    // ── User Badge in Header ──
    function renderUserBadge(email, isAdmin) {
        const nav = document.querySelector('header nav');
        if (!nav) return;

        // Remove any existing user badge
        const existing = document.getElementById('user-badge');
        if (existing) existing.remove();

        const badge = document.createElement('div');
        badge.id = 'user-badge';
        badge.className = 'flex items-center gap-2';

        const initial = (email || '?')[0].toUpperCase();
        const roleColor = isAdmin ? 'bg-[#d4af37]/20 border-[#d4af37]/40 text-[#d4af37]' : 'bg-blue-500/20 border-blue-400/40 text-blue-400';

        badge.innerHTML = `
            <div class="hidden sm:block w-px h-5 bg-gray-700"></div>
            <div class="relative group">
                <button class="flex items-center gap-2 px-3 py-1.5 rounded-lg ${roleColor} border text-xs font-semibold transition-all hover:opacity-80">
                    <div class="w-6 h-6 rounded-full bg-current/20 flex items-center justify-center text-[10px] font-bold">${initial}</div>
                    <span class="hidden sm:inline">${isAdmin ? 'Admin' : email.split('@')[0]}</span>
                    <i class="fas fa-chevron-down text-[8px] opacity-60"></i>
                </button>
                <div class="absolute top-full right-0 pt-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50">
                    <div class="bg-[#0d1d35] border border-gray-700/50 rounded-xl shadow-2xl shadow-black/40 p-2 w-56">
                        <div class="px-3 py-2 border-b border-gray-700/30 mb-1">
                            <p class="text-white text-xs font-semibold truncate">${email}</p>
                            ${isAdmin ? '<p class="text-[#d4af37] text-[10px] mt-0.5"><i class="fas fa-shield-alt mr-1"></i>Administrator</p>' : '<p class="text-gray-500 text-[10px] mt-0.5">Dashboard Access</p>'}
                        </div>
                        <button onclick="EkantikAuth.signOut()" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors text-xs">
                            <i class="fas fa-sign-out-alt"></i>Sign Out
                        </button>
                    </div>
                </div>
            </div>
        `;

        nav.appendChild(badge);
    }

    // ── Sign Out ──
    async function signOut() {
        if (clerkInstance) {
            try {
                await clerkInstance.signOut();
            } catch (e) {
                console.error('[Auth] Sign out error:', e);
            }
        }
        window.location.reload();
    }

    // ── Status Messages ──
    function showAuthStatus(msg, type, containerId) {
        const el = $(containerId || 'auth-status');
        if (!el) return;

        el.textContent = msg;
        el.className = 'text-xs text-center mt-3 px-4 py-2 rounded-lg ' +
            (type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
             type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
             'bg-blue-500/10 text-blue-400 border border-blue-500/20');
        el.classList.remove('hidden');
    }

    // ── Public API ──
    return {
        init,
        sendMagicLink,
        submitAccessRequest,
        showAccessRequestForm: () => {
            const formEl = $('auth-sign-in-form');
            const requestEl = $('auth-request-form');
            if (formEl) formEl.classList.add('hidden');
            if (requestEl) requestEl.classList.remove('hidden');
        },
        backToSignIn: () => {
            const formEl = $('auth-sign-in-form');
            const requestEl = $('auth-request-form');
            const sentEl = $('auth-link-sent');
            if (formEl) formEl.classList.remove('hidden');
            if (requestEl) requestEl.classList.add('hidden');
            if (sentEl) sentEl.classList.add('hidden');
        },
        signOut,
        isAdmin: () => checkAdminRole(),
        getUser: () => currentUser,
        getEmail: () => getPrimaryEmail(),
    };
})();
