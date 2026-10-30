# Cómo empezar con Claude Code

1. Descomprime y entra en la carpeta:
   ```bash
   unzip cuentas.zip && cd cuentas
   ```
2. Requisitos: Node 22+, pnpm (`corepack enable`), git y Claude Code.
3. Instala el plugin superpowers en Claude Code (una vez):
   ```
   /plugin marketplace add obra/superpowers-marketplace
   /plugin install superpowers@superpowers-marketplace
   ```
4. Abre Claude Code en esta carpeta (`claude`) y pega:

   > Lee CLAUDE.md, la spec y el plan 1. Ejecuta el plan 1 con superpowers:subagent-driven-development, tarea a tarea, revisando entre tareas. Para en la tarea 14 y pídeme lo que necesites de Vercel, Neon y Google.

5. Antes de la tarea 14 ten a mano:
   - Cuenta de Vercel y la integración de Neon (Storage → Neon).
   - Credenciales OAuth de Google (redirección `http://localhost:3000/api/auth/callback/google` y la de tu dominio de Vercel).
   - Tus importes reales para `scripts/seed-data.ts`.

Contenido:
- `CLAUDE.md`: instrucciones permanentes para Claude Code.
- `docs/superpowers/specs/`: diseño aprobado.
- `docs/superpowers/plans/`: plan 1 (base + núcleo del mes).
- `docs/design/`: sistema de diseño «Cuentas» (tokens claro/oscuro y guía).
