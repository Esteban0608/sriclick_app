#!/bin/bash

echo "🔍 Script de Verificación - Backend SriClick"
echo "==========================================="

# Función para verificar si el puerto está en uso
check_port_status() {
    local port=$1
    echo "📡 Verificando puerto $port..."
    
    if command -v lsof >/dev/null 2>&1; then
        PROCESS=$(sudo lsof -i :$port 2>/dev/null)
        if [ -n "$PROCESS" ]; then
            echo "✅ Puerto $port está en uso:"
            echo "$PROCESS"
            return 0
        else
            echo "❌ Puerto $port está libre"
            return 1
        fi
    else
        echo "⚠️  lsof no disponible, usando netstat..."
        if netstat -tuln | grep -q ":$port "; then
            echo "✅ Puerto $port está en uso"
            return 0
        else
            echo "❌ Puerto $port está libre"
            return 1
        fi
    fi
}

# Función para probar conectividad HTTP
test_http_endpoint() {
    local url=$1
    local description=$2
    
    echo "🌐 Probando: $description"
    echo "   URL: $url"
    
    if command -v curl >/dev/null 2>&1; then
        RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/response.txt "$url" 2>/dev/null)
        HTTP_CODE="${RESPONSE: -3}"
        
        if [ "$HTTP_CODE" = "200" ]; then
            echo "   ✅ Respuesta exitosa (HTTP $HTTP_CODE)"
            echo "   📄 Contenido:"
            cat /tmp/response.txt | head -3
            echo ""
            return 0
        else
            echo "   ❌ Error HTTP $HTTP_CODE"
            return 1
        fi
    else
        echo "   ⚠️  curl no disponible, saltando prueba HTTP"
        return 1
    fi
}

# Función principal de verificación
verify_backend() {
    local port=${1:-5000}
    local host=${2:-localhost}
    
    echo "🎯 Verificando backend en $host:$port"
    echo ""
    
    # Verificar puerto
    check_port_status $port
    PORT_STATUS=$?
    
    if [ $PORT_STATUS -eq 0 ]; then
        echo ""
        echo "🧪 Ejecutando pruebas de conectividad..."
        
        # Probar endpoints
        test_http_endpoint "http://$host:$port/" "Endpoint principal"
        test_http_endpoint "http://$host:$port/api/health" "Health check"
        test_http_endpoint "http://$host:$port/api/test" "Endpoint de prueba"
        
        echo ""
        echo "✅ Verificación completada"
        echo "💡 Tu backend parece estar funcionando correctamente"
    else
        echo ""
        echo "❌ El backend no está corriendo en el puerto $port"
        echo "💡 Asegúrate de haber ejecutado 'npm run dev' en tu proyecto"
    fi
}

# Función para mostrar ayuda
show_help() {
    echo "Uso: $0 [puerto] [host]"
    echo ""
    echo "Parámetros:"
    echo "  puerto  Puerto a verificar (default: 5000)"
    echo "  host    Host a verificar (default: localhost)"
    echo ""
    echo "Ejemplos:"
    echo "  $0                    # Verificar localhost:5000"
    echo "  $0 3000               # Verificar localhost:3000"
    echo "  $0 5000 127.0.0.1     # Verificar 127.0.0.1:5000"
}

# Procesamiento de argumentos
case "$1" in
    -h|--help)
        show_help
        exit 0
        ;;
    "")
        verify_backend
        ;;
    *)
        verify_backend "$1" "$2"
        ;;
esac

