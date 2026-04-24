# 🚀 Guía de Despliegue Ninja - Pymetory (Oracle Cloud)

Esta guía contiene los pasos exactos para llevar PYMETORY de local a producción en una instancia **Always Free de Oracle Cloud (OCI)**.

## 🏗️ 1. Preparación de la Instancia (OCI Console)
Una vez creado el perfil, debemos crear la "Compute Instance":
- **Imagen:** Ubuntu 22.04 LTS o 24.04.
- **Forma:** `VM.Standard.A1.Flex` (Ampere ARM).
- **Recursos:** 4 OCPUs / 24 GB RAM (El máximo gratuito).
- **Red:** Crear una VCN pública y asignar una IP estática (Reserved Public IP).

### Puertos Necesarios (Ingress Rules)
En la lista de seguridad de la VCN, abrir:
- `80` (HTTP)
- `443` (HTTPS)
- `8000` (Para el servicio del LLM/RAG si lo corremos independiente)
- `22` (SSH - Ya viene abierto por defecto)

---

## 📦 2. Configuración del Servidor (SSH)
Conectarse vía SSH: `ssh -i llave.key ubuntu@tu_ip_publica`

### Instalación de Dependencias (Script Rápido)
```bash
sudo apt update && sudo apt upgrade -y
# Instalar Docker y Docker Compose (Recomendado para evitar peleas de versiones)
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker $USER
```

---

## 🚀 3. Despliegue del Proyecto
1. **Clonar Repo:** `git clone https://github.com/tu-usuario/pymetory.git`
2. **Configurar Env:** `cp .env.example .env` (Editar con credenciales de producción).
3. **Optimización de Producción:**
   - `composer install --optimize-autoloader --no-dev`
   - `npm install && npm run build`
4. **Permisos de Storage:**
   - `sudo chown -R www-data:www-data storage bootstrap/cache`
   - `sudo chmod -R 775 storage bootstrap/cache`

---

## 🔐 4. SSL & Nginx
Usaremos **Certbot** para el candadito verde:
```bash
sudo apt install nginx certbot python3-certbot-nginx -y
sudo certbot --nginx -d tu-dominio.com
```

---

**Nota de Jorge:** Germán, este archivo es nuestro "as bajo la manga". A medida que avancemos con la IP real, iré actualizando los comandos específicos aquí. ¡Héctor va a flipar cuando vea el dashboard cargando en 1 segundo en un servidor de 24GB!
