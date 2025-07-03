export class PaymentHandler {
    constructor() {
        this.selectedPlan = null;
        this.paymentMethod = 'creditCard';
        this.initEventListeners();
    }

    initEventListeners() {
        // Plan selection
        document.getElementById('selectFreePlan').addEventListener('click', () => this.selectPlan('free'));
        document.getElementById('selectBasicPlan').addEventListener('click', () => this.selectPlan('basic'));
        document.getElementById('selectProPlan').addEventListener('click', () => this.selectPlan('professional'));
        document.getElementById('selectUnlimitedPlan').addEventListener('click', () => this.selectPlan('unlimited'));
        
        // Payment method selection
        document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.changePaymentMethod(e.target.value));
        });
        
        // Payment confirmation
        document.getElementById('confirmPayment').addEventListener('click', () => this.processPayment());
        document.getElementById('backToPlans').addEventListener('click', () => this.showPlanSelection());
    }

    showPlanOptions() {
        document.getElementById('plansSection').style.display = 'block';
        document.getElementById('paymentMethods').style.display = 'none';
    }

    selectPlan(plan) {
        this.selectedPlan = plan;
        document.getElementById('plansSection').style.display = 'none';
        document.getElementById('paymentMethods').style.display = 'block';
        
        // Update payment form based on plan
        const amountField = document.getElementById('transferAmount') || document.getElementById('depositAmount');
        if (amountField) {
            const amount = this.getPlanAmount(plan);
            amountField.value = amount.toFixed(2);
            amountField.readOnly = true;
        }
    }

    getPlanAmount(plan) {
        const plans = {
            'free': 0,
            'basic': 40,
            'professional': 75,
            'unlimited': 100
        };
        return plans[plan] || 0;
    }

    changePaymentMethod(method) {
        this.paymentMethod = method;
        
        // Hide all forms first
        document.getElementById('creditCardForm').style.display = 'none';
        document.getElementById('transferForm').style.display = 'none';
        document.getElementById('depositForm').style.display = 'none';
        
        // Show selected form
        document.getElementById(`${method}Form`).style.display = 'block';
    }

    showPlanSelection() {
        document.getElementById('plansSection').style.display = 'block';
        document.getElementById('paymentMethods').style.display = 'none';
    }

    async processPayment() {
        const paymentData = this.collectPaymentData();
        
        if (!this.validatePaymentData(paymentData)) {
            return;
        }

        try {
            // Show loading
            document.getElementById('confirmPayment').disabled = true;
            document.getElementById('confirmPayment').textContent = 'Procesando...';
            
            // Process payment
            const result = await this.sendPaymentToServer(paymentData);
            
            if (result.success) {
                this.showPaymentSuccess(result);
                this.updateUserCredits(this.selectedPlan);
            } else {
                this.showPaymentError(result.message);
            }
        } catch (error) {
            this.showPaymentError(error.message);
        } finally {
            document.getElementById('confirmPayment').disabled = false;
            document.getElementById('confirmPayment').textContent = 'Confirmar Pago';
        }
    }

    collectPaymentData() {
        const baseData = {
            plan: this.selectedPlan,
            method: this.paymentMethod,
            amount: this.getPlanAmount(this.selectedPlan),
            date: new Date().toISOString()
        };
        
        if (this.paymentMethod === 'creditCard') {
            return {
                ...baseData,
                cardNumber: document.getElementById('cardNumber').value,
                cardExpiry: document.getElementById('cardExpiry').value,
                cardCvc: document.getElementById('cardCvc').value,
                cardName: document.getElementById('cardName').value
            };
        } else {
            const receiptField = this.paymentMethod === 'transfer' ? 
                'transferReceipt' : 'depositReceipt';
                
            return {
                ...baseData,
                receiptNumber: document.getElementById(receiptField).value,
                amount: parseFloat(document.getElementById(`${this.paymentMethod}Amount`).value)
            };
        }
    }

    validatePaymentData(data) {
        if (this.paymentMethod === 'creditCard') {
            if (!data.cardNumber || !data.cardExpiry || !data.cardCvc || !data.cardName) {
                this.showError('Por favor complete todos los campos de la tarjeta');
                return false;
            }
            
            if (!this.validateCardNumber(data.cardNumber)) {
                this.showError('Número de tarjeta inválido');
                return false;
            }
        } else {
            if (!data.receiptNumber) {
                this.showError('Por favor ingrese el número de comprobante');
                return false;
            }
            
            const expectedAmount = this.getPlanAmount(this.selectedPlan);
            if (Math.abs(data.amount - expectedAmount) > 0.01) {
                this.showError(`El monto debe ser exactamente $${expectedAmount.toFixed(2)}`);
                return false;
            }
        }
        
        return true;
    }

    async sendPaymentToServer(paymentData) {
        // En una implementación real, esto haría una llamada a tu backend
        return new Promise((resolve) => {
            setTimeout(() => {
                // Simular verificación de transferencia
                if (paymentData.method !== 'creditCard' && 
                    paymentData.receiptNumber.toLowerCase().includes('test')) {
                    resolve({ 
                        success: false, 
                        message: 'Comprobante no válido' 
                    });
                } else {
                    resolve({ 
                        success: true,
                        transactionId: 'TRX-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                        plan: paymentData.plan
                    });
                }
            }, 1500);
        });
    }

    showPaymentSuccess(result) {
        // Mostrar mensaje de éxito
        const successMessage = `¡Pago exitoso! Plan ${this.getPlanName(result.plan)} activado.`;
        alert(successMessage); // En una implementación real usarías un modal bonito
        
        // Ocultar sección de pagos
        document.getElementById('plansSection').style.display = 'none';
        document.getElementById('paymentMethods').style.display = 'none';
    }

    showPaymentError(message) {
        alert(`Error en el pago: ${message}`); // Reemplazar con modal de error
    }

    getPlanName(planKey) {
        const names = {
            'free': 'Gratuito',
            'basic': 'Básico',
            'professional': 'Profesional',
            'unlimited': 'Ilimitado'
        };
        return names[planKey] || planKey;
    }

    async updateUserCredits(plan) {
        const credits = this.calculateCreditsForPlan(plan);
        const expiryDate = this.calculateExpiryDate(plan);
        
        // Actualizar en chrome.storage.local
        const { userState } = await chrome.storage.local.get('userState');
        
        userState.credits = {
            remaining: credits,
            used: 0,
            total: credits,
            plan,
            expiry: expiryDate.toISOString()
        };
        
        await chrome.storage.local.set({ userState });
        
        // Notificar al popup para actualizar la UI
        chrome.runtime.sendMessage({
            action: 'creditsUpdated',
            credits: userState.credits
        });
    }

    calculateCreditsForPlan(plan) {
        const credits = {
            'free': 3000,
            'basic': 12000,
            'professional': 75000,
            'unlimited': Number.MAX_SAFE_INTEGER
        };
        return credits[plan] || 0;
    }

    calculateExpiryDate(plan) {
        const today = new Date();
        
        if (plan === 'free') {
            // 1 mes de prueba
            return new Date(today.setMonth(today.getMonth() + 1));
        } else {
            // 1 año para planes pagos
            return new Date(today.setFullYear(today.getFullYear() + 1));
        }
    }

    showError(message) {
        // Implementación simple - en producción usarías un sistema mejor
        alert(message);
    }
}
