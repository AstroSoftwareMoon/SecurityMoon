# 🌙 SecurityMoon

**SecurityMoon** es un bot de seguridad y moderación para Discord, gratuito y de código abierto, creado por [AstroSoftwareMoon](https://github.com/AstroSoftwareMoon/).

No tiene versión Premium, donaciones, pagos, panel web ni base de datos. Toda la configuración y los datos se guardan en archivos JSON locales del servidor donde se ejecuta el bot.

- **Repositorio:** <https://github.com/AstroSoftwareMoon/SecurityMoon>
- **Organización:** <https://github.com/AstroSoftwareMoon/>
- **Comunidad de Discord:** <https://discord.gg/eBszxvAuhN>
- **Licencia:** MIT

---

## Características

### Protección automática

| Sistema | Qué hace |
| --- | --- |
| **Anti-Raid** | Detecta entradas masivas en una ventana de tiempo, aplica contención progresiva y puede activar el modo emergencia. |
| **Anti-Nuke** | Vigila eliminaciones y creaciones masivas de canales y roles, baneos, expulsiones y cambios de permisos usando los registros de auditoría. |
| **Anti-Phishing** | Analiza enlaces e invitaciones con heurísticas locales: dominios de imitación, acortadores, TLDs de abuso, palabras de inicio de sesión/regalo, IPs, punycode y listas del servidor. |
| **Anti-Spam** | Detecta flood, mensajes duplicados, menciones masivas, exceso de enlaces, emojis y mayúsculas. Aplica sanciones progresivas. |
| **Protección de permisos** | Alerta y actúa ante permisos peligrosos añadidos a roles, canales o miembros. |
| **Modo emergencia** | Endurece los umbrales, eleva temporalmente la verificación del servidor y registra el incidente. |

### Moderación y registro

- 14 comandos de moderación con casos persistentes, advertencias y registro en el canal de moderación.
- Incidentes de seguridad con severidad, actor, usuario implicado, acción, resultado y enlaces observados.
- Registros NDJSON en `logs/security.json` con rotación por tamaño y redacción de tokens, secretos y webhooks.
- Listas blancas y negras de dominios, usuarios y roles de confianza.
- Exportación y limpieza de datos con confirmación y copia de seguridad previa.

### Interfaz

- `/securitymoon`: panel interactivo con botones, menús y formularios para administrar todo sin escribir comandos.
- `/setup`: asistente de 10 pasos con navegación, validación y confirmación final. Nada se guarda hasta confirmar.
- `/help`: ayuda interactiva por categorías, con detalle de uso, permisos, opciones y ejemplos.
- **Confirmaciones con botones** en todos los comandos que modifican el servidor: ✅ Confirmar y ❌ Cancelar, con caducidad de 5 minutos y protección para que solo la persona que ejecutó el comando pueda confirmar.
- **51 comandos slash** en español, con emojis y respuestas visuales coherentes.

---

## Requisitos

- **Node.js 22 LTS** recomendado. El mínimo soportado es **20.11**.
- Una aplicación de Discord con un bot.
- Los siguientes **intents privilegiados** activados en el portal de desarrolladores:
  - **Message Content Intent** (obligatorio para Anti-Spam y Anti-Phishing).
  - **Server Members Intent** (obligatorio para Anti-Raid y jerarquías).
- Permisos recomendados para el bot:
  - Ver canales, Enviar mensajes, Enviar mensajes en hilos, Insertar enlaces, Leer historial.
  - Gestionar mensajes, Gestionar roles, Gestionar canales.
  - Expulsar miembros, Banear miembros, Moderar miembros.
  - Ver registro de auditoría, Gestionar servidor, Añadir reacciones, Usar emojis externos.

> Sin **Ver registro de auditoría**, el Anti-Nuke y la protección de permisos no pueden identificar al autor de una acción. SecurityMoon lo advierte en los registros y sigue funcionando con el resto de módulos.

---

## Instalación

```bash
git clone https://github.com/AstroSoftwareMoon/SecurityMoon.git
cd SecurityMoon
npm install
cp config.json.example config.json
```

Edita `config.json`:

```json
{
  "token": "TU_TOKEN_AQUI",
  "clientId": "ID_DE_LA_APLICACION",
  "defaultLanguage": "es",
  "prefix": "/",
  "logging": { "level": "info" },
  "promotions": { "enabled": false, "intervalHours": 24 }
}
```

También puedes definir las credenciales con variables de entorno, que tienen prioridad sobre el archivo:

```bash
export DISCORD_TOKEN="tu_token"
export DISCORD_CLIENT_ID="123456789012345678"
```

El token **nunca se registra** en los archivos de log y `config.json` está incluido en `.gitignore`.

### Registrar los comandos

Al iniciar el bot con `npm start` o `npm run dev`, SecurityMoon publica automáticamente
los comandos slash actuales en Discord. Si cambias los comandos mientras el bot ya está
encendido, puedes registrarlos manualmente con:

```bash
npm run deploy
```

Los comandos se registran de forma global. Discord puede tardar unos minutos en mostrarlos
o en propagar cambios.

### Invitar al bot

En el portal de desarrolladores, genera una URL de OAuth2 con los scopes `bot` y `applications.commands`, y concede los permisos indicados arriba. SecurityMoon no necesita el permiso de Administrador para funcionar, aunque el Anti-Nuke solo podrá contener acciones sobre roles situados por debajo de su rol más alto.

### Iniciar

```bash
npm start
```

Para desarrollo con reinicio automático:

```bash
npm run dev
```

### Variables de entorno

| Variable | Descripción |
| --- | --- |
| `DISCORD_TOKEN` | Token del bot. Sustituye a `config.json`. |
| `DISCORD_CLIENT_ID` | ID de la aplicación. Sustituye a `config.json`. |

### Configuración

| Campo | Valores | Descripción |
| --- | --- | --- |
| `token` | texto | Token del bot. Obligatorio salvo que se use `DISCORD_TOKEN`. |
| `clientId` | ID numérico | ID de la aplicación de Discord. |
| `defaultLanguage` | `es` | Idioma actualmente soportado. |
| `prefix` | `/` | Los comandos son slash; el prefijo debe ser `/`. |
| `logging.level` | `error`, `warn`, `info`, `debug` | Nivel de registro. |
| `promotions.enabled` | `true`, `false` | Avisos opcionales de actualizaciones reales del repositorio. Desactivado por defecto. |
| `promotions.intervalHours` | 24–720 | Intervalo mínimo entre avisos por servidor. |

---

## Primeros pasos

1. Ejecuta `/setup` y sigue los 10 pasos.
2. Elige un nivel de protección y los canales de alertas, registros y moderación.
3. Confirma. La configuración se guarda en `data/guilds/<id>.json`.
4. Ejecuta `/securitycheck` para revisar permisos, roles peligrosos y recomendaciones.
5. Abre `/securitymoon` para ajustar cada módulo.

### Niveles de protección

| Nivel | Enfoque |
| --- | --- |
| 🌱 **Baja** | Umbrales amplios para comunidades muy activas. |
| 🌙 **Media** | Equilibrio recomendado entre protección y falsos positivos. |
| 🛡️ **Alta** | Umbrales estrictos y sanciones activas. |
| 🚨 **Extrema** | Máxima contención; puede afectar a usuarios nuevos legítimos. |

Los niveles son puntos de partida. Puedes modificar cada módulo desde el panel o con los comandos `/antiraid`, `/antinuke`, `/antiphishing` y `/antispam`.

> Los comandos que modifican el servidor muestran una confirmación efímera con botones **✅ Confirmar** y **❌ Cancelar**. La solicitud caduca a los 5 minutos y solo puede confirmarla quien ejecutó el comando. Los comandos de consulta, como `/ping`, `/help` o `/security`, responden directamente.

---

## Comandos

### Moderación (14)

| Comando | Descripción |
| --- | --- |
| `/ban` | Banea a un usuario del servidor. |
| `/hackban` | Banea por ID a un usuario que no está en el servidor. |
| `/unban` | Retira el baneo de un usuario. |
| `/kick` | Expulsa a un miembro del servidor. |
| `/timeout` | Silencia temporalmente a un miembro. |
| `/untimeout` | Retira el timeout de un miembro. |
| `/warn` | Añade una advertencia persistente. |
| `/warnings` | Muestra las advertencias de un usuario. |
| `/clear` | Elimina mensajes recientes del canal actual. |
| `/purge` | Elimina mensajes filtrados por usuario o contenido. |
| `/slowmode` | Configura el modo lento de un canal. |
| `/lock` | Bloquea la escritura en un canal. |
| `/unlock` | Vuelve a permitir la escritura en un canal. |
| `/modlog` | Consulta los casos de moderación del servidor. |

### Seguridad (14)

| Comando | Descripción |
| --- | --- |
| `/securitymoon` | Abre el panel interactivo. |
| `/security` | Resumen del estado de seguridad. |
| `/antiraid` | Configura la protección contra raids. |
| `/antinuke` | Configura la protección contra acciones destructivas. |
| `/antiphishing` | Configura la detección de enlaces sospechosos. |
| `/antispam` | Configura la detección de spam y flood. |
| `/whitelist` | Gestiona los dominios de confianza. |
| `/blacklist` | Gestiona los dominios bloqueados. |
| `/trusted` | Gestiona usuarios y roles de confianza. |
| `/securitylogs` | Consulta o exporta los registros de seguridad. |
| `/incident` | Consulta, exporta o limpia incidentes. |
| `/emergency` | Activa o desactiva el modo emergencia. |
| `/permissions` | Diagnostica permisos y roles peligrosos. |
| `/securitycheck` | Auditoría completa de la configuración. |

### Configuración (2)

| Comando | Descripción |
| --- | --- |
| `/config` | Consulta, exporta o restablece la configuración y los datos. |
| `/setup` | Asistente de configuración. |

### Información (10)

| Comando | Descripción |
| --- | --- |
| `/help` | Ayuda interactiva por categorías. |
| `/ping` | Latencia del bot. |
| `/botinfo` | Información sobre SecurityMoon. |
| `/serverinfo` | Información del servidor. |
| `/userinfo` | Información de un usuario. |
| `/avatar` | Avatar de un usuario. |
| `/uptime` | Tiempo en línea. |
| `/status` | Estado operativo. |
| `/stats` | Estadísticas de seguridad del servidor. |
| `/report` | Reporte local para la administración del servidor. |

### Comunidad (11)

| Comando | Descripción |
| --- | --- |
| `/about` | Información sobre SecurityMoon y su creador. |
| `/credits` | Créditos del proyecto. |
| `/opensource` | Información sobre el código abierto. |
| `/github` | Enlaces oficiales de GitHub. |
| `/community` | Comunidad oficial de Discord. |
| `/support` | Cómo obtener soporte. |
| `/invite` | Enlace para invitar al bot. |
| `/updates` | Novedades reales del repositorio. |
| `/changelog` | Historial de cambios local. |
| `/privacy` | Privacidad y datos almacenados. |
| `/license` | Licencia MIT. |

---

## Datos y privacidad

SecurityMoon no usa base de datos, SQLite, panel web ni servicios de terceros para almacenar datos.

```text
data/
├── guilds/<guildId>.json       Configuración del servidor
├── warnings/<guildId>.json     Advertencias
├── incidents/<guildId>.json    Incidentes de seguridad
├── moderation/<guildId>.json   Casos de moderación
├── trusted/<guildId>.json      Usuarios y roles de confianza
├── filters/<guildId>.json      Listas blancas y negras
├── stats/<guildId>.json        Contadores de seguridad
└── backups/                    Copias de seguridad por archivo
logs/
└── security.json               Registro NDJSON con rotación
```

- Cada servidor tiene archivos aislados; un servidor no puede leer los datos de otro.
- Las escrituras son atómicas: archivo temporal, `fsync` y `rename`.
- Las operaciones sobre un mismo archivo se serializan para evitar condiciones de carrera.
- Antes de sobrescribir documentos importantes se crea una copia de seguridad.
- Si un archivo se corrompe, se aparta, se intenta restaurar la última copia válida y, si no es posible, se usan valores predeterminados validados.
- Los datos se normalizan y validan contra esquemas antes de guardarse.
- La retención de incidentes, advertencias y casos es configurable.
- `/config export` y `/config data` permiten exportar o limpiar datos con confirmación.
- Los registros se escriben como **JSON Lines (NDJSON)**: una entrada JSON por línea, para permitir append y rotación eficientes sin reescribir el archivo completo.

No se envían datos a servicios externos. La única petición saliente es la consulta opcional a la API pública de GitHub Releases para `/updates`, `/changelog` y los avisos del proyecto, que solo se activan con opt-in.

Usa `/privacy` en Discord para consultar el detalle y revisa [`SECURITY.md`](SECURITY.md) para la política de seguridad.

---

## Desarrollo

```bash
npm install
npm run lint
npm test
npm run check
```

- **Pruebas:** Node Test Runner (`node --test`). Cubren configuración, almacenamiento concurrente, recuperación de corrupción, copias de seguridad, aislamiento por servidor, análisis de phishing, spam, permisos, esquemas, comandos, paneles y redacción de logs.
- **Lint:** ESLint 9 con configuración plana.
- **CI:** GitHub Actions ejecuta lint y pruebas en Node 20 y 22.

### Estructura

```text
src/
├── commands/         51 comandos organizados por categoría
├── events/           Manejadores de Discord
├── interactions/     Router de comandos, botones, menús y modales
├── panels/           Panel de seguridad, asistente y ayuda
├── security/         Anti-Raid, Anti-Nuke, Anti-Phishing, Anti-Spam, emergencia
├── services/         Estadísticas, advertencias y avisos del proyecto
├── storage/          Motor JSON, esquemas, validación y copias
├── utils/            Embeds, permisos, tiempos, logger, validadores
├── client.js         Composición del cliente
├── index.js          Arranque y cierre ordenado
└── deploy-commands.js
```

Consulta [`CONTRIBUTING.md`](CONTRIBUTING.md) antes de enviar cambios.

---

## Solución de problemas

| Problema | Solución |
| --- | --- |
| «Falta el token» o «configuración inválida» | Copia `config.json.example`, completa `token` y `clientId`, o define las variables de entorno. |
| Los comandos no aparecen | Comprueba los logs de inicio, confirma que el bot fue invitado con el scope `applications.commands` y espera unos minutos a que Discord propague los comandos globales. También puedes ejecutar `npm run deploy`. |
| El Anti-Spam o Anti-Phishing no detecta nada | Activa **Message Content Intent** en el portal de desarrolladores. |
| El Anti-Raid no funciona | Activa **Server Members Intent** y concede el permiso Moderar miembros si usas sanciones. |
| El Anti-Nuke no identifica al autor | Concede **Ver registro de auditoría** y coloca el rol del bot por encima de los roles que debe moderar. |
| «No se pudo guardar el archivo de datos» | Revisa permisos de escritura sobre `data/` y el espacio libre en disco. |
| El bot se cierra al arrancar | Revisa `logs/security.json`; el token nunca aparece en los mensajes. |

---

## Enlaces oficiales

- GitHub: <https://github.com/AstroSoftwareMoon/>
- Repositorio: <https://github.com/AstroSoftwareMoon/SecurityMoon>
- Comunidad: <https://discord.gg/eBszxvAuhN>
- Incidencias: <https://github.com/AstroSoftwareMoon/SecurityMoon/issues>
- Seguridad: <https://github.com/AstroSoftwareMoon/SecurityMoon/security/advisories/new>

---

## Licencia

MIT © 2026 AstroSoftwareMoon. Consulta [`LICENSE`](LICENSE).

SecurityMoon no está afiliado ni respaldado por Discord Inc.
