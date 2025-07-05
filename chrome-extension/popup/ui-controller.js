// UI Controller - Versión corregida sin módulos ES6

window.UIController = class UIController {
    constructor() {
        this.views = {
            'login': document.getElementById('loginView'),
            'dashboard': document.getElementById('dashboardView'),
            'progress': document.getElementById('progressView'),
            'mainContent': document.getElementById('mainContent'),
            'settingsContent': document.getElementById('settingsContent'),
            'plansContent': document.getElementById('plansContent'),
            'helpContent': document.getElementById('helpContent')
        };
        
        this.currentView = 'main';
        this.init();
    }

    init() {
        this.setupViewSwitching();
        this.setupUIElements();
    }

    setupViewSwitching() {
        // Configurar navegación entre vistas
        const tabButtons = document.querySelectorAll('.tab-btn');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetView = button.getAttribute('data-tab');
                this.switchToView(targetView);
            });
        });
    }

    setupUIElements() {
        // Configurar elementos de UI interactivos
        this.setupTooltips();
        this.setupAnimations();
        this.setupResponsiveElements();
    }

    switchToView(viewName) {
        // Ocultar todas las vistas
        Object.values(this.views).forEach(view => {
            if (view) {
                view.classList.remove('active');
                view.style.display = 'none';
            }
        });

        // Mostrar la vista seleccionada
        const targetView = this.views[viewName + 'Content'] || this.views[viewName];
        if (targetView) {
            targetView.classList.add('active');
            targetView.style.display = 'block';
        }

        // Actualizar botones de navegación
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-tab') === viewName) {
                btn.classList.add('active');
            }
        });

        this.currentView = viewName;
        this.onViewChanged(viewName);
    }

    onViewChanged(viewName) {
        // Ejecutar acciones específicas cuando cambia la vista
        switch (viewName) {
            case 'main':
                this.refreshMainView();
                break;
            case 'settings':
                this.loadSettings();
                break;
            case 'plans':
                this.refreshPlansView();
                break;
            case 'help':
                this.loadHelpContent();
                break;
        }
    }

    refreshMainView() {
        // Actualizar la vista principal
        this.updateUserInfo();
        this.updateDownloadStatus();
    }

    updateUserInfo() {
        // Actualizar información del usuario
        chrome.storage.local.get(['userState'], (result) => {
            const userState = result.userState;
            const userSection = document.getElementById('userSection');
            const authSection = document.getElementById('authSection');
            const downloadSection = document.getElementById('downloadSection');

            if (userState && userState.email) {
                // Usuario logueado
                if (authSection) authSection.style.display = 'none';
                if (userSection) userSection.style.display = 'block';
                if (downloadSection) downloadSection.style.display = 'block';

                // Actualizar datos del usuario
                const userName = document.getElementById('userName');
                const userPlan = document.getElementById('userPlan');
                const creditsUsed = document.getElementById('creditsUsed');
                const creditsTotal = document.getElementById('creditsTotal');

                if (userName) userName.textContent = userState.name || userState.email;
                if (userPlan) userPlan.textContent = userState.plan || 'Plan Gratuito';
                if (creditsUsed) creditsUsed.textContent = userState.creditsUsed || 0;
                if (creditsTotal) creditsTotal.textContent = userState.creditsTotal || 3000;
            } else {
                // Usuario no logueado
                if (authSection) authSection.style.display = 'block';
                if (userSection) userSection.style.display = 'none';
                if (downloadSection) downloadSection.style.display = 'none';
            }
        });
    }

    updateDownloadStatus() {
        // Actualizar estado de descarga
        chrome.storage.local.get(['downloadState'], (result) => {
            const downloadState = result.downloadState;
            const progressSection = document.getElementById('progressSection');

            if (downloadState && downloadState.isActive) {
                if (progressSection) progressSection.style.display = 'block';
                this.updateProgressDisplay(downloadState);
            } else {
                if (progressSection) progressSection.style.display = 'none';
            }
        });
    }

    updateProgressDisplay(downloadState) {
        const progressText = document.getElementById('progressText');
        const progressFill = document.getElementById('progressFill');
        const successCount = document.getElementById('successCount');
        const errorCount = document.getElementById('errorCount');
        const downloadSpeed = document.getElementById('downloadSpeed');

        if (progressText) {
            progressText.textContent = `${downloadState.current || 0} / ${downloadState.total || 0}`;
        }

        if (progressFill) {
            const percentage = downloadState.total > 0 ? 
                (downloadState.current / downloadState.total) * 100 : 0;
            progressFill.style.width = percentage + '%';
        }

        if (successCount) successCount.textContent = downloadState.success || 0;
        if (errorCount) errorCount.textContent = downloadState.errors || 0;
        if (downloadSpeed) downloadSpeed.textContent = (downloadState.speed || 0) + '/min';
    }

    loadSettings() {
        // Cargar configuración guardada
        chrome.storage.local.get(['settings'], (result) => {
            const settings = result.settings || {};

            const downloadPath = document.getElementById('downloadPath');
            const notificationsEnabled = document.getElementById('notificationsEnabled');
            const maxConcurrent = document.getElementById('maxConcurrent');
            const timeout = document.getElementById('timeout');
            const delayOption = document.getElementById('delayOption');
            const delayValue = document.getElementById('delayValue');

            if (downloadPath) downloadPath.value = settings.downloadPath || '';
            if (notificationsEnabled) notificationsEnabled.checked = settings.notificationsEnabled !== false;
            if (maxConcurrent) maxConcurrent.value = settings.maxConcurrent || 1;
            if (timeout) timeout.value = settings.timeout || 30;
            if (delayOption) {
                delayOption.value = settings.delay || 2000;
                if (delayValue) delayValue.textContent = (settings.delay || 2000) + 'ms';
            }
        });
    }

    refreshPlansView() {
        // Actualizar vista de planes
        this.updateCurrentPlanDisplay();
        this.updatePlanCards();
    }

    updateCurrentPlanDisplay() {
        chrome.storage.local.get(['userState'], (result) => {
            const userState = result.userState || {};
            
            const currentPlanName = document.getElementById('currentPlanName');
            const planExpiry = document.getElementById('planExpiry');
            const usedCredits = document.getElementById('usedCredits');
            const totalCredits = document.getElementById('totalCredits');
            const usageFill = document.getElementById('usageFill');

            if (currentPlanName) currentPlanName.textContent = userState.plan || 'Gratuito';
            if (planExpiry) planExpiry.textContent = userState.expiry || '30 días';
            if (usedCredits) usedCredits.textContent = userState.creditsUsed || 0;
            if (totalCredits) totalCredits.textContent = userState.creditsTotal || 3000;

            if (usageFill) {
                const percentage = userState.creditsTotal > 0 ? 
                    (userState.creditsUsed / userState.creditsTotal) * 100 : 0;
                usageFill.style.width = percentage + '%';
            }
        });
    }

    updatePlanCards() {
        // Actualizar tarjetas de planes
        const planCards = document.querySelectorAll('.plan-card');
        
        planCards.forEach(card => {
            const planType = card.getAttribute('data-plan');
            // Aquí se puede añadir lógica para destacar el plan actual
        });
    }

    loadHelpContent() {
        // Cargar contenido de ayuda
        const appVersion = document.getElementById('appVersion');
        const lastUpdate = document.getElementById('lastUpdate');

        if (appVersion) {
            const manifest = chrome.runtime.getManifest();
            appVersion.textContent = manifest.version;
        }

        if (lastUpdate) {
            lastUpdate.textContent = 'Julio 2025';
        }
    }

    setupTooltips() {
        // Configurar tooltips para elementos que los necesiten
        const elementsWithTooltips = document.querySelectorAll('[data-tooltip]');
        
        elementsWithTooltips.forEach(element => {
            element.addEventListener('mouseenter', (e) => {
                this.showTooltip(e.target, e.target.getAttribute('data-tooltip'));
            });
            
            element.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
        });
    }

    showTooltip(element, text) {
        // Mostrar tooltip
        let tooltip = document.getElementById('tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'tooltip';
            tooltip.className = 'tooltip';
            document.body.appendChild(tooltip);
        }

        tooltip.textContent = text;
        tooltip.style.display = 'block';

        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
    }

    hideTooltip() {
        const tooltip = document.getElementById('tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    setupAnimations() {
        // Configurar animaciones suaves
        const animatedElements = document.querySelectorAll('.animate-on-show');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                }
            });
        });

        animatedElements.forEach(element => {
            observer.observe(element);
        });
    }

    setupResponsiveElements() {
        // Configurar elementos responsivos
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
        const container = document.querySelector('.popup-container');
        if (!container) return;

        const width = container.offsetWidth;
        
        if (width < 350) {
            container.classList.add('compact-mode');
        } else {
            container.classList.remove('compact-mode');
        }
    }

    showLoading(message = 'Cargando...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');

        if (overlay) overlay.style.display = 'flex';
        if (loadingText) loadingText.textContent = message;
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    showNotification(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('notificationToast');
        const toastMessage = document.getElementById('toastMessage');
        const toastIcon = document.getElementById('toastIcon');

        if (!toast || !toastMessage || !toastIcon) return;

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        toastIcon.textContent = icons[type] || icons.info;
        toastMessage.textContent = message;
        toast.style.display = 'block';

        setTimeout(() => {
            toast.style.display = 'none';
        }, duration);
    }
};

