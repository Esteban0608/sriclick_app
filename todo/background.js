// Background Service Worker para SRICLICK (MV3 compatible)
console.log('SRICLICK Background Service Worker loaded');

// Estado global
let downloadQueue = [];
let processingStatus = {
    isProcessing: false,
    currentOperation: null,
    progress: 0
};

// Listener para mensajes de content scripts y popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);
    
    switch (request.action) {
        case 'fileDownloaded':
            handleFileDownloaded(request);
            break;
            
        case 'getProcessingStatus':
            sendResponse(processingStatus);
            break;
            
        case 'clearDownloadQueue':
            downloadQueue = [];
            sendResponse({ success: true });
            break;
            
        default:
            console.log('Unknown action:', request.action);
    }
});

// Listener para eventos de descarga (permitidos en MV3)
chrome.downloads.onChanged.addListener((downloadDelta) => {
    if (downloadDelta.state?.current === 'complete') {
        handleDownloadComplete(downloadDelta.id);
    }
});

// Listener para instalación (sin UI)
chrome.runtime.onInstalled.addListener((details) => {
    console.log('SRICLICK Extension installed:', details);
    // Solo log, sin abrir pestañas
});

// Manejar archivo descargado
function handleFileDownloaded(fileInfo) {
    console.log('File downloaded:', fileInfo);
    downloadQueue.push({
        url: fileInfo.url,
        filename: fileInfo.filename,
        timestamp: Date.now(),
        processed: false
    });
    notifyNativeApp('fileDownloaded', fileInfo);
}

// ... (resto de tus funciones auxiliares como isSRIFile, addToDownloadQueue, etc.)

// Configurar alarmas para tareas periódicas (requiere permiso "alarms")
chrome.alarms.onAlarm.addListener((alarm) => {
    switch (alarm.name) {
        case 'cleanup':
            cleanupOldFiles();
            break;
        case 'sync':
            notifyNativeApp('sync', getDownloadStats());
            break;
    }
});

// Crear alarmas al iniciar
chrome.runtime.onStartup.addListener(() => {
    chrome.alarms.create('cleanup', { periodInMinutes: 60 });
    chrome.alarms.create('sync', { periodInMinutes: 5 });
});
