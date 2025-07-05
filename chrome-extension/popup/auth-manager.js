// Auth Manager - Versión optimizada con persistencia de sesión y logs de depuración

window.AuthManager = class AuthManager {
    constructor() {
        this.currentView = 'login';
        this.apiBaseUrl = 'http://localhost:5000/api';
        console.log('AuthManager inicializado');
    }

    async init() {
        console.log('Inicializando AuthManager...');
        await this.checkAuthState(); // Espera a verificar el estado de autenticación
        this.setupEventListeners();
    }

    setupEventListeners() {
        console.log('Configurando event listeners...');
        document.getElementById('loginBtn')?.addEventListener('click', () => this.showLoginForm());
        document.getElementById('registerBtn')?.addEventListener('click', () => this.showRegisterForm());
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
    }

    async checkAuthState() {
        try {
            console.log('Verificando estado de autenticación...');
            const result = await chrome.storage.local.get(['userState', 'authToken']);
            console.log('Datos recuperados de chrome.storage:', result);

            const { userState, authToken } = result;

            if (userState?.email && authToken) {
                console.log('Token encontrado, validando...');
                const isValid = await this.validateToken(authToken);
                console.log('Token válido?:', isValid);

                if (isValid) {
                    console.log('Usuario autenticado, actualizando UI...');
                    this.currentView = 'dashboard';
                    this.updateUIForLoggedInUser(userState);
                } else {
                    console.log('Token inválido, limpiando datos...');
                    await this.clearAuthData();
                    this.currentView = 'login';
                    this.updateUIForLoggedOutUser();
                }
            } else {
                console.log('No hay datos de usuario o token');
                this.currentView = 'login';
                this.updateUIForLoggedOutUser();
            }
        } catch (error) {
            console.error('Error en checkAuthState:', error);
            this.currentView = 'login';
            this.updateUIForLoggedOutUser();
        }
    }

    async validateToken(token) {
        try {
            console.log('Validando token con el servidor...');
            const response = await fetch(`${this.apiBaseUrl}/auth/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.ok;
        } catch (error) {
            console.error('Error validando token:', error);
            return false;
        }
    }

    // ... (Resto de funciones se mantienen IGUALES que en tu archivo original)
    // showLoginForm(), showRegisterForm(), showWelcomeScreen(), 
    // handleLogin(), handleRegister(), saveAuthData(), clearAuthData(),
    // logout(), updateUIForLoggedInUser(), updateUIForLoggedOutUser(),
    // showLoading(), hideLoading(), showNotification()

    /* Funciones de UI (copiar exactamente igual de tu versión original) */
    showLoginForm() { /* ... */ }
    showRegisterForm() { /* ... */ }
    showWelcomeScreen() { /* ... */ }
    async handleLogin(event) { /* ... */ }
    async handleRegister(event) { /* ... */ }
    async saveAuthData(token, user) { /* ... */ }
    async clearAuthData() { /* ... */ }
    async logout() { /* ... */ }
    updateUIForLoggedInUser(user) { /* ... */ }
    updateUIForLoggedOutUser() { /* ... */ }
    showLoading(message) { /* ... */ }
    hideLoading() { /* ... */ }
    showNotification(message, type) { /* ... */ }
};

/* Inicialización automática al cargar el script */
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
    authManager.init();
});
