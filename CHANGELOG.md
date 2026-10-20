# Changelog

Todos los cambios relevantes de SecurityMoon se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [1.0.0] - 2026-10-20

Primera versión estable de SecurityMoon para Discord.

### Añadido

- Registro automático de los comandos slash globales en Discord cada vez que se inicia el bot.
- **51 comandos slash** en español, organizados en moderación, seguridad, configuración, información y comunidad.
- **Emojis y respuestas visuales coherentes** en todos los comandos, campos de embeds, botones, ayuda, panel y asistente.
- **Confirmaciones con botones** ✅/❌ en todos los comandos que modifican el servidor, con caducidad de 5 minutos y verificación de que solo el autor original puede confirmar.
- **Panel interactivo** `/securitymoon` con botones, menús de selección y formularios modales para administrar módulos, canales, niveles de protección, listas, confianza, incidentes y diagnóstico.
- **Asistente `/setup` de 10 pasos** con navegación atrás/omitir/cancelar, validación de canales y confirmación final. La configuración no se guarda hasta confirmar.
- **Ayuda interactiva** `/help` por categorías, con uso, permisos, opciones, ejemplos y notas de cada comando.
- **Anti-Raid** con ventanas de entrada, umbrales, contención progresiva, antigüedad mínima de cuenta y activación automática del modo emergencia.
- **Anti-Nuke** basado en registros de auditoría para canales, roles, baneos, expulsiones y cambios de permisos, con umbrales y sanciones configurables.
- **Anti-Phishing** con análisis local de enlaces: listas blancas y negras, invitaciones, acortadores, TLDs de abuso, palabras sospechosas, suplantación de marcas, IPs, punycode, credenciales en URL y extensiones de riesgo.
- **Anti-Spam** con detección de flood, duplicados, menciones, enlaces, emojis, mayúsculas y sanciones escaladas.
- **Protección de permisos** para permisos peligrosos añadidos a roles, canales y miembros.
- **Modo emergencia** con endurecimiento de umbrales, elevación de verificación y restauración del nivel anterior.
- **Sistema de incidentes** con severidad, actor, usuario implicado, acción, resultado, enlaces observados y alertas al canal configurado.
- **Moderación completa:** ban, hackban (baneo por ID de usuarios fuera del servidor), unban, kick, timeout, untimeout, warn, warnings, clear, purge, slowmode, lock, unlock y modlog, con casos persistentes.
- **Advertencias persistentes** y notificaciones por mensaje directo opcionales.
- **Estadísticas locales** de mensajes analizados, enlaces, spam, phishing, raids, nukes, sanciones, incidentes, comandos, entradas, salidas y advertencias.
- **Exportación y limpieza de datos** mediante `/config` y `/securitylogs`, con confirmación y copia de seguridad previa.
- **Avisos opcionales del proyecto** desactivados por defecto, con opt-in por servidor, intervalo mínimo de 24 horas y únicamente datos reales de GitHub Releases.

### Cambiado

- Los comandos de acción ya no requieren la opción `confirm`: la confirmación se realiza con botones ✅/❌ y se conserva la copia de seguridad previa en las operaciones que la creaban.
- La ayuda y las descripciones de los comandos incluyen emojis y muestran mejor el uso, los permisos y las opciones.

### Seguridad

- Token y `clientId` fuera del control de versiones mediante `.gitignore`; `config.json.example` como plantilla.
- Redacción de tokens, secretos, webhooks y claves sensibles en los registros.
- Validación y normalización de todos los documentos JSON antes de guardarlos.
- Escrituras atómicas con archivo temporal, `fsync` y `rename`.
- Control de concurrencia por archivo para evitar pérdidas de escrituras.
- Copias de seguridad antes de sobrescribir documentos importantes y recuperación automática de archivos corruptos.
- Aislamiento estricto de datos por servidor.
- Retención y límites configurables para incidentes, advertencias y casos.
- Comprobaciones de permisos y jerarquía antes de aplicar sanciones.
- Enfriamiento de comandos y manejo seguro de interacciones caducadas.

### Documentación

- README en español con instalación, permisos, intents, configuración, comandos, datos y solución de problemas.
- Guía de contribución, código de conducta, política de seguridad y licencia MIT.
- Plantillas de incidencias y pull requests.
- Flujo de trabajo de integración continua con lint y pruebas en Node.js 20 y 22.

## Soporte y codigo fuente

- Soporte de Discord: <https://discord.gg/eBszxvAuhN>
- codigo fuente en GitHub: <https://github.com/AstroSoftwareMoon/SecurityMoon>
