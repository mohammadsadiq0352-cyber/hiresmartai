let mode = 'login';
let role = 'user';

// --- Animation Logic ---

async function typeEffect(element, text, speed = 40) {
    element.innerHTML = '';
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    element.appendChild(cursor);

    for (let i = 0; i < text.length; i++) {
        const char = document.createTextNode(text[i]);
        element.insertBefore(char, cursor);
        await new Promise(resolve => setTimeout(resolve, speed));
    }
}

window.setRole = async function (newRole) {
    role = newRole;
    document.querySelectorAll('.role-option').forEach(opt => {
        opt.classList.remove('active');
        const optText = opt.innerText.toLowerCase();
        if ((newRole === 'user' && optText.includes('candidate')) ||
            (newRole === 'hr' && optText.includes('hr'))) {
            opt.classList.add('active');
        }
    });

    // Animate title change
    const title = document.getElementById('auth-title');
    const newTitle = mode === 'login' ? 'Welcome' : 'Create Account';
    const roleText = role === 'hr' ? ' (HR)' : '';
    await typeEffect(title, newTitle + roleText);

    // Show/hide company field based on role (only in signup mode)
    const companyField = document.getElementById('company-field');
    if (companyField) {
        companyField.style.display = (mode === 'signup' && role === 'hr') ? 'block' : 'none';
    }
};

window.toggleMode = async function () {
    mode = mode === 'login' ? 'signup' : 'login';
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const submitBtn = document.getElementById('submit-btn');
    const modeText = document.getElementById('mode-text');
    const modeToggle = document.getElementById('mode-toggle');
    const regFields = document.getElementById('registration-fields');
    const confirmGroup = document.getElementById('confirm-password-group');

    const newTitle = mode === 'signup' ? 'Create Account' : 'Welcome';
    const roleText = role === 'hr' ? ' (HR)' : '';
    const newSubtitle = mode === 'signup' ? 'Join HireSmart today' : 'Sign in to your account';

    // Trigger typing animations
    typeEffect(title, newTitle + roleText);
    typeEffect(subtitle, newSubtitle, 30);

    if (mode === 'signup') {
        submitBtn.innerText = 'Sign Up';
        modeText.innerText = 'Already have an account?';
        modeToggle.innerText = 'Sign In';
        regFields.style.display = 'block';
        confirmGroup.style.display = 'block';

        // Handle company field visibility
        const companyField = document.getElementById('company-field');
        if (companyField) {
            companyField.style.display = role === 'hr' ? 'block' : 'none';
        }
    } else {
        submitBtn.innerText = 'Sign In';
        modeText.innerText = "Don't have an account?";
        modeToggle.innerText = 'Sign Up';
        regFields.style.display = 'none';
        confirmGroup.style.display = 'none';

        const companyField = document.getElementById('company-field');
        if (companyField) companyField.style.display = 'none';
    }
};

// --- Auth Submission Logic ---

document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const nameInput = document.getElementById('name');
    const name = nameInput ? nameInput.value.trim() : '';

    // ── Mandatory field validation ──────────────────────────
    if (!email) {
        alert("Email Address is mandatory (*)");
        document.getElementById('email').focus();
        return;
    }
    if (!password) {
        alert("Password is mandatory (*)");
        document.getElementById('password').focus();
        return;
    }

    // HR login — company name required
    if (mode === 'login' && role === 'hr') {
        const loginCompany = document.getElementById('login-company') ? document.getElementById('login-company').value.trim() : '';
        if (!loginCompany) {
            alert("Company Name is mandatory (*)");
            document.getElementById('login-company').focus();
            return;
        }
    }

    if (mode === 'signup') {
        if (!name) {
            alert("Full Name is mandatory (*)");
            document.getElementById('name').focus();
            return;
        }

        if (role === 'hr') {
            const company = document.getElementById('company').value.trim();
            if (!company) {
                alert("Company Name is mandatory (*)");
                document.getElementById('company').focus();
                return;
            }
        }

        const confirmPassword = document.getElementById('confirm-password').value;
        if (!confirmPassword) {
            alert("Confirm Password is mandatory (*)");
            document.getElementById('confirm-password').focus();
            return;
        }

        // Robust Complexity Check
        const startsWithUpper = /^[A-Z]/.test(password);
        const hasDigit = /[0-9]/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>_]/.test(password);

        if (!startsWithUpper) {
            alert("Password must start with a Capital letter!");
            return;
        }
        if (!hasDigit) {
            alert("Password must contain at least one Number!");
            return;
        }
        if (!hasSpecial) {
            alert("Password must contain at least one Special character!");
            return;
        }

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }
    }

    const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
    let payload = mode === 'signup'
        ? { name, email, password, role }
        : { email, password, role };

    if (mode === 'signup' && role === 'hr') {
        const company = document.getElementById('company').value.trim();
        payload.companyName = company;
    }

    if (mode === 'login' && role === 'hr') {
        const loginCompany = document.getElementById('login-company');
        if (loginCompany) payload.companyName = loginCompany.value.trim();
    }

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('token', data.token);

            // Role-based redirection
            if (data.user.role === 'hr') {
                window.location.href = 'hr-dashboard.html';
            } else {
                window.location.href = 'candidate-dashboard.html';
            }
        } else {
            alert(data.error || 'Authentication failed');
        }
    } catch (error) {
        console.error('Auth error:', error);
        alert('An error occurred. Please check if the server is running.');
    }
});

// --- Initial Load Logic ---

window.onload = () => {
    // Check if we are on any dashboard page
    const pathname = window.location.pathname;
    const isDashboardPage = pathname.includes('dashboard.html') ||
        pathname.includes('hr-dashboard.html') ||
        pathname.includes('candidate-dashboard.html');

    if (isDashboardPage) {
        if (!localStorage.getItem('token')) {
            window.location.href = 'auth.html?role=user';
            return;
        }
        const user = JSON.parse(localStorage.getItem('user'));
        document.body.classList.add(user.role + '-view');
        return;
    }

    if (localStorage.getItem('token')) {
        const user = JSON.parse(localStorage.getItem('user'));
        const urlParams = new URLSearchParams(window.location.search);
        const roleParam = urlParams.get('role');

        // Only auto-redirect if the requested role matches the logged-in user's role
        // or if NO role is specified (default behavior)
        if (!roleParam || user.role === roleParam) {
            if (user.role === 'hr') {
                window.location.href = 'hr-dashboard.html';
            } else {
                window.location.href = 'candidate-dashboard.html';
            }
            return;
        }
        // If roles don't match, we stay on auth.html to allow login/signup as the other role
    }

    // Auto-set role from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get('role');
    if (roleParam === 'hr' || roleParam === 'user') {
        setRole(roleParam);
        // Robustly hide role selector if pre-selected
        const roleGroup = document.getElementById('role-selection-group');
        if (roleGroup) {
            roleGroup.style.setProperty('display', 'none', 'important');
        }
    } else {
        // No role param — default to candidate login page
        window.location.replace('auth.html?role=user');
        return;
    }
};

window.logout = function () {
    const userJson = localStorage.getItem('user');
    let redirectUrl = 'index.html';

    if (userJson) {
        const user = JSON.parse(userJson);
        if (user.role === 'user') {
            redirectUrl = 'auth.html?role=user';
        } else if (user.role === 'hr') {
            redirectUrl = 'auth.html?role=hr';
        }
    }

    localStorage.clear();
    window.location.href = redirectUrl;
};
