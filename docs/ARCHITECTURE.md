# Arquitectura de Forjapp

## Visión general

```
 Navegador ──► apps/web (Next.js)  ──►  PostgreSQL  ◄── apps/builder (1..N workers)
   │              │  API REST /api/v1                     │  Android SDK + Gradle + JDK
   │              │  /api/public (apps generadas, CORS)   │
   │              └──► STORAGE (uploads, keystores, APK/AAB) ◄┘
   └── iframe sandbox /preview.html ──► runtime.js (packages/runtime)
                                           ▲
                         el mismo runtime.js va empaquetado dentro del APK
```

### El contrato: `AppConfig`

Toda app es un único documento JSON (`Project.config`) validado con zod en `packages/shared/src/schema.ts`:
`meta` (nombre, paquete, versión, permisos), `theme`, `branding`, `navigation`, `pages[] → blocks[]` e `integrations`.

- El **editor** lo modifica (con historial de deshacer y autoguardado con control de revisiones).
- La **API** lo valida siempre (estructura + referencias cruzadas) antes de guardar.
- El **runtime** lo renderiza (vista previa y APK).
- El **builder** lo traduce a un proyecto Android.

### Módulos

`packages/shared/src/modules.ts` declara cada bloque una sola vez: campos (de ahí se genera el formulario del editor), valores por defecto, permisos Android que necesita y plan mínimo. El renderizador vive en `packages/runtime/src/blocks.ts`. Añadir un módulo = una entrada en el registro + un renderizador.

## Compilación de apps (FASE 7)

1. `POST /api/v1/projects/:id/builds` comprueba email verificado, cuota del plan, módulos permitidos y que no haya otra compilación activa; incrementa `versionCode` si ya se usó y guarda una **instantánea** del config en `Build.configSnapshot` (compilaciones reproducibles).
2. Cada worker reclama trabajos con `UPDATE … WHERE id = (SELECT … FOR UPDATE SKIP LOCKED)`: se pueden ejecutar tantos builders como se quiera sin coordinación extra. Prioridad para planes con `priority_builds`.
3. `generate.ts` copia `android-template`, escribe `forjapp.properties` (applicationId, versión), `strings.xml`/`colors.xml` (escapados), el manifiesto (permisos calculados, orientación, servicio push), genera iconos (sharp, todas las densidades), empaqueta `runtime.js` + `config.js` + las imágenes subidas (la app funciona sin conexión) y `google-services.json` si hay push.
4. `keystore.ts` crea **una clave de firma por proyecto** la primera vez (keytool, contraseña por variable de entorno, cifrada con AES-256-GCM en BD) y la reutiliza siempre, para que las actualizaciones se instalen sobre versiones anteriores.
5. Gradle (`assembleRelease` / `bundleRelease`) se ejecuta en su propio grupo de procesos, con tiempo máximo y cancelación. El log se va añadiendo a `Build.log` cada 2 s (truncado a 200 KB). El artefacto se copia al almacenamiento y se descarga por `/api/v1/builds/:id/download` (solo el propietario).
6. Compilaciones huérfanas (worker caído) se marcan como fallidas automáticamente.

### La app Android

`MainActivity.kt` carga `https://appassets.androidplatform.net/assets/www/index.html` mediante `WebViewAssetLoader` (origen https seguro, sin `file://`), con CSP. Expone un puente mínimo `ForjappNative`: `httpGet` (RSS sin CORS, solo http/https, 5 MB máx.), `openExternal` (lista blanca de esquemas), `enablePush` (permiso POST_NOTIFICATIONS + token FCM). Botón atrás integrado con la navegación del runtime, vídeo a pantalla completa, sin tráfico en claro.

## IA (FASE 8)

`apps/web/src/lib/ai.ts` usa la API de Claude con **structured outputs**: el modelo devuelve un *blueprint* tipado (páginas, módulos del catálogo, campos clave/valor, tema) que se convierte en `AppConfig` y se valida con el mismo esquema que el editor. Para editar, se envía el config actual y se conservan paquete, versión, iconos y permisos. Fallback por reglas si no hay `ANTHROPIC_API_KEY`. Cada petición cuenta en la cuota mensual del plan.

## Seguridad

- Contraseñas bcrypt (coste 12); sesiones aleatorias de 256 bits en cookie httpOnly/SameSite=Lax; en BD solo el hash SHA-256. Tokens de verificación/recuperación de un solo uso y con caducidad, también hasheados. Cambiar/restablecer contraseña cierra las demás sesiones.
- Login sin enumeración de usuarios (bcrypt siempre) y "olvidé mi contraseña" siempre responde igual. Rate limiting en login, registro, recuperación, subidas, formularios públicos, IA y proxy.
- Autorización por propiedad en cada endpoint (`getOwnedProject`), rol ADMIN para `/api/v1/admin/*`.
- Validación zod en todas las entradas; control de concurrencia optimista (`revision`) al guardar.
- Subidas: tipo detectado por firma de bytes (no por la cabecera), SVG rechazado, 5 MB máx., cuota de almacenamiento; claves de almacenamiento no adivinables y protegidas contra path traversal.
- Vista previa en iframe `sandbox` **sin** `allow-same-origin`: el contenido de usuario nunca accede a cookies ni al DOM de la plataforma. El runtime nunca usa `innerHTML` y filtra protocolos de URL (`javascript:` bloqueado).
- Proxy RSS con protección SSRF (resolución DNS y bloqueo de IPs privadas en cada redirección, límites de tamaño y tiempo).
- Cabeceras de seguridad (nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy). Webhook de Stripe con verificación de firma.

## Planes y pagos (FASE 9)

Los planes están en la tabla `Plan` (editable en `/admin/plans`): límites de proyectos, compilaciones/mes, almacenamiento, peticiones de IA y funciones (`aab_builds`, `push_notifications`, `app_users`, `priority_builds`…). Toda comprobación pasa por `src/lib/limits.ts`. Stripe Checkout + Portal + webhook están implementados y se activan al definir `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y el `price_…` de cada plan; sin ellos no se realiza ningún cobro y el admin asigna planes manualmente.
