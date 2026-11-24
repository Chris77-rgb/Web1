# Forjapp

Plataforma SaaS no-code para **crear, personalizar y compilar aplicaciones Android** desde el navegador: plantillas, editor visual con vista previa en tiempo real, asistente de IA y **compilación real de APK/AAB** con Android SDK y Gradle.

> Inspirada en el concepto de AppCreator24, con identidad visual y código propios.

## Qué incluye

| Área | Estado |
|---|---|
| Registro, login, verificación de email, recuperación de contraseña, perfil | ✅ |
| Panel con estadísticas, uso del plan y estado de compilaciones | ✅ |
| 11 plantillas (noticias, radio, música, vídeo, tienda, restaurante, educación, comunidad, empresa, web, en blanco) | ✅ |
| Editor visual: páginas, bloques (arrastrar/ordenar), diseño, navegación, marca, ajustes Android, autoguardado, deshacer/rehacer | ✅ |
| Vista previa en un Android simulado, con el **mismo runtime** que lleva el APK | ✅ |
| 22 módulos configurables (RSS, radio, música, vídeo, galería, formularios, contacto, mapa, redes, favoritos, buscador, usuarios, push, navegador web…) | ✅ |
| **Publicación como página web** (`/s/<nombre>`): enlace propio, funciona en móvil, tableta y PC, instalable en la pantalla de inicio | ✅ |
| **Publicidad**: anuncio propio del creador + anuncios de Forjapp (20 % / 100 %), servicio Adfree por app, gestión de anuncios en el admin | ✅ |
| Servicio de compilación independiente: cola en PostgreSQL, firma por app, APK y AAB, logs en vivo, cancelación, versiones | ✅ |
| Asistente de IA (Claude) para crear y modificar apps con lenguaje natural | ✅ |
| Panel de administración: usuarios, proyectos, compilaciones, plantillas, planes, configuración | ✅ |
| Planes Gratis / Básico / Profesional / Empresarial con límites; Stripe preparado (desactivado hasta configurarlo) | ✅ |
| Docker Compose (db, migraciones, web, builder escalable) | ✅ (no probado en este entorno: sin daemon Docker) |

## Publicar como página web y publicidad

El creador pulsa **Publicar** en el editor y su app queda en `https://tu-dominio/s/<nombre>`. Los cambios del editor no se ven en la web hasta pulsar **Actualizar página**. La página se sirve dentro de un iframe con `sandbox` sin acceso a cookies de la plataforma (el contenido lo controlan los creadores).

Reglas de publicidad (mismo modelo que AppCreator24; la decisión la toma el servidor en `apps/web/src/lib/ads.ts`):

| Situación | Qué ve el visitante |
|---|---|
| El creador no pone anuncio propio | Anuncio de Forjapp al **100 %** de los visitantes |
| El creador pone su anuncio | Anuncio de Forjapp al **20 %** (ajustable en *Admin → Configuración*); al resto, el del creador |
| Servicio **Adfree** activo en esa app | Ningún anuncio de Forjapp a los **1.000 primeros visitantes de cada día** (UTC) |

Los anuncios de Forjapp son *anuncios de la casa*: se crean en **Admin → Anuncios** (imagen + enlace, peso, impresiones y clics). Sin ninguno activo se muestra una promoción de Forjapp. Adfree se concede por app desde **Admin → Proyectos** (la contratación online con Stripe está pendiente).

> No se usa AdMob/AdSense: sus políticas exigen que el editor sea dueño de la app que monetiza, así que no permiten mostrar anuncios de una plataforma dentro de las apps de otros creadores sin autorización expresa de Google.

## Estructura

```
packages/shared    Esquema AppConfig (zod), registro de módulos, plantillas, planes  ← contrato común
packages/runtime   Renderizador de apps (TS → runtime.js): vista previa + dentro del APK
apps/web           Next.js 15 + React 19 + Tailwind 4 + Prisma (UI + API REST /api/v1)
apps/builder       Worker Node: genera el proyecto Gradle, firma y compila APK/AAB
apps/builder/android-template   Proyecto Android (Kotlin, WebView seguro + puente nativo)
docs/ARCHITECTURE.md            Arquitectura, flujo de compilación y seguridad
```

## Puesta en marcha (desarrollo)

Requisitos: Node 20+, PostgreSQL 14+, y para compilar apps: JDK 17+, Gradle 8.9+ y Android SDK (platform 35, build-tools 35).

```bash
cp .env.example .env              # ajusta DATABASE_URL y ENCRYPTION_KEY (32+ caracteres aleatorios)
npm install
npm run db:migrate                # crea las tablas
npm run db:seed                   # planes, plantillas y usuario admin
npm run dev                       # web en http://localhost:3000
npm run dev:builder               # (otra terminal) servicio de compilación
```

Sin `SMTP_URL`, los emails (verificación, recuperación) se imprimen en la consola del servidor.
Sin `ANTHROPIC_API_KEY`, el asistente usa un generador por reglas (útil para desarrollo).

Admin por defecto: `admin@forjapp.local` / `Admin12345!` (cámbialo con `SEED_ADMIN_*` antes del seed).

### Instalar el Android SDK (Linux)

```bash
export ANDROID_HOME=/opt/android-sdk
mkdir -p $ANDROID_HOME/cmdline-tools && cd /tmp
curl -LO https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip commandlinetools-linux-*.zip && mv cmdline-tools $ANDROID_HOME/cmdline-tools/latest
yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"
```

## Producción con Docker

```bash
cp .env.example .env    # define ENCRYPTION_KEY, APP_URL (URL pública) y SEED_ADMIN_PASSWORD
docker compose up --build -d
docker compose up -d --scale builder=3   # más compilaciones en paralelo
```

`APP_URL` debe ser la URL pública: las apps generadas la usan para enviar formularios y registrar usuarios.

## Pruebas

```bash
npm test                 # shared + builder + web (unitarias; las de API se ejecutan si hay un servidor en :3000)
npm run typecheck
```

## Variables de entorno

Ver [`.env.example`](.env.example). Importante: **no cambies `ENCRYPTION_KEY`** después de la primera compilación; cifra las contraseñas de las claves de firma y sin ella no podrás publicar actualizaciones de las apps existentes.

## Pendiente / siguientes pasos

- **Contratación de Adfree** con Stripe (hoy se concede desde el admin) y facturación a anunciantes.
- **Envío de notificaciones push** desde el panel: los dispositivos ya se registran (FCM), falta la pantalla de envío con la cuenta de servicio de Firebase.
- **Almacenamiento S3** (hoy disco local compartido; la interfaz `Storage` está preparada).
- **Rate limiting distribuido** con Redis cuando haya varias instancias web (hoy en memoria por proceso).
- Exportar la clave de firma al usuario (para Play App Signing) y cambio de email.
- Pruebas E2E automatizadas en CI y en dispositivo/emulador Android real.
