# Poner Forjapp en internet (appmaker7)

Guía para tener la plataforma completa (cuentas, editor, APK/AAB, anuncios, IA) en `https://appmaker7.com`.
Cambia `appmaker7.com` por tu dominio real en todos los pasos.

> Esta configuración no se ha podido probar de extremo a extremo en el entorno de desarrollo (no había Docker para construir las imágenes). Si algo falla en el paso 5, guarda la salida del comando y compártela.

## 1. Contratar un servidor (VPS)

- Sistema: **Ubuntu 24.04** (o 22.04).
- Mínimo: **2 vCPU, 4 GB de RAM, 40 GB de disco**. Compilar APK con Gradle consume mucha memoria; con 8 GB va más holgado.
- Cualquier proveedor sirve (Hetzner, DigitalOcean, OVH, Contabo…). Apunta la **IP pública** que te den.

## 2. Apuntar el dominio al servidor

En el panel de tu registrador de dominios crea un registro DNS:

| Tipo | Nombre | Valor |
|---|---|---|
| A | `@` | la IP del servidor |

Puede tardar desde minutos hasta unas horas en propagarse.

## 3. Entrar al servidor

```bash
ssh root@LA_IP_DEL_SERVIDOR
```

## 4. Descargar el proyecto

```bash
git clone -b claude/appcreator24-1em6l3 https://github.com/chris77-rgb/web1.git forjapp
cd forjapp
```

Si el repositorio es privado, Git te pedirá usuario y contraseña: como contraseña usa un *token* de GitHub (GitHub → Settings → Developer settings → Personal access tokens) con permiso de lectura del repositorio.

## 5. Instalar y arrancar (un solo comando)

```bash
sudo DOMAIN=appmaker7.com bash deploy/install.sh
```

El script instala Docker, crea el archivo `.env` con claves aleatorias, activa el cortafuegos (puertos 22, 80 y 443), añade memoria de intercambio si hace falta y arranca todo con HTTPS automático. **La primera vez tarda 15-30 minutos** (descarga el Android SDK y las dependencias de Gradle).

Al terminar muestra el **email y la contraseña del administrador**. Guárdalos.

## 6. Probarlo

Abre `https://appmaker7.com` (el certificado HTTPS puede tardar 1-2 minutos la primera vez) y entra con el administrador.

- Los usuarios nuevos tienen que **verificar su email** para compilar. Sin SMTP configurado no reciben el correo: verifícalos tú en **Admin → Usuarios → Verificar**, o configura `SMTP_URL` (paso 7).
- Para compilar un APK: crea una app, pulsa **Generar APK / AAB** y espera a que termine; se descarga desde la misma página.

## 7. Configuración opcional

Edita `.env` en el servidor (`nano .env`) y reinicia:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

| Variable | Para qué |
|---|---|
| `SMTP_URL` | Enviar emails de verificación y recuperación (ej. `smtps://usuario:clave@smtp.tuproveedor.com:465`) |
| `ANTHROPIC_API_KEY` | IA de la plataforma para usuarios sin IA propia |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Cobrar los planes |
| `BUILDER_CONCURRENCY` | Compilaciones a la vez (sube a 2 con 8 GB de RAM) |

**No cambies nunca `ENCRYPTION_KEY`**: cifra las claves de firma de las apps y sin ella no se pueden publicar actualizaciones.

## 8. Actualizar a una versión nueva

```bash
cd forjapp
git pull
sudo DOMAIN=appmaker7.com bash deploy/install.sh
```

## 9. Copias de seguridad (importante)

La base de datos y el almacenamiento (imágenes, **claves de firma** y APK) están en volúmenes de Docker. Si se pierden las claves de firma, las apps publicadas en Google Play no se podrán actualizar.

```bash
# Base de datos
docker compose exec -T db pg_dump -U forjapp forjapp > backup-$(date +%F).sql
# Archivos (el volumen se llama <carpeta>_storage, aquí forjapp_storage)
docker run --rm -v forjapp_storage:/data -v "$PWD":/backup alpine tar czf /backup/storage-$(date +%F).tgz -C /data .
```

Copia esos archivos fuera del servidor con regularidad.

## Problemas frecuentes

- **La web no carga**: `docker compose -f docker-compose.yml -f docker-compose.prod.yml ps` y `... logs -f web`.
- **Error de certificado**: el DNS aún no apunta al servidor; espera y reinicia Caddy (`... restart caddy`).
- **Las compilaciones fallan**: `... logs -f builder`. Suele ser falta de memoria: amplía la RAM o deja `BUILDER_CONCURRENCY=1`.
