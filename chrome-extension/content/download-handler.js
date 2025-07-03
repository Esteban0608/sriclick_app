export class DownloadHandler {
    constructor() {
        this.downloadUrls = {
            invoice: 'https://srienlinea.sri.gob.ec/descargaFactura',
            creditNote: 'https://srienlinea.sri.gob.ec/descargaNotaCredito'
        };
    }

    async processBatch(invoices) {
        const results = [];
        
        for (const invoice of invoices) {
            try {
                const result = await this.downloadSingle(invoice);
                results.push(result);
                
                // Notificar progreso
                chrome.runtime.sendMessage({
                    action: 'downloadProgress',
                    processed: results.length,
                    total: invoices.length
                });
            } catch (error) {
                results.push({
                    success: false,
                    invoiceId: invoice.id,
                    error: error.message
                });
            }
        }
        
        return results;
    }

    async downloadSingle(invoice) {
        const url = this.getDownloadUrl(invoice.type);
        const params = this.buildDownloadParams(invoice);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        
        chrome.runtime.sendMessage({
            action: 'fileDownloaded',
            invoiceId: invoice.id,
            downloadUrl,
            filename: this.generateFilename(invoice)
        });
        
        return {
            success: true,
            invoiceId: invoice.id
        };
    }

    getDownloadUrl(type) {
        return type === 'invoice' ? 
            this.downloadUrls.invoice : 
            this.downloadUrls.creditNote;
    }

    buildDownloadParams(invoice) {
        const params = new URLSearchParams();
        params.append('numero', invoice.number);
        params.append('fecha', invoice.date);
        params.append('emisor', invoice.emitterRuc);
        // Agregar más parámetros según sea necesario
        return params;
    }

    generateFilename(invoice) {
        const dateStr = invoice.date.replace(/[\/\s:]/g, '-');
        return `SRI-${invoice.type}-${invoice.number}-${dateStr}.xml`;
    }
}
