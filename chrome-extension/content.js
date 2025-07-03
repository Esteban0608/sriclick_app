// Content Script para SRICLICK
// Se ejecuta en el contexto de las páginas del SRI

console.log('SRICLICK Content Script loaded');

// Estado del content script
let isProcessing = false;
let downloadQueue = [];

// Configuración
const CONFIG = {
    selectors: {
        downloadButton: 'input[value="DESCARGAR REPORTE"]',
        documentTable: 'table[class*="tabla"]',
        documentRows: 'tr[class*="fila"]',
        dateInputs: 'input[type="text"][name*="fecha"]',
        typeSelect: 'select[name*="tipo"]'
    },
    delays: {
        betweenDownloads: 2000,
        pageLoad: 1000,
        buttonClick: 500
    }
};

// Listener para mensajes del popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    switch (request.action) {
        case 'downloadDocuments':
            handleDownloadRequest(request.type)
                .then(result => sendResponse(result))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true; // Mantener el canal abierto para respuesta asíncrona
            
        case 'checkPageStatus':
            sendResponse(getPageStatus());
            break;
            
        case 'getDocumentCount':
            sendResponse(getDocumentCount());
            break;
            
        default:
            sendResponse({ success: false, error: 'Acción no reconocida' });
    }
});

// Manejar solicitud de descarga
async function handleDownloadRequest(documentType) {
    if (isProcessing) {
        throw new Error('Ya hay una descarga en proceso');
    }
    
    if (!isOnSRIPage()) {
        throw new Error('Debes estar en la página de consultas del SRI');
    }
    
    try {
        isProcessing = true;
        
        // Verificar que estamos en la página correcta
        if (!isOnDocumentQueryPage()) {
            await navigateToDocumentQuery();
        }
        
        // Configurar filtros para el tipo de documento
        await setDocumentTypeFilter(documentType);
        
        // Obtener lista de documentos
        const documents = await getDocumentList();
        
        if (documents.length === 0) {
            throw new Error('No se encontraron documentos para descargar');
        }
        
        // Descargar documentos
        const downloadedCount = await downloadDocuments(documents);
        
        return {
            success: true,
            documentsCount: downloadedCount,
            message: `${downloadedCount} documentos descargados exitosamente`
        };
        
    } finally {
        isProcessing = false;
    }
}

// Verificar si estamos en una página del SRI
function isOnSRIPage() {
    return window.location.hostname.includes('sri.gob.ec');
}

// Verificar si estamos en la página de consulta de documentos
function isOnDocumentQueryPage() {
    return window.location.pathname.includes('consulta') || 
           document.querySelector(CONFIG.selectors.downloadButton) !== null;
}

// Navegar a la página de consulta de documentos
async function navigateToDocumentQuery() {
    // Buscar el enlace de consultas en el menú
    const consultaLink = Array.from(document.querySelectorAll('a'))
        .find(link => link.textContent.toLowerCase().includes('consulta'));
    
    if (consultaLink) {
        consultaLink.click();
        await waitForPageLoad();
    } else {
        throw new Error('No se pudo encontrar el enlace de consultas');
    }
}

// Configurar filtro de tipo de documento
async function setDocumentTypeFilter(documentType) {
    const typeSelect = document.querySelector(CONFIG.selectors.typeSelect);
    
    if (typeSelect) {
        let optionValue;
        
        switch (documentType) {
            case 'facturas':
                optionValue = '01'; // Código para facturas
                break;
            case 'notas':
                optionValue = '04'; // Código para notas de crédito
                break;
            default:
                throw new Error('Tipo de documento no válido');
        }
        
        // Seleccionar el tipo de documento
        typeSelect.value = optionValue;
        typeSelect.dispatchEvent(new Event('change'));
        
        await delay(CONFIG.delays.buttonClick);
    }
}

// Obtener lista de documentos disponibles
async function getDocumentList() {
    // Hacer clic en consultar para cargar la lista
    const consultarBtn = Array.from(document.querySelectorAll('input[type="button"], button'))
        .find(btn => btn.value?.toLowerCase().includes('consultar') || 
                     btn.textContent?.toLowerCase().includes('consultar'));
    
    if (consultarBtn) {
        consultarBtn.click();
        await delay(CONFIG.delays.pageLoad);
    }
    
    // Obtener filas de documentos de la tabla
    const documentRows = document.querySelectorAll(CONFIG.selectors.documentRows);
    const documents = [];
    
    documentRows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
            documents.push({
                index: index,
                row: row,
                data: Array.from(cells).map(cell => cell.textContent.trim())
            });
        }
    });
    
    return documents;
}

// Descargar documentos
async function downloadDocuments(documents) {
    let downloadedCount = 0;
    
    // Buscar el botón de descarga
    const downloadBtn = document.querySelector(CONFIG.selectors.downloadButton);
    
    if (!downloadBtn) {
        throw new Error('No se encontró el botón de descarga');
    }
    
    // Configurar listener para descargas
    setupDownloadListener();
    
    // Hacer clic en el botón de descarga
    downloadBtn.click();
    
    // Esperar a que se complete la descarga
    await delay(CONFIG.delays.betweenDownloads);
    
    downloadedCount = documents.length;
    
    return downloadedCount;
}

// Configurar listener para interceptar descargas
function setupDownloadListener() {
    // Interceptar clics en enlaces de descarga
    document.addEventListener('click', (event) => {
        const target = event.target;
        
        if (target.tagName === 'A' && target.href && 
            (target.href.includes('.xml') || target.href.includes('.txt'))) {
            
            // Notificar al background script sobre la descarga
            chrome.runtime.sendMessage({
                action: 'fileDownloaded',
                url: target.href,
                filename: extractFilenameFromUrl(target.href)
            });
        }
    });
}

// Extraer nombre de archivo de URL
function extractFilenameFromUrl(url) {
    const urlParts = url.split('/');
    return urlParts[urlParts.length - 1];
}

// Obtener estado de la página
function getPageStatus() {
    return {
        isOnSRIPage: isOnSRIPage(),
        isOnDocumentQueryPage: isOnDocumentQueryPage(),
        hasDocuments: document.querySelectorAll(CONFIG.selectors.documentRows).length > 0,
        isProcessing: isProcessing
    };
}

// Obtener conteo de documentos
function getDocumentCount() {
    const documentRows = document.querySelectorAll(CONFIG.selectors.documentRows);
    return {
        count: documentRows.length,
        visible: Array.from(documentRows).filter(row => 
            row.offsetParent !== null
        ).length
    };
}

// Utilidades
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForPageLoad() {
    return new Promise(resolve => {
        if (document.readyState === 'complete') {
            resolve();
        } else {
            window.addEventListener('load', resolve);
        }
    });
}

// Inyectar estilos para mejorar la experiencia
function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .sriclick-processing {
            position: fixed;
            top: 10px;
            right: 10px;
            background: #667eea;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
        
        .sriclick-success {
            background: #28a745;
        }
        
        .sriclick-error {
            background: #dc3545;
        }
    `;
    document.head.appendChild(style);
}

// Mostrar notificación en la página
function showPageNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `sriclick-processing sriclick-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    console.log('SRICLICK Content Script initialized');
});

// Si el DOM ya está cargado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        injectStyles();
    });
} else {
    injectStyles();
}

