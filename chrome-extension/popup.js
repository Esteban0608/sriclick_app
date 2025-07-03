import { PaymentHandler } from './payment-handler.js';
import { CreditSystem } from './credit-system.js';

class SRIClickPopup {
    constructor() {
        this.paymentHandler = new PaymentHandler();
        this.creditSystem = new CreditSystem();
        this.init();
    }

    async init() {
        await this.creditSystem.initialize();
        this.setupEventListeners();
        this.updateCreditDisplay();
    }

    setupEventListeners() {
        // Mostrar opciones de planes
        document.getElementById('purchasePlan').addEventListener('click', () => {
            document.getElementById('plansSection').style.display = 'block';
        });

        // Actualizar créditos cuando se refresca
        document.getElementById('refreshCredits').addEventListener('click', () => {
            this.updateCreditDisplay();
        });
    }

    async updateCreditDisplay() {
        const credits = await this.creditSystem.getCurrentCredits();
        
        document.getElementById('creditsRemaining').textContent = 
            credits.remaining === Number.MAX_SAFE_INTEGER ? 'Ilimitados' : credits.remaining;
        document.getElementById('creditsUsed').textContent = credits.used;
        document.getElementById('creditsTotal').textContent = 
            credits.total === Number.MAX_SAFE_INTEGER ? 'Ilimitados' : credits.total;
        
        const expiryDate = credits.expiry ? new Date(credits.expiry).toLocaleDateString() : '--';
        document.getElementById('creditsExpiry').textContent = expiryDate;
        
        // Mostrar/ocultar botón de prueba gratuita
        const freeTrialBtn = document.getElementById('activateTrial');
        if (credits.plan === null || 
            (credits.plan === 'free' && !this.creditSystem.creditConfig.free.oneTime)) {
            freeTrialBtn.style.display = 'block';
        } else {
            freeTrialBtn.style.display = 'none';
        }
    }
}

// Inicializar
new SRIClickPopup();
