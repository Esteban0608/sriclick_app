#!/bin/bash

echo "🔧 Script de Reparación - Puerto 5000"
echo "===================================="

# Función para mostrar procesos en puerto 5000
check_port() {
    echo "📋 Verificando procesos en puerto 5000..."
    PROCESSES=$(sudo lsof -i :5000 2>/dev/null)
    if [ -z "$PROCESSES" ]; then
        echo "✅ Puerto 5000 está libre"
        return 0
    else
        echo "⚠️  Procesos encontrados en puerto 5000:"
        echo "$PROCESSES"
        return 1
    fi
}

# Función para terminar procesos en puerto 5000
kill_processes() {
    echo "🔄 Terminando procesos en puerto 5000..."
    
    # Obtener PIDs de procesos usando puerto 5000
    PIDS=$(sudo lsof -t -i :5000 2>/dev/null)
    
    if [ -z "$PIDS" ]; then
        echo "ℹ️  No hay procesos para terminar"
        return 0
    fi
    
    echo "🎯 Terminando PIDs: $PIDS"
    for PID in $PIDS; do
        sudo kill -9 $PID 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "✅ Proceso $PID terminado"
        else
            echo "❌ Error terminando proceso $PID"
        fi
    done
    
    sleep 2
}

# Función para arrancar el backend
start_backend() {
    echo "🚀 Intentando arrancar el backend..."
    
    # Verificar si existe el directorio del proyecto
    BACKEND_DIR="$HOME/sriclick_app/sriclick-backend"
    if [ ! -d "$BACKEND_DIR" ]; then
        echo "❌ Directorio no encontrado: $BACKEND_DIR"
        echo "💡 Asegúrate de que la ruta sea correcta"
        return 1
    fi
    
    cd "$BACKEND_DIR"
    
    # Verificar si existe package.json
    if [ ! -f "package.json" ]; then
        echo "❌ package.json no encontrado en $BACKEND_DIR"
        return 1
    fi
    
    # Verificar si node_modules existe
    if [ ! -d "node_modules" ]; then
        echo "📦 Instalando dependencias..."
        npm install
    fi
    
    echo "🎬 Ejecutando: npm run dev"
    npm run dev
}

# Ejecución principal
echo "🔍 Paso 1: Verificación inicial"
check_port

if [ $? -ne 0 ]; then
    echo ""
    echo "🛠️  Paso 2: Liberando puerto 5000"
    kill_processes
    
    echo ""
    echo "🔍 Paso 3: Verificación post-limpieza"
    check_port
fi

echo ""
echo "🚀 Paso 4: Arrancando backend"
start_backend

