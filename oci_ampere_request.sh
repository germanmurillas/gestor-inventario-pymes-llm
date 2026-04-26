#!/bin/bash

# 🚀 OCI Ampere Instance Requester - Pymetory Edition
# Este script intenta crear una instancia VM.Standard.A1.Flex (Ampere)
# en bucle hasta que Oracle tenga disponibilidad de stock.

# --- CONFIGURACIÓN ---
COMPARTMENT_ID="REEMPLAZAR_CON_TU_OCID_DE_COMPARTIMENTO"
SUBNET_ID="REEMPLAZAR_CON_TU_OCID_DE_SUBNET"
SSH_PUB_KEY_FILE="~/.ssh/id_rsa.pub"
AVAILABILITY_DOMAIN="REEMPLAZAR_CON_TU_AD (Ej: US-ASHBURN-AD-1)"
DISPLAY_NAME="Pymetory-Ampere-24GB"

# --- RECURSOS (Ampere Always Free) ---
SHAPE="VM.Standard.A1.Flex"
OCPUS=4
MEMORY_GB=24
IMAGE_ID="ocid1.image.oc1.iad.aaaaaaaand7562fks..." # Ubuntu 22.04 OCID (Varía por región)

echo "⏳ Iniciando búsqueda de recursos en Oracle Cloud..."
echo "📍 Shape: $SHAPE ($OCPUS OCPUs / $MEMORY_GB GB RAM)"

while true; do
    echo "[$(date)] Intentando crear instancia $DISPLAY_NAME..."
    
    # Ejecuta el comando de OCI CLI
    ERROR_MSG=$(oci compute instance launch \
        --availability-domain "$AVAILABILITY_DOMAIN" \
        --compartment-id "$COMPARTMENT_ID" \
        --shape "$SHAPE" \
        --shape-config "{\"ocpus\":$OCPUS,\"memoryInGB\":$MEMORY_GB}" \
        --display-name "$DISPLAY_NAME" \
        --image-id "$IMAGE_ID" \
        --subnet-id "$SUBNET_ID" \
        --ssh-authorized-keys-file "$SSH_PUB_KEY_FILE" \
        --assign-public-ip true \
        2>&1)

    if [[ $? -eq 0 ]]; then
        echo "✅ ¡ÉXITO! Instancia creada satisfactoriamente."
        break
    else
        if [[ $ERROR_MSG == *"Out of capacity"* ]]; then
            echo "❌ Fuera de capacidad. Reintentando en 60 segundos..."
        else
            echo "⚠️ Error inesperado:"
            echo "$ERROR_MSG"
            echo "Reintentando en 120 segundos..."
        fi
    fi
    
    sleep 60
done
