export class SecuritySystem {
    constructor() {
        this.vpnCheckInterval = null;
        this.devices = [];
    }

    async initialize() {
        await this.loadDeviceFingerprints();
        this.startVPNDetection();
    }

    async loadDeviceFingerprints() {
        const { devices } = await chrome.storage.local.get('registeredDevices');
        this.devices = devices || [];
    }

    async performSecurityChecks() {
        const checks = [
            this.checkVPNStatus(),
            this.checkDeviceFingerprint(),
            this.checkLocationConsistency(),
            this.checkBehaviorPatterns()
        ];

        const results = await Promise.allSettled(checks);
        const failures = results.filter(r => r.status === 'rejected');

        if (failures.length > 0) {
            throw new Error(failures.map(f => f.reason).join(' | '));
        }

        return { secure: true };
    }

    async checkVPNStatus() {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        if (data.vpn || data.proxy || data.tor) {
            throw new Error('VPN_DETECTED');
        }
        
        return true;
    }

    async checkDeviceFingerprint() {
        const fingerprint = await this.generateFingerprint();
        
        if (!this.devices.includes(fingerprint)) {
            if (this.devices.length >= 3) {
                throw new Error('DEVICE_LIMIT_EXCEEDED');
            }
            this.devices.push(fingerprint);
            await chrome.storage.local.set({ registeredDevices: this.devices });
        }
        
        return true;
    }

    async generateFingerprint() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        const fingerprintData = {
            userAgent: navigator.userAgent,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: navigator.deviceMemory,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            webglVendor: gl.getParameter(gl.VENDOR),
            webglRenderer: gl.getParameter(gl.RENDERER)
        };
        
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(fingerprintData));
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    startVPNDetection() {
        this.vpnCheckInterval = setInterval(async () => {
            try {
                await this.checkVPNStatus();
            } catch (error) {
                chrome.action.setBadgeText({ text: '!' });
                chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon48.png',
                    title: 'Problema de Seguridad',
                    message: 'VPN detectada. Desactívela para continuar usando SRICLICK.'
                });
            }
        }, 3600000); // Check every hour
    }

    // ... otros métodos de seguridad ...
}
