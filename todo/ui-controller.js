export class UIController {
    constructor() {
        this.views = {
            'login': document.getElementById('loginView'),
            'dashboard': document.getElementById('dashboardView'),
            'progress': document.getElementById('progressView')
        };
    }

    updateUI(currentView) {
        // Ocultar todas las vistas
        Object.values(this.views).forEach(view => {
            view.style.display = 'none';
        });
        
        // Mostrar vista actual
        if (this.views[currentView]) {
            this.views[currentView].style.display = 'block';
        }
    }

    startDownloadProcess(startDate, endDate) {
        if (!startDate || !endDate) {
            this.showError('Por favor seleccione un rango de fechas');
            return;
        }
        
        this.updateUI('progress');
        
        chrome.runtime.sendMessage({
            action: 'startDownload',
            dateRange: { startDate, endDate }
        }, (response) => {
            if (response?.error) {
                this.showError(response.error);
                this.updateUI('dashboard');
            }
        });
    }

    updateDownloadProgress(processed, total) {
        if (!this.views.progress.style.display === 'block') return;
        
        const percent = Math.round((processed / total) * 100);
        document.getElementById('progressFill').style.width = `${percent}%`;
        document.getElementById('progressText').textContent = `${percent}%`;
        document.getElementById('downloadedCount').textContent = processed;
        document.getElementById('remainingCount').textContent = total - processed;
    }

    showError(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        
        const container = document.querySelector('.container');
        container.prepend(errorElement);
        
        setTimeout(() => {
            errorElement.remove();
        }, 5000);
    }

    showSecurityDashboard() {
        chrome.runtime.sendMessage({ action: 'getSecurityStatus' }, (response) => {
            const dashboardHtml = `
                <div class="security-dashboard">
                    <h3>Estado de Seguridad</h3>
                    <div class="security-metric">
                        <span class="label">Dispositivo verificado:</span>
                        <span class="value ${response.deviceVerified ? 'good' : 'bad'}">
                            ${response.deviceVerified ? '✅ Sí' : '❌ No'}
                        </span>
                    </div>
                    <div class="security-metric">
                        <span class="label">VPN detectada:</span>
                        <span class="value ${response.vpnDetected ? 'bad' : 'good'}">
                            ${response.vpnDetected ? '❌ Sí' : '✅ No'}
                        </span>
                    </div>
                    <div class="security-actions">
                        <button id="refreshSecurity">Actualizar</button>
                    </div>
                </div>
            `;
            
            document.getElementById('dashboardView').innerHTML += dashboardHtml;
            document.getElementById('refreshSecurity').addEventListener('click', () => {
                this.showSecurityDashboard();
            });
        });
    }
}
