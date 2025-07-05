// SRICLICK Popup - Versión corregida sin módulos ES6

// Definir clases globales
window.SRIClickPopup = class SRIClickPopup {
    constructor() {
        this.paymentHandler = null;
        this.creditSystem = null;
        this.init();
    }

    async init() {
        // Inicializar después de que las otras clases estén disponibles
        if (window.AuthManager) {
        this.authManager = window.authManager; // Usar la instancia global
            // Llamar a checkAuthState() después de que el DOM esté listo
            document.addEventListener('DOMContentLoaded', () => {
                this.authManager.checkAuthState();
            });
        }
        if (window.PaymentHandler) {
            this.paymentHandler = new window.PaymentHandler();
        }
        if (window.CreditSystem) {
            this.creditSystem = new window.CreditSystem();
            await this.creditSystem.initialize();
        }
        
        this.setupEventListeners();
        this.updateCreditDisplay();
        this.initializeTabs();
    }

    initializeTabs() {
        // Configurar navegación por pestañas
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // Remover clase active de todos los botones y contenidos
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Añadir clase active al botón y contenido seleccionado
                button.classList.add('active');
                const targetContent = document.getElementById(targetTab + 'Content');
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    }

    setupEventListeners() {
        // Botones de autenticación
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showLogin());
        }
        if (registerBtn) {
            registerBtn.addEventListener('click', () => this.showRegister());
        }

        // Controles de descarga
        const startDownloadBtn = document.getElementById('startDownloadBtn');
        const pauseDownloadBtn = document.getElementById('pauseDownloadBtn');
        const stopDownloadBtn = document.getElementById('stopDownloadBtn');

        if (startDownloadBtn) {
            startDownloadBtn.addEventListener('click', () => this.startDownload());
        }
        if (pauseDownloadBtn) {
            pauseDownloadBtn.addEventListener('click', () => this.pauseDownload());
        }
        if (stopDownloadBtn) {
            stopDownloadBtn.addEventListener('click', () => this.stopDownload());
        }

        // Configuración
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        const resetSettingsBtn = document.getElementById('resetSettingsBtn');

        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        }
        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', () => this.resetSettings());
        }

        // Slider de delay
        const delayOption = document.getElementById('delayOption');
        const delayValue = document.getElementById('delayValue');
        
        if (delayOption && delayValue) {
            delayOption.addEventListener('input', (e) => {
                delayValue.textContent = e.target.value + 'ms';
            });
        }

        // Mostrar opciones de planes
        const purchasePlan = document.getElementById('purchasePlan');
        if (purchasePlan) {
            purchasePlan.addEventListener('click', () => {
                const plansSection = document.getElementById('plansSection');
                if (plansSection) {
                    plansSection.style.display = 'block';
                }
            });
        }
    }

    showLogin() {
        if (this.authManager) {
            this.authManager.showLoginForm();
        } else {
            this.showNotification("AuthManager no inicializado", "error");
        }
    }

    showRegister() {
        if (this.authManager) {
            this.authManager.showRegisterForm();
        } else {
            this.showNotification("AuthManager no inicializado", "error");
        }
    }

    async startDownload() {
        try {
            // Enviar mensaje al content script
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url.includes('sri.gob.ec')) {
                this.showNotification('Por favor, navega al sitio del SRI primero', 'warning');
                return;
            }

            await chrome.tabs.sendMessage(tab.id, { action: 'startDownload' });
            
            // Actualizar UI
            this.updateDownloadUI(true);
            this.showNotification('Descarga iniciada', 'success');
            
        } catch (error) {
            console.error('Error al iniciar descarga:', error);
            this.showNotification('Error al iniciar descarga', 'error');
        }
    }

    async pauseDownload() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.tabs.sendMessage(tab.id, { action: 'pauseDownload' });
            
            this.updateDownloadUI(false);
            this.showNotification('Descarga pausada', 'info');
            
        } catch (error) {
            console.error('Error al pausar descarga:', error);
        }
    }

    async stopDownload() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.tabs.sendMessage(tab.id, { action: 'stopDownload' });
            
            this.updateDownloadUI(false);
            this.showNotification('Descarga detenida', 'info');
            
        } catch (error) {
            console.error('Error al detener descarga:', error);
        }
    }

    updateDownloadUI(isDownloading) {
        const startBtn = document.getElementById('startDownloadBtn');
        const pauseBtn = document.getElementById('pauseDownloadBtn');
        const stopBtn = document.getElementById('stopDownloadBtn');
        const progressSection = document.getElementById('progressSection');

        if (isDownloading) {
            if (startBtn) startBtn.style.display = 'none';
            if (pauseBtn) pauseBtn.style.display = 'block';
            if (stopBtn) stopBtn.style.display = 'block';
            if (progressSection) progressSection.style.display = 'block';
        } else {
            if (startBtn) startBtn.style.display = 'block';
            if (pauseBtn) pauseBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'none';
        }
    }

    updateProgress(current, total) {
        const progressText = document.getElementById('progressText');
        const progressFill = document.getElementById('progressFill');

        if (progressText) {
            progressText.textContent = `${current} / ${total}`;
        }
        if (progressFill) {
            const percentage = total > 0 ? (current / total) * 100 : 0;
            progressFill.style.width = percentage + '%';
        }
    }

    updateCreditDisplay() {
        // Actualizar display de créditos
        if (this.creditSystem) {
            const creditsUsed = document.getElementById('creditsUsed');
            const creditsTotal = document.getElementById('creditsTotal');
            
            if (creditsUsed) creditsUsed.textContent = this.creditSystem.used || 0;
            if (creditsTotal) creditsTotal.textContent = this.creditSystem.total || 3000;
        }
    }

    async saveSettings() {
        try {
            const settings = {
                downloadPath: document.getElementById('downloadPath')?.value || '',
                notificationsEnabled: document.getElementById('notificationsEnabled')?.checked || true,
                maxConcurrent: document.getElementById('maxConcurrent')?.value || 1,
                timeout: document.getElementById('timeout')?.value || 30,
                delay: document.getElementById('delayOption')?.value || 2000
            };

            await chrome.storage.local.set({ settings });
            this.showNotification('Configuración guardada', 'success');
            
        } catch (error) {
            console.error('Error al guardar configuración:', error);
            this.showNotification('Error al guardar configuración', 'error');
        }
    }

    async resetSettings() {
        try {
            await chrome.storage.local.remove('settings');
            
            // Restaurar valores por defecto en la UI
            const downloadPath = document.getElementById('downloadPath');
            const notificationsEnabled = document.getElementById('notificationsEnabled');
            const maxConcurrent = document.getElementById('maxConcurrent');
            const timeout = document.getElementById('timeout');
            const delayOption = document.getElementById('delayOption');

            if (downloadPath) downloadPath.value = '';
            if (notificationsEnabled) notificationsEnabled.checked = true;
            if (maxConcurrent) maxConcurrent.value = 1;
            if (timeout) timeout.value = 30;
            if (delayOption) delayOption.value = 2000;

            this.showNotification('Configuración restaurada', 'success');
            
        } catch (error) {
            console.error('Error al restaurar configuración:', error);
        }
    }

    showNotification(message, type = 'info') {
        const toast = document.getElementById('notificationToast');
        const toastMessage = document.getElementById('toastMessage');
        const toastIcon = document.getElementById('toastIcon');

        if (!toast || !toastMessage || !toastIcon) return;

        // Configurar ícono según el tipo
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        toastIcon.textContent = icons[type] || icons.info;
        toastMessage.textContent = message;
        
        // Mostrar notificación
        toast.style.display = 'block';
        
        // Ocultar después de 3 segundos
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);

        // Botón de cerrar
        const toastClose = document.getElementById('toastClose');
        if (toastClose) {
            toastClose.onclick = () => {
                toast.style.display = 'none';
            };
        }
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.sriClickPopup = new window.SRIClickPopup();
});

// Escuchar mensajes del background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (window.sriClickPopup) {
        switch (request.action) {
            case 'updateProgress':
                window.sriClickPopup.updateProgress(request.current, request.total);
                break;
            case 'downloadComplete':
                window.sriClickPopup.updateDownloadUI(false);
                window.sriClickPopup.showNotification('Descarga completada', 'success');
                break;
            case 'downloadError':
                window.sriClickPopup.showNotification('Error en descarga: ' + request.error, 'error');
                break;
        }
    }
});



console.log('DOMContentLoaded event fired. Initializing SRIClickPopup.');

