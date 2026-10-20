# Política de seguridad

SecurityMoon se toma en serio la seguridad de los servidores donde se ejecuta. Esta política explica cómo informar de vulnerabilidades y qué se considera dentro del alcance.

## Versiones soportadas

| Versión | Soporte de seguridad |
| --- | --- |
| 1.x | Sí |
| Versiones anteriores | No |

Solo se corrigen vulnerabilidades en la rama principal y en la última versión estable.

## Cómo informar

**No abras una incidencia pública para una vulnerabilidad.**

Usa el canal privado de [GitHub Security Advisories](https://github.com/AstroSoftwareMoon/SecurityMoon/security/advisories/new) del repositorio. Si no está disponible, contacta con los responsables del proyecto a través de la [comunidad oficial de Discord](https://discord.gg/eBszxvAuhN) y solicita un canal privado. No incluyas detalles explotables en un mensaje público.

Incluye, cuando sea posible:

- Versión de SecurityMoon y de Node.js.
- Sistema operativo.
- Descripción del problema y su impacto.
- Pasos de reproducción mínimos.
- Entrada o configuración necesaria.
- Prueba de concepto, si existe.
- Posible solución o mitigación.
- Si el problema ya se ha divulgado a otras personas.

No incluyas tokens reales, datos de servidores de producción ni información personal. Usa valores de ejemplo.

## Qué está dentro del alcance

- Ejecución remota de código o comandos.
- Lectura o escritura de archivos fuera de `data/` y `logs/`.
- Evasión de comprobaciones de permisos o jerarquía.
- Escalada de privilegios dentro del bot.
- Corrupción o pérdida de datos provocada por entradas maliciosas.
- Exposición de tokens, secretos, webhooks o datos de otros servidores.
- Inyección en embeds, mensajes o nombres que permita ejecutar acciones no previstas.
- Denegación de servicio provocada por un uso normal o malicioso de comandos.
- Vulnerabilidades en dependencias que afecten directamente a SecurityMoon.

## Qué queda fuera del alcance

- Problemas que requieren acceso físico al servidor donde se ejecuta el bot.
- Configuraciones inseguras del usuario, como ejecutar el bot como administrador del sistema o exponer `config.json`.
- Ataques de fuerza bruta contra el token de Discord.
- Vulnerabilidades en Discord, Node.js, npm o dependencias que no tengan impacto directo y explotable en SecurityMoon.
- Falta de permisos, intents desactivados o límites de la API de Discord.
- Spam o abuso de la comunidad que no sea una vulnerabilidad técnica.
- Informes generados automáticamente sin una explicación reproducible.

## Respuesta

El proyecto es mantenido por voluntarios. Se intentará confirmar la recepción del informe, evaluar el impacto y coordinar una corrección y divulgación responsable. No se garantiza un plazo fijo.

Mientras se investiga:

- No divulgues públicamente la vulnerabilidad.
- No la explotes contra servidores ajenos.
- No accedas a datos que no te pertenecen.
- Colabora en la verificación de la corrección.

## Divulgación responsable

Cuando la corrección esté disponible, se publicará un aviso de seguridad y una entrada en el `CHANGELOG.md` cuando corresponda. Se acreditará a quien informe si así lo solicita y si no supone un riesgo adicional.

## Buenas prácticas para administradores

- Mantén actualizados SecurityMoon, Node.js y las dependencias.
- No compartas `config.json` ni el token del bot.
- Rota el token inmediatamente si sospechas que se ha filtrado.
- Ejecuta el bot con el mínimo privilegio necesario.
- Revisa los roles con Administrador y los usuarios de confianza.
- Mantén `data/` y `logs/` fuera de repositorios públicos.
- Usa los canales de alertas y registros para conservar evidencia.
- No ejecutes el bot como root.
