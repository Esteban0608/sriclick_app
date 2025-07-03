export class CreditSystem {
    constructor() {
        this.creditConfig = {
            free: {
                credits: 3000,
                validityDays: 30,
                oneTime: true
            },
            basic: {
                credits: 12000,
                price: 40,
                validityDays: 365
            },
            professional: {
                credits: 75000,
                price: 75,
                validityDays: 365
            },
            unlimited: {
                credits: Number.MAX_SAFE_INTEGER,
                price: 100,
                validityDays: 365
            }
        };
    }

    async initialize() {
        // Cargar estado del usuario desde chrome.storage
        const { userState } = await chrome.storage.local.get('userState');
        if (!userState) {
            await chrome.storage.local.set({ 
                userState: {
                    credits: {
                        remaining: 0,
                        used: 0,
                        total: 0,
                        plan: null,
                        expiry: null
                    }
                }
            });
        }
    }

    async useCredits(amount) {
        const { userState } = await chrome.storage.local.get('userState');
        
        if (userState.credits.remaining < amount) {
            throw new Error('Créditos insuficientes');
        }
        
        userState.credits.remaining -= amount;
        userState.credits.used += amount;
        
        await chrome.storage.local.set({ userState });
        
        return userState.credits;
    }

    async activateFreeTrial() {
        const { userState } = await chrome.storage.local.get('userState');
        
        // Verificar si ya usó la prueba gratuita
        if (userState.credits.plan === 'free' && this.creditConfig.free.oneTime) {
            throw new Error('Ya has utilizado tu prueba gratuita');
        }
        
        // Activar prueba
        userState.credits = {
            remaining: this.creditConfig.free.credits,
            used: 0,
            total: this.creditConfig.free.credits,
            plan: 'free',
            expiry: this.calculateExpiryDate('free')
        };
        
        await chrome.storage.local.set({ userState });
        
        return userState.credits;
    }

    async purchasePlan(planType, paymentData) {
        if (!this.creditConfig[planType]) {
            throw new Error('Plan no válido');
        }
        
        const { userState } = await chrome.storage.local.get('userState');
        
        // Actualizar créditos
        userState.credits = {
            remaining: this.creditConfig[planType].credits,
            used: 0,
            total: this.creditConfig[planType].credits,
            plan: planType,
            expiry: this.calculateExpiryDate(planType)
        };
        
        // Registrar pago
        userState.payments = userState.payments || [];
        userState.payments.push({
            plan: planType,
            amount: this.creditConfig[planType].price,
            method: paymentData.method,
            date: new Date().toISOString(),
            transactionId: paymentData.transactionId
        });
        
        await chrome.storage.local.set({ userState });
        
        return userState.credits;
    }

    calculateExpiryDate(planType) {
        const today = new Date();
        const config = this.creditConfig[planType];
        
        if (planType === 'free') {
            return new Date(today.setDate(today.getDate() + config.validityDays));
        } else {
            return new Date(today.setFullYear(today.getFullYear() + 1));
        }
    }

    async getCurrentCredits() {
        const { userState } = await chrome.storage.local.get('userState');
        return userState?.credits || {
            remaining: 0,
            used: 0,
            total: 0,
            plan: null,
            expiry: null
        };
    }
}
