# Contribuir a SecurityMoon

Gracias por querer mejorar SecurityMoon. El proyecto es gratuito y de código abierto, y las contribuciones son bienvenidas.

## Antes de empezar

- Revisa las [incidencias abiertas](https://github.com/AstroSoftwareMoon/SecurityMoon/issues) para evitar duplicados.
- Para cambios grandes, abre una incidencia o comenta en una existente antes de escribir código.
- No publiques tokens, datos de servidores, capturas con información privada ni vulnerabilidades en una incidencia pública. Para problemas de seguridad usa [`SECURITY.md`](SECURITY.md).
- Respeta el [Código de Conducta](CODE_OF_CONDUCT.md).

## Entorno

- Node.js 22 LTS recomendado; mínimo 20.11.
- npm.
- No se usan bases de datos, Docker, panel web ni dependencias de pago.

```bash
git clone https://github.com/AstroSoftwareMoon/SecurityMoon.git
cd SecurityMoon
npm install
cp config.json.example config.json
```

Completa `config.json` solo para pruebas locales. No lo incluyas en un commit.

## Estilo

- JavaScript moderno con módulos ESM.
- Mantén el estilo del código existente: nombres claros, funciones pequeñas y comentarios solo cuando aporten contexto.
- Los textos visibles para el usuario deben estar en español.
- No añadas dependencias sin justificarlo en la pull request.
- No inventes versiones, estadísticas, contribuyentes, enlaces ni funciones que no existan.
- No incluyas botones, comandos o funciones sin una acción real.
- Los errores dirigidos al usuario no deben exponer tokens, rutas privadas ni detalles internos.
- Usa los servicios y utilidades existentes antes de duplicar lógica.

## Pruebas y lint

```bash
npm run lint
npm test
npm run check
```

Requisitos para una pull request:

- `npm run lint` sin errores.
- `npm test` sin fallos.
- Nuevas funciones con pruebas cuando sea razonable.
- Cambios de comportamiento documentados en `README.md` y `CHANGELOG.md`.

## Commits y pull requests

- Usa mensajes claros, por ejemplo `fix: evita doble sanción en anti-spam`.
- Una pull request debe resolver un problema concreto. Evita mezclar refactorizaciones grandes con cambios funcionales.
- Describe qué cambia, cómo probarlo y cualquier migración o efecto secundario.
- Si el cambio afecta a la configuración JSON, explica la compatibilidad con datos existentes.
- Si añades o modificas un comando, actualiza su entrada en `src/utils/help-metadata.js` y la tabla del README.

## Seguridad y datos

- Nunca subas `config.json`, `.env`, `data/` ni `logs/`.
- No registres tokens ni secretos.
- No añadas telemetría, analytics, pagos, Premium ni servicios externos que reciban datos de los servidores.
- Cualquier petición de red nueva debe ser opcional, documentada y con un propósito claro.
- Si encuentras una vulnerabilidad, no abras una pull request pública que la explote. Sigue [`SECURITY.md`](SECURITY.md).

## Licencia

Al contribuir aceptas que tu aportación se distribuya bajo la licencia MIT del proyecto.

## Soporte y codigo fuente

- Soporte de Discord: <https://discord.gg/eBszxvAuhN>
