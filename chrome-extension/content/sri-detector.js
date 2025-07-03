export class SRIDetector {
    constructor() {
        this.selectors = {
            invoiceTable: '#tblResultados',
            invoiceRow: 'tr.fila',
            downloadButton: 'input[value="Descargar"]',
            dateInputs: {
                start: '#txtFechaInicio',
                end: '#txtFechaFin'
            }
        };
    }

    startMonitoring() {
        const observer = new MutationObserver((mutations) => {
            if (this.isInvoiceTableVisible()) {
                chrome.runtime.sendMessage({
                    action: 'invoicesDetected',
                    count: this.countVisibleInvoices()
                });
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    async scanInvoices() {
        if (!this.isInvoiceTableVisible()) {
            throw new Error('No se encontró tabla de facturas');
        }

        const invoices = [];
        const rows = document.querySelectorAll(this.selectors.invoiceRow);

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 10) {
                invoices.push({
                    number: cells[0].textContent.trim(),
                    date: cells[1].textContent.trim(),
                    emitter: cells[2].textContent.trim(),
                    type: cells[3].textContent.trim(),
                    amount: cells[4].textContent.trim(),
                    downloadButton: row.querySelector(this.selectors.downloadButton)
                });
            }
        });

        return invoices;
    }

    // ... otros métodos de detección ...
}
