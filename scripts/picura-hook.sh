#!/bin/bash

# Función para verificar si estamos en un proyecto PICURA
is_picura_project() {
    [ -f ".picura/config.json" ]
}

# Verificar si estamos en un proyecto PICURA
if ! is_picura_project; then
    echo "Este no parece ser un proyecto PICURA. Saltando las comprobaciones de PICURA."
    exit 0
fi

# Obtener el nombre del hook actual
HOOK_NAME=$(basename "$0")

case "$HOOK_NAME" in
    pre-commit)
        echo "Ejecutando comprobaciones pre-commit de PICURA..."
        # Aquí puedes agregar comprobaciones específicas pre-commit
        # Por ejemplo, ejecutar tests, linter, etc.
        npm run lint
        ;;
    post-commit)
        echo "Ejecutando acciones post-commit de PICURA..."
        # Aquí puedes agregar acciones específicas post-commit
        # Por ejemplo, actualizar documentación, etc.
        ;;
    pre-push)
        echo "Ejecutando comprobaciones pre-push de PICURA..."
        # Aquí puedes agregar comprobaciones específicas pre-push
        # Por ejemplo, ejecutar tests completos, etc.
        npm test
        ;;
    *)
        echo "Hook no reconocido: $HOOK_NAME"
        exit 1
        ;;
esac

exit 0