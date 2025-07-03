export class AuthManager {
    constructor() {
        this.currentView = 'login';
    }

    async checkAuthState() {
        const { userState } = await chrome.storage.local.get('userState');
        
        if (userState?.email) {
            this.currentView = 'dashboard';
        } else {
            this.currentView = 'login';
        }
    }

    async handleLogin(email, password) {
        try {
            // Validación básica
            if (!email || !password) {
                throw new Error('Por favor ingrese email y contraseña');
            }

            // Simular autenticación
            await this.mockAuthRequest(email, password);
            
            // Guardar estado
            await chrome.storage.local.set({
                userState: {
                    email,
                    lastLogin: new Date().toISOString()
                }
            });
            
            this.currentView = 'dashboard';
            return true;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async handleLogout() {
        await chrome.storage.local.remove('userState');
        this.currentView = 'login';
        return true;
    }

    async mockAuthRequest(email, password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (email.includes('@') && password.length >= 6) {
                    resolve();
                } else {
                    reject(new Error('Credenciales inválidas'));
                }
            }, 1000);
        });
    }
}
