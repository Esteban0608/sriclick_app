#!/bin/bash

echo "🚀 Iniciador Automático - Proyecto SriClick"
echo "==========================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Función para mostrar mensajes con colores
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${PURPLE}🔄 $1${NC}"
}

# Configuración
BACKEND_DIR="$HOME/sriclick_app/sriclick-backend"
BACKEND_PORT=5000
MONGODB_PORT=27017

# Función para verificar si un puerto está libre
is_port_free() {
    local port=$1
    ! sudo lsof -i :$port >/dev/null 2>&1
}

# Función para liberar puerto
free_port() {
    local port=$1
    log_step "Liberando puerto $port..."
    
    PIDS=$(sudo lsof -t -i :$port 2>/dev/null)
    if [ -n "$PIDS" ]; then
        log_info "Terminando procesos en puerto $port: $PIDS"
        for PID in $PIDS; do
            sudo kill -9 $PID 2>/dev/null
            if [ $? -eq 0 ]; then
                log_success "Proceso $PID terminado"
            fi
        done
        sleep 2
    else
        log_info "Puerto $port ya está libre"
    fi
}

# Función para verificar MongoDB
check_mongodb() {
    log_step "Verificando MongoDB..."
    
    # Verificar si está instalado
    if ! command -v mongod >/dev/null 2>&1; then
        log_error "MongoDB no está instalado"
        log_info "Ejecuta: ./install_mongodb.sh"
        return 1
    fi
    
    # Verificar si está corriendo
    if systemctl is-active --quiet mongod || systemctl is-active --quiet mongodb; then
        log_success "MongoDB está corriendo"
        return 0
    else
        log_warning "MongoDB no está corriendo, intentando arrancar..."
        
        # Intentar arrancar
        if systemctl list-unit-files | grep -q "mongod.service"; then
            sudo systemctl start mongod
        elif systemctl list-unit-files | grep -q "mongodb.service"; then
            sudo systemctl start mongodb
        else
            log_error "Servicio de MongoDB no encontrado"
            return 1
        fi
        
        sleep 3
        
        # Verificar nuevamente
        if systemctl is-active --quiet mongod || systemctl is-active --quiet mongodb; then
            log_success "MongoDB arrancado exitosamente"
            return 0
        else
            log_error "No se pudo arrancar MongoDB"
            return 1
        fi
    fi
}

# Función para verificar el directorio del backend
check_backend_directory() {
    log_step "Verificando directorio del backend..."
    
    if [ ! -d "$BACKEND_DIR" ]; then
        log_error "Directorio no encontrado: $BACKEND_DIR"
        log_info "Asegúrate de que la ruta sea correcta"
        return 1
    fi
    
    if [ ! -f "$BACKEND_DIR/package.json" ]; then
        log_error "package.json no encontrado en $BACKEND_DIR"
        return 1
    fi
    
    if [ ! -f "$BACKEND_DIR/server.js" ]; then
        log_error "server.js no encontrado en $BACKEND_DIR"
        return 1
    fi
    
    log_success "Directorio del backend verificado"
    return 0
}

# Función para instalar dependencias si es necesario
check_dependencies() {
    log_step "Verificando dependencias del backend..."
    
    cd "$BACKEND_DIR"
    
    if [ ! -d "node_modules" ]; then
        log_warning "node_modules no encontrado, instalando dependencias..."
        npm install
        
        if [ $? -eq 0 ]; then
            log_success "Dependencias instaladas"
        else
            log_error "Error instalando dependencias"
            return 1
        fi
    else
        log_success "Dependencias ya instaladas"
    fi
    
    return 0
}

# Función para arrancar el backend
start_backend() {
    log_step "Arrancando backend de SriClick..."
    
    cd "$BACKEND_DIR"
    
    log_info "Ejecutando: npm run dev"
    log_info "Directorio: $BACKEND_DIR"
    log_info "Puerto esperado: $BACKEND_PORT"
    
    echo ""
    log_success "🎉 Iniciando backend..."
    echo ""
    
    # Ejecutar npm run dev
    npm run dev
}

# Función para mostrar información del sistema
show_system_status() {
    echo ""
    log_info "📊 Estado del Sistema:"
    echo "======================"
    
    # MongoDB
    if systemctl is-active --quiet mongod || systemctl is-active --quiet mongodb; then
        log_success "MongoDB: Corriendo"
    else
        log_error "MongoDB: No corriendo"
    fi
    
    # Puerto 27017
    if ! is_port_free $MONGODB_PORT; then
        log_success "Puerto 27017: En uso (MongoDB)"
    else
        log_warning "Puerto 27017: Libre"
    fi
    
    # Puerto 5000
    if ! is_port_free $BACKEND_PORT; then
        log_warning "Puerto 5000: En uso"
    else
        log_success "Puerto 5000: Libre"
    fi
    
    # Directorio del proyecto
    if [ -d "$BACKEND_DIR" ]; then
        log_success "Directorio backend: Encontrado"
    else
        log_error "Directorio backend: No encontrado"
    fi
    
    echo ""
}

# Función para mostrar ayuda
show_help() {
    echo "Uso: $0 [opciones]"
    echo ""
    echo "Opciones:"
    echo "  -h, --help          Mostrar esta ayuda"
    echo "  -c, --check         Solo verificar estado, no arrancar"
    echo "  -f, --force         Forzar liberación de puertos"
    echo "  --backend-dir DIR   Especificar directorio del backend"
    echo ""
    echo "Ejemplos:"
    echo "  $0                  # Arrancar proyecto completo"
    echo "  $0 --check          # Solo verificar estado"
    echo "  $0 --force          # Liberar puertos y arrancar"
    echo ""
}

# Función principal
main() {
    local check_only=false
    local force_ports=false
    
    # Procesar argumentos
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -c|--check)
                check_only=true
                shift
                ;;
            -f|--force)
                force_ports=true
                shift
                ;;
            --backend-dir)
                BACKEND_DIR="$2"
                shift 2
                ;;
            *)
                log_error "Opción desconocida: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    echo ""
    log_info "Configuración:"
    echo "  Backend: $BACKEND_DIR"
    echo "  Puerto backend: $BACKEND_PORT"
    echo "  Puerto MongoDB: $MONGODB_PORT"
    
    show_system_status
    
    if [ "$check_only" = true ]; then
        log_info "Solo verificación solicitada, saliendo..."
        exit 0
    fi
    
    echo ""
    log_step "Iniciando proceso de arranque..."
    
    # Paso 1: Liberar puertos si es necesario
    if [ "$force_ports" = true ] || ! is_port_free $BACKEND_PORT; then
        echo ""
        free_port $BACKEND_PORT
    fi
    
    # Paso 2: Verificar/arrancar MongoDB
    echo ""
    if ! check_mongodb; then
        log_error "MongoDB no está disponible"
        log_info "Ejecuta: ./install_mongodb.sh"
        exit 1
    fi
    
    # Paso 3: Verificar directorio del backend
    echo ""
    if ! check_backend_directory; then
        exit 1
    fi
    
    # Paso 4: Verificar dependencias
    echo ""
    if ! check_dependencies; then
        exit 1
    fi
    
    # Paso 5: Arrancar backend
    echo ""
    log_success "🎯 Todo listo para arrancar el backend"
    echo ""
    log_info "Presiona Ctrl+C para detener el servidor cuando termines"
    echo ""
    
    start_backend
}

# Verificar que no se ejecute como root
if [ "$EUID" -eq 0 ]; then
    log_error "No ejecutes este script como root"
    exit 1
fi

# Ejecutar función principal
main "$@"

