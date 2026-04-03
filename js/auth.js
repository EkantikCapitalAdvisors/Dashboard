// =====================================================
// CLERK AUTHENTICATION — Phase 1
// Ekantik Capital Dashboard
// =====================================================
//
// Auth method: magic link (invitation only — add users via dashboard.clerk.com)
// Admin emails: hjdesai@gmail.com, hd@ekantikcapital.com
// =====================================================

const EkantikAuth = (() => {
    const CLERK_PUB_KEY = window.__CLERK_PUBLISHABLE_KEY__ || '';
    const ADMIN_EMAILS = ['hjdesai@gmail.com', 'hd@ekantikcapital.com'];

    let clerkInstance = null;
    let currentUser = null;

    const $ = id => document.getElementById(id);

    // ── Init ──
    async function init() {
        if (!CLERK_PUB_KEY) {
            console.warn('[Auth] No Clerk key. Running in open mode.');
            showDashboard();
            enableDevAdminFallback();
            return;
        }

        try {
            // Wait for Clerk SDK to be ready
            await waitForClerk();

            // Handle magic link redirect: if the URL contains Clerk ticket params,
            // process them before checking user state
            if (hasMagicLinkParams()) {
                await handleMagicLinkRedirect();
            }

            if (clerkInstance.user) {
                onAuthenticated();
            } else {
                showSignInGate();
            }
        } catch (err) {
            console.error('[Auth] Clerk init failed:', err);
            showSignInGate('Authentication service unavailable. Please try again later.');
        }
    }

    function hasMagicLinkParams() {
        const params = new URLSearchParams(window.location.search);
        return params.has('__clerk_ticket') || params.has('__clerk_status');
    }

    async function handleMagicLinkRedirect() {
        const cleanUrl = () => {
            const url = new URL(window.location.href);
            url.searchParams.delete('__clerk_ticket');
            url.searchParams.delete('__clerk_status');
            url.searchParams.delete('__clerk_created_session');
            window.history.replaceState({}, '', url.pathname + (url.search || ''));
        };

        try {
            console.log('[Auth] Processing magic link redirect...');
            await clerkInstance.handleRedirectCallback();
            cleanUrl();
        } catch (err) {
            console.error('[Auth] Magic link redirect handling failed:', err);
            // If handleRedirectCallback fails, try manual ticket verification
            const ticket = new URLSearchParams(window.location.search).get('__clerk_ticket');
            if (!ticket) { cleanUrl(); return; }

            // Try sign-in ticket first
            try {
                const signIn = clerkInstance.client.signIn;
                const result = await signIn.create({ strategy: 'ticket', ticket });
                if (result.status === 'complete') {
                    await clerkInstance.setActive({ session: result.createdSessionId });
                    cleanUrl();
                    return;
                }
            } catch (signInErr) {
                console.warn('[Auth] Sign-in ticket failed, trying sign-up verification:', signInErr);
            }

            // Try sign-up verification (for new users who clicked the magic link)
            try {
                const signUp = clerkInstance.client.signUp;
                const result = await signUp.attemptEmailAddressVerification({ strategy: 'ticket', ticket });
                if (result.status === 'complete') {
                    await clerkInstance.setActive({ session: result.createdSessionId });
                    cleanUrl();
                    return;
                }
            } catch (signUpErr) {
                console.error('[Auth] Sign-up ticket verification also failed:', signUpErr);
            }

            cleanUrl();
        }
    }

    // Wait for the Clerk CDN script to load and initialize
    function waitForClerk() {
        return new Promise((resolve, reject) => {
            const maxWait = 15000;
            const start = Date.now();

            function check() {
                // The CDN script sets window.Clerk as the loaded instance (not a constructor)
                if (window.Clerk && window.Clerk.loaded) {
                    clerkInstance = window.Clerk;
                    resolve();
                } else if (window.Clerk && typeof window.Clerk.load === 'function') {
                    // Clerk object exists but hasn't loaded yet
                    clerkInstance = window.Clerk;
                    clerkInstance.load().then(resolve).catch(reject);
                } else if (Date.now() - start > maxWait) {
                    reject(new Error('Clerk SDK failed to load'));
                } else {
                    setTimeout(check, 200);
                }
            }

            check();
        });
    }

    // ── Authenticated ──
    function onAuthenticated() {
        currentUser = clerkInstance.user;
        const email = getPrimaryEmail();
        const isAdmin = checkAdminRole();

        console.log(`[Auth] Authenticated: ${email} | Admin: ${isAdmin}`);

        hideSignInGate();
        showDashboard();

        if (isAdmin) enableAdminFeatures();
        renderUserBadge(email, isAdmin);
    }

    // ── Gate ──
    function showSignInGate(errorMsg) {
        const gate = $('auth-gate');
        const dashboard = $('dashboard-content');

        if (gate) gate.classList.remove('hidden');
        if (dashboard) {
            dashboard.classList.add('auth-blurred');
            dashboard.setAttribute('aria-hidden', 'true');
            dashboard.inert = true;
        }

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

    // ── Magic Link ──
    async function sendMagicLink(email) {
        if (!clerkInstance) return;

        const submitBtn = $('auth-submit-btn');

        if (!email || !email.includes('@')) {
            showAuthStatus('Please enter a valid email address.', 'error');
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sending...';
        }

        try {
            // Restricted access: only pre-registered users can sign in.
            // Users must be added via Clerk dashboard (dashboard.clerk.com).
            let signInResult;
            try {
                signInResult = await clerkInstance.client.signIn.create({ identifier: email });
            } catch (signInErr) {
                const errCode = signInErr.errors?.[0]?.code || '';
                const errMsg = (signInErr.errors?.[0]?.message || '').toLowerCase();
                const isNotFound = errCode === 'form_identifier_not_found'
                    || errCode === 'identifier_not_found'
                    || errCode.includes('not_found')
                    || errMsg.includes("couldn't find")
                    || errMsg.includes('not found');
                if (isNotFound) {
                    showAccessDenied(email);
                    return;
                }
                throw signInErr;
            }

            // Send magic link to existing user
            const { supportedFirstFactors } = signInResult;
            const emailFactor = supportedFirstFactors.find(
                f => f.strategy === 'email_link' && f.safeIdentifier === email
            ) || supportedFirstFactors.find(f => f.strategy === 'email_link');

            if (emailFactor) {
                await signInResult.prepareFirstFactor({
                    strategy: 'email_link',
                    emailAddressId: emailFactor.emailAddressId,
                    redirectUrl: window.location.origin + window.location.pathname,
                });
                showMagicLinkSent(email);
            } else {
                showAuthStatus('Unable to send access link. Please try again.', 'error');
            }
        } catch (err) {
            console.error('[Auth] Sign-in error:', err);
            const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'Something went wrong. Please try again.';
            showAuthStatus(msg, 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Send Access Link';
            }
        }
    }

    function showAccessDenied(email) {
        if ($('auth-sign-in-form')) $('auth-sign-in-form').classList.add('hidden');
        if ($('auth-link-sent')) $('auth-link-sent').classList.add('hidden');
        const denied = $('auth-access-denied');
        if (denied) {
            denied.classList.remove('hidden');
            const emailEl = $('auth-denied-email');
            if (emailEl) emailEl.textContent = email;
        } else {
            showAuthStatus('This email does not have access. Please contact Ekantik Capital to request an invitation.', 'error');
        }
    }

    function showMagicLinkSent(email) {
        if ($('auth-sign-in-form')) $('auth-sign-in-form').classList.add('hidden');
        if ($('auth-link-sent')) $('auth-link-sent').classList.remove('hidden');
        if ($('auth-sent-email')) $('auth-sent-email').textContent = email;
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
            } catch (e) { /* continue polling */ }
        }, 3000);

        setTimeout(() => clearInterval(poll), 600000);
    }

    // ── Admin ──
    function checkAdminRole() {
        if (!currentUser) return false;
        const metadata = currentUser.publicMetadata || {};
        if (metadata.role === 'admin') return true;
        const email = getPrimaryEmail();
        return ADMIN_EMAILS.includes(email?.toLowerCase());
    }

    function getPrimaryEmail() {
        if (!currentUser) return null;
        return currentUser.primaryEmailAddress?.emailAddress || null;
    }

    function enableAdminFeatures() {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');

        setTimeout(() => {
            const panel = document.getElementById('detailed-dashboard-discord');
            if (panel && panel.classList.contains('hidden') && typeof toggleDetailedDashboard === 'function') {
                toggleDetailedDashboard('discord');
            }
        }, 500);

        const badge = document.createElement('div');
        badge.className = 'fixed bottom-4 left-4 z-50 bg-[#d4af37]/20 border border-[#d4af37]/40 rounded-lg px-3 py-1.5 hidden lg:block';
        badge.innerHTML = '<span class="text-[#d4af37] text-[10px] font-bold uppercase tracking-wider"><i class="fas fa-shield-alt mr-1"></i>Admin Mode</span>';
        document.body.appendChild(badge);
    }

    function enableDevAdminFallback() {
        if (new URLSearchParams(window.location.search).has('admin')) {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
            setTimeout(() => {
                const panel = document.getElementById('detailed-dashboard-discord');
                if (panel && panel.classList.contains('hidden') && typeof toggleDetailedDashboard === 'function') {
                    toggleDetailedDashboard('discord');
                }
            }, 500);
        }
    }

    // ── User Badge ──
    function renderUserBadge(email, isAdmin) {
        const nav = document.querySelector('header nav');
        if (!nav) return;

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

    async function signOut() {
        if (clerkInstance) {
            try { await clerkInstance.signOut(); } catch (e) { console.error('[Auth] Sign out error:', e); }
        }
        window.location.reload();
    }

    function showAuthStatus(msg, type) {
        const el = $('auth-status');
        if (!el) return;
        el.textContent = msg;
        el.className = 'text-xs text-center mt-3 px-4 py-2 rounded-lg ' +
            (type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
             'bg-green-500/10 text-green-400 border border-green-500/20');
        el.classList.remove('hidden');
    }

    return {
        init,
        sendMagicLink,
        backToSignIn: () => {
            if ($('auth-sign-in-form')) $('auth-sign-in-form').classList.remove('hidden');
            if ($('auth-link-sent')) $('auth-link-sent').classList.add('hidden');
            if ($('auth-access-denied')) $('auth-access-denied').classList.add('hidden');
            if ($('auth-status')) $('auth-status').classList.add('hidden');
        },
        signOut,
        isAdmin: () => checkAdminRole(),
        getUser: () => currentUser,
        getEmail: () => getPrimaryEmail(),
    };
})();
