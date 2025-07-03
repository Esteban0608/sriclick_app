export class DownloadManager {
    constructor() {
        this.downloadQueue = [];
        this.activeDownloads = 0;
        this.maxParallelDownloads = 3;
    }

    async startBatchDownload({ dateRange, invoiceIds }) {
        try {
            // Obtener facturas del content script
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const { invoices } = await chrome.tabs.sendMessage(tab.id, {
                action: 'getInvoices',
                dateRange,
                invoiceIds
            });

            if (!invoices || invoices.length === 0) {
                throw new Error('No se encontraron facturas para descargar');
            }

            // Agregar a la cola
            this.downloadQueue = [...invoices];
            
            // Iniciar descargas
            this.processDownloadQueue();

            return {
                success: true,
                total: invoices.length
            };
        } catch (error) {
            console.error('Download error:', error);
            throw error;
        }
    }

    processDownloadQueue() {
        while (this.activeDownloads < this.maxParallelDownloads && this.downloadQueue.length > 0) {
            this.activeDownloads++;
            const invoice = this.downloadQueue.shift();
            
            this.downloadInvoice(invoice)
                .finally(() => {
                    this.activeDownloads--;
                    this.processDownloadQueue();
                });
        }
    }

    async downloadInvoice(invoice) {
        try {
            // Enviar mensaje al content script para descargar
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.tabs.sendMessage(tab.id, {
                action: 'downloadInvoice',
                invoice
            });

            // Registrar descarga exitosa
            chrome.runtime.sendMessage({
                action: 'downloadComplete',
                invoiceId: invoice.id
            });
        } catch (error) {
            console.error(`Error downloading invoice ${invoice.id}:`, error);
            
            // Reintentar si es posible
            if (invoice.retryCount < 3) {
                invoice.retryCount = (invoice.retryCount || 0) + 1;
                this.downloadQueue.push(invoice);
            }
        }
    }
}
