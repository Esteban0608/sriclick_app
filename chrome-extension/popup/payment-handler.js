// Payment Handler - Versión corregida sin módulos ES6

window.PaymentHandler = class PaymentHandler {
    constructor() {
        this.selectedPlan = null;
        this.paymentMethod = 'creditCard';
        this.apiBaseUrl = 'http://localhost:5000/api';
        this.init();
    }

    init() {
        this.initEventListeners();
        this.setupPaymentMethodSwitching();
    }

    initEventListeners() {
        // Plan selection buttons
        const planButtons = {
            'selectFreePlan': 'free',
            'selectBasicPlan': 'basic',
            'selectProPlan': 'professional',
            'selectUnlimitedPlan': 'unlimited'
        };

        Object.entries(planButtons).forEach(([buttonId, planType]) => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => this.selectPlan(planType));
            }
        });

        // Payment method selection
        const paymentMethodInputs = document.querySelectorAll('input[name="paymentMethod"]');
        paymentMethodInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.paymentMethod = e.target.value;
                this.showPaymentForm(e.target.value);
            });
        });

        // Payment confirmation
        const confirmPaymentBtn = document.getElementById('confirmPayment');
        if (confirmPaymentBtn) {
            confirmPaymentBtn.addEventListener('click', () => this.processPayment());
        }

        // Back to plans
        const backToPlansBtn = document.getElementById('backToPlans');
        if (backToPlansBtn) {
            backToPlansBtn.addEventListener('click', () => this.showPlansSection());
        }

        // Card number formatting
        const cardNumberInput = document.getElementById('cardNumber');
        if (cardNumberInput) {
            cardNumberInput.addEventListener('input', (e) => this.formatCardNumber(e));
        }

        // Expiry date formatting
        const cardExpiryInput = document.getElementById('cardExpiry');
        if (cardExpiryInput) {
            cardExpiryInput.addEventListener('input', (e) => this.formatExpiryDate(e));
        }
    }

    setupPaymentMethodSwitching() {
        // Configurar cambio entre métodos de pago
        const methodOptions = document.querySelectorAll('.method-option');
        
        methodOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remover selección anterior
                methodOptions.forEach(opt => opt.classList.remove('selected'));
                
                // Seleccionar nueva opción
                option.classList.add('selected');
                
                // Marcar radio button
                const radio = option.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    this.paymentMethod = radio.value;
                    this.showPaymentForm(radio.value);
                }
            });
        });
    }

    selectPlan(planType) {
        this.selectedPlan = planType;
        
        const planData = this.getPlanData(planType);
        
        if (planType === 'free') {
            // Plan gratuito - activar directamente
            this.activateFreePlan();
        } else {
            // Plan de pago - mostrar opciones de pago
            this.showPaymentMethods(planData);
        }
    }

    getPlanData(planType) {
        const plans = {
            free: {
                name: 'Plan Gratuito',
                price: 0,
                credits: 3000,
                duration: '1 mes',
                features: ['3,000 facturas/notas de crédito', 'Válido por 1 mes', 'Solo para nuevos usuarios']
            },
            basic: {
                name: 'Plan Básico',
                price: 40,
                credits: 12000,
                duration: '1 año',
                features: ['12,000 facturas/notas de crédito', 'Válido por 1 año', 'Soporte prioritario']
            },
            professional: {
                name: 'Plan Profesional',
                price: 75,
                credits: 75000,
                duration: '1 año',
                features: ['75,000 facturas/notas de crédito', 'Válido por 1 año', 'Soporte prioritario', 'Exportación avanzada']
            },
            unlimited: {
                name: 'Plan Ilimitado',
                price: 100,
                credits: -1, // Ilimitado
                duration: '1 año',
                features: ['Facturas/notas ilimitadas', 'Válido por 1 año', 'Soporte 24/7', 'Exportación avanzada', 'Reportes personalizados']
            }
        };

        return plans[planType] || plans.free;
    }

    async activateFreePlan() {
        try {
            this.showLoading('Activando plan gratuito...');

            const result = await chrome.storage.local.get(['authToken']);
            const token = result.authToken;

            if (!token) {
                this.showNotification('Debes iniciar sesión primero', 'warning');
                return;
            }

            const response = await fetch(`${this.apiBaseUrl}/payment/activate-free`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                // Actualizar estado del usuario
                await this.updateUserPlan('free', data.user);
                this.showNotification('Plan gratuito activado correctamente', 'success');
                this.showPlansSection();
            } else {
                this.showNotification(data.message || 'Error al activar plan gratuito', 'error');
            }
        } catch (error) {
            console.error('Error activating free plan:', error);
            this.showNotification('Error de conexión', 'error');
        } finally {
            this.hideLoading();
        }
    }

    showPaymentMethods(planData) {
        const plansSection = document.getElementById('plansSection');
        const paymentMethods = document.getElementById('paymentMethods');
        const selectedPlanInfo = document.getElementById('selectedPlanInfo');

        if (plansSection) plansSection.style.display = 'none';
        if (paymentMethods) paymentMethods.style.display = 'block';

        // Mostrar información del plan seleccionado
        if (selectedPlanInfo) {
            selectedPlanInfo.innerHTML = `
                <div class="selected-plan-card">
                    <h4>${planData.name}</h4>
                    <div class="plan-price">$${planData.price}<span>/año</span></div>
                    <ul class="plan-features">
                        ${planData.features.map(feature => `<li>✔ ${feature}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        // Mostrar formulario de pago por defecto
        this.showPaymentForm(this.paymentMethod);
    }

    showPaymentForm(method) {
        // Ocultar todos los formularios
        const forms = ['creditCardForm', 'transferForm', 'depositForm'];
        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) form.style.display = 'none';
        });

        // Mostrar formulario seleccionado
        const targetForm = document.getElementById(method + 'Form');
        if (targetForm) {
            targetForm.style.display = 'block';
        }
    }

    showPlansSection() {
        const plansSection = document.getElementById('plansSection');
        const paymentMethods = document.getElementById('paymentMethods');

        if (plansSection) plansSection.style.display = 'block';
        if (paymentMethods) paymentMethods.style.display = 'none';

        this.selectedPlan = null;
    }

    async processPayment() {
        if (!this.selectedPlan) {
            this.showNotification('No hay plan seleccionado', 'warning');
            return;
        }

        const planData = this.getPlanData(this.selectedPlan);
        
        try {
            this.showLoading('Procesando pago...');

            let paymentData;

            switch (this.paymentMethod) {
                case 'creditCard':
                    paymentData = this.getCreditCardData();
                    break;
                case 'transfer':
                    paymentData = this.getTransferData();
                    break;
                case 'deposit':
                    paymentData = this.getDepositData();
                    break;
                default:
                    throw new Error('Método de pago no válido');
            }

            if (!paymentData) {
                this.showNotification('Por favor completa todos los campos', 'warning');
                return;
            }

            const result = await chrome.storage.local.get(['authToken']);
            const token = result.authToken;

            if (!token) {
                this.showNotification('Debes iniciar sesión primero', 'warning');
                return;
            }

            const response = await fetch(`${this.apiBaseUrl}/payment/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    plan: this.selectedPlan,
                    paymentMethod: this.paymentMethod,
                    paymentData: paymentData,
                    amount: planData.price
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Pago exitoso
                await this.updateUserPlan(this.selectedPlan, data.user);
                this.showNotification('Pago procesado correctamente', 'success');
                this.showPlansSection();
                
                // Actualizar UI
                if (window.sriClickPopup && window.sriClickPopup.updateCreditDisplay) {
                    window.sriClickPopup.updateCreditDisplay();
                }
            } else {
                this.showNotification(data.message || 'Error al procesar pago', 'error');
            }
        } catch (error) {
            console.error('Payment processing error:', error);
            this.showNotification('Error al procesar pago', 'error');
        } finally {
            this.hideLoading();
        }
    }

    getCreditCardData() {
        const cardNumber = document.getElementById('cardNumber')?.value;
        const cardExpiry = document.getElementById('cardExpiry')?.value;
        const cardCvc = document.getElementById('cardCvc')?.value;
        const cardName = document.getElementById('cardName')?.value;

        if (!cardNumber || !cardExpiry || !cardCvc || !cardName) {
            return null;
        }

        return {
            cardNumber: cardNumber.replace(/\s/g, ''),
            expiry: cardExpiry,
            cvc: cardCvc,
            name: cardName
        };
    }

    getTransferData() {
        const receiptNumber = document.getElementById('transferReceipt')?.value;
        const amount = document.getElementById('transferAmount')?.value;

        if (!receiptNumber || !amount) {
            return null;
        }

        return {
            receiptNumber,
            amount: parseFloat(amount)
        };
    }

    getDepositData() {
        const receiptNumber = document.getElementById('depositReceipt')?.value;
        const amount = document.getElementById('depositAmount')?.value;

        if (!receiptNumber || !amount) {
            return null;
        }

        return {
            receiptNumber,
            amount: parseFloat(amount)
        };
    }

    async updateUserPlan(planType, userData) {
        const planData = this.getPlanData(planType);
        
        const userState = {
            email: userData.email,
            name: userData.name,
            plan: planData.name,
            creditsUsed: userData.creditsUsed || 0,
            creditsTotal: planData.credits === -1 ? 'Ilimitado' : planData.credits,
            expiry: userData.expiry || planData.duration
        };

        await chrome.storage.local.set({ userState });
    }

    formatCardNumber(event) {
        let value = event.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
        let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
        
        if (formattedValue.length > 19) {
            formattedValue = formattedValue.substring(0, 19);
        }
        
        event.target.value = formattedValue;
    }

    formatExpiryDate(event) {
        let value = event.target.value.replace(/\D/g, '');
        
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        
        event.target.value = value;
    }

    showLoading(message) {
        if (window.sriClickPopup && window.sriClickPopup.showLoading) {
            window.sriClickPopup.showLoading(message);
        }
    }

    hideLoading() {
        if (window.sriClickPopup && window.sriClickPopup.hideLoading) {
            window.sriClickPopup.hideLoading();
        }
    }

    showNotification(message, type) {
        if (window.sriClickPopup && window.sriClickPopup.showNotification) {
            window.sriClickPopup.showNotification(message, type);
        }
    }
};

// Credit System - Versión corregida sin módulos ES6
window.CreditSystem = class CreditSystem {
    constructor() {
        this.used = 0;
        this.total = 3000;
        this.plan = 'free';
    }

    async initialize() {
        await this.loadFromStorage();
    }

    async loadFromStorage() {
        try {
            const result = await chrome.storage.local.get(['userState']);
            const userState = result.userState;

            if (userState) {
                this.used = userState.creditsUsed || 0;
                this.total = userState.creditsTotal === 'Ilimitado' ? -1 : (userState.creditsTotal || 3000);
                this.plan = userState.plan || 'free';
            }
        } catch (error) {
            console.error('Error loading credit system:', error);
        }
    }

    async useCredits(amount = 1) {
        if (this.total === -1) {
            // Plan ilimitado
            return true;
        }

        if (this.used + amount > this.total) {
            return false; // No hay suficientes créditos
        }

        this.used += amount;
        await this.saveToStorage();
        return true;
    }

    async saveToStorage() {
        try {
            const result = await chrome.storage.local.get(['userState']);
            const userState = result.userState || {};

            userState.creditsUsed = this.used;
            
            await chrome.storage.local.set({ userState });
        } catch (error) {
            console.error('Error saving credit system:', error);
        }
    }

    getRemaining() {
        if (this.total === -1) {
            return 'Ilimitado';
        }
        return Math.max(0, this.total - this.used);
    }

    getUsagePercentage() {
        if (this.total === -1) {
            return 0;
        }
        return (this.used / this.total) * 100;
    }

    canUseCredits(amount = 1) {
        if (this.total === -1) {
            return true;
        }
        return (this.used + amount) <= this.total;
    }
};

