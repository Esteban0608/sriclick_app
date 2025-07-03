# SRICLICK - Extensión de Chrome

## Descripción
Extensión de Chrome para la descarga masiva de facturas y notas de crédito del SRI (Servicio de Rentas Internas de Ecuador).

## Características
- Descarga automática de documentos XML del SRI
- Interfaz intuitiva integrada en el navegador
- Comunicación con la aplicación principal SRICLICK
- Sistema de créditos para controlar el uso
- Procesamiento automático a formato Excel

## Instalación

### Modo Desarrollador (Para pruebas)
1. Abre Chrome y ve a `chrome://extensions/`
2. Activa el "Modo de desarrollador" en la esquina superior derecha
3. Haz clic en "Cargar extensión sin empaquetar"
4. Selecciona la carpeta `chrome-extension`
5. La extensión aparecerá en tu barra de herramientas

### Instalación desde Chrome Web Store (Próximamente)
La extensión estará disponible en Chrome Web Store una vez completado el desarrollo.

## Uso

### Requisitos Previos
1. Tener instalada la aplicación principal SRICLICK
2. Tener una cuenta activa en el SRI
3. Tener créditos disponibles en tu cuenta SRICLICK

### Pasos para usar
1. Navega a [SRI en línea](https://srienlinea.sri.gob.ec/)
2. Inicia sesión con tus credenciales del SRI
3. Ve a la sección de consultas de documentos electrónicos
4. Haz clic en el ícono de SRICLICK en tu navegador
5. Selecciona el tipo de documentos a descargar:
   - Facturas
   - Notas de crédito
6. Haz clic en "Descargar" y espera a que se complete el proceso
7. Los archivos se procesarán automáticamente a Excel

## Estructura de Archivos

```
chrome-extension/
├── manifest.json          # Configuración de la extensión
├── popup.html             # Interfaz de usuario principal
├── popup.css              # Estilos de la interfaz
├── popup.js               # Lógica de la interfaz
├── content.js             # Script que se ejecuta en páginas del SRI
├── background.js          # Service worker de fondo
├── styles.css             # Estilos para content script
├── welcome.html           # Página de bienvenida
├── icons/                 # Iconos de la extensión
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # Este archivo
```

## Permisos Requeridos

La extensión requiere los siguientes permisos:
- `activeTab`: Para interactuar con la pestaña activa
- `downloads`: Para gestionar descargas de archivos
- `storage`: Para almacenar configuración local
- `nativeMessaging`: Para comunicarse con la aplicación principal
- `https://srienlinea.sri.gob.ec/*`: Para acceder al sitio del SRI
- `https://www.sri.gob.ec/*`: Para acceder al sitio del SRI

## Comunicación con la Aplicación Principal

La extensión se comunica con la aplicación principal SRICLICK mediante:
1. **Native Messaging**: Para enviar comandos y recibir respuestas
2. **Archivos compartidos**: Para transferir documentos descargados
3. **WebSocket** (opcional): Para comunicación en tiempo real

## Configuración

### Configuración de Native Messaging
Para que la extensión se comunique con la aplicación principal, es necesario registrar el host de native messaging:

**Windows:**
```json
{
  "name": "com.sriclick.app",
  "description": "SRICLICK Native Messaging Host",
  "path": "C:\\Program Files\\SRICLICK\\sriclick-host.exe",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://[EXTENSION_ID]/"
  ]
}
```

**Linux:**
```json
{
  "name": "com.sriclick.app",
  "description": "SRICLICK Native Messaging Host",
  "path": "/usr/local/bin/sriclick-host",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://[EXTENSION_ID]/"
  ]
}
```

## Desarrollo

### Requisitos de Desarrollo
- Chrome/Chromium 88+
- Node.js 14+ (para herramientas de desarrollo)
- Editor de código (VS Code recomendado)

### Scripts de Desarrollo
```bash
# Validar manifest
chrome --pack-extension=./chrome-extension

# Recargar extensión durante desarrollo
# Usar chrome://extensions/ y hacer clic en el botón de recarga
```

### Debugging
1. Abre Chrome DevTools en la página del popup: clic derecho en el ícono → "Inspeccionar popup"
2. Para el content script: F12 en la página del SRI → pestaña "Console"
3. Para el background script: chrome://extensions/ → "Inspeccionar vistas: service worker"

## Seguridad

### Medidas de Seguridad Implementadas
- Validación de origen para native messaging
- Sanitización de datos de entrada
- Verificación de permisos antes de ejecutar acciones
- Encriptación de datos sensibles en storage local

### Consideraciones de Privacidad
- No se almacenan credenciales del SRI
- Los datos se procesan localmente
- No se envían datos a servidores externos sin consentimiento

## Solución de Problemas

### Problemas Comunes

**La extensión no aparece:**
- Verifica que esté habilitada en chrome://extensions/
- Recarga la extensión si es necesario

**No se conecta con la aplicación principal:**
- Verifica que la aplicación SRICLICK esté ejecutándose
- Comprueba la configuración de native messaging
- Revisa los logs en la consola del background script

**Las descargas no funcionan:**
- Verifica que tengas créditos disponibles
- Asegúrate de estar en la página correcta del SRI
- Comprueba que hayas iniciado sesión en el SRI

**Error de permisos:**
- Verifica que la extensión tenga todos los permisos necesarios
- Recarga la página del SRI después de instalar la extensión

### Logs y Debugging
Los logs se pueden encontrar en:
1. Console del popup (clic derecho en ícono → Inspeccionar)
2. Console de la página del SRI (F12)
3. Background script console (chrome://extensions/)

## Contribución

Para contribuir al desarrollo:
1. Fork el repositorio
2. Crea una rama para tu feature
3. Realiza tus cambios
4. Ejecuta las pruebas
5. Envía un pull request

## Licencia

Copyright © 2025 SRICLICK. Todos los derechos reservados.

## Soporte

Para soporte técnico:
- Email: viajeinmediato@gmail.com
- Sitio web: [En desarrollo]

## Changelog

### v1.0.0 (En desarrollo)
- Implementación inicial de la extensión
- Descarga masiva de facturas y notas de crédito
- Interfaz de usuario básica
- Comunicación con aplicación principal

