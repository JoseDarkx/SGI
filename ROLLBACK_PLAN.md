# 🔁 Plan de Rollback — SGI Corporate

Este documento describe los pasos para revertir el sistema a la versión anterior en caso de fallo crítico en producción.

---

## Criterios para Activar el Rollback

Activar el rollback si ocurre **cualquiera** de las siguientes situaciones:

| Condición | Umbral |
|---|---|
| El frontend no carga (error 5xx o pantalla en blanco) | Inmediato |
| El backend no responde en `/api/...` | > 5 minutos |
| Los usuarios no pueden iniciar sesión | > 2 minutos |
| Datos corruptos o perdidos en la base de datos | Inmediato |
| Error de CORS bloqueando todas las peticiones | Inmediato |

---

## Paso 1 — Rollback del Backend (Render)

El backend está desplegado en **Render** y usa auto-deploy desde el repositorio Git.

### Opción A: Revertir desde el Dashboard de Render (más rápido)

1. Ir a **[dash.render.com](https://dashboard.render.com)**
2. Seleccionar el servicio `sgi-backend`
3. Ir a la pestaña **"Deploys"**
4. Encontrar el último deploy exitoso (verde)
5. Hacer clic en **"Rollback to this deploy"**
6. Confirmar — el servicio vuelve a esa versión en ~2 minutos

### Opción B: Revertir con Git

```bash
# 1. Ver el historial de commits
git log --oneline -10

# 2. Revertir al commit anterior (crea un commit nuevo, no destruye historial)
git revert HEAD

# 3. Subir el revert — Render redesplegará automáticamente
git push origin main
```

> [!IMPORTANT]
> Usar `git revert` (no `git reset --hard`) para preservar el historial y no crear conflictos con el equipo.

---

## Paso 2 — Rollback del Frontend

El frontend está desplegado como sitio estático (Vercel, Netlify, o Render Static Site).

### Opción A: Redeployar la versión anterior desde el dashboard del proveedor

- **Vercel**: Dashboard → Project → Deployments → encontrar el último exitoso → "Promote to Production"
- **Netlify**: Dashboard → Deploys → encontrar el último exitoso → "Publish deploy"
- **Render Static Site**: Dashboard → Deploys → "Rollback"

### Opción B: Revertir con Git (igual que backend)

```bash
git revert HEAD
git push origin main
```

El proveedor detectará el nuevo push y redesplegará automáticamente.

---

## Paso 3 — Rollback de Base de Datos (Supabase)

> [!CAUTION]
> Esta es la operación más delicada. Solo hacerla si los datos están corruptos.

### 3.1 — Restaurar desde un Backup Automático

Supabase guarda backups diarios automáticos (plan Pro) y backups de Point-in-Time Recovery (PITR).

1. Ir al **[Supabase Dashboard](https://app.supabase.com/)** → seleccionar el proyecto
2. Ir a **Settings → Database → Backups**
3. Seleccionar el backup del día anterior (o el más reciente antes del incidente)
4. Hacer clic en **"Restore"**
5. Confirmar — el proceso tarda entre 5 y 30 minutos según el tamaño

> [!WARNING]
> Restaurar un backup **sobrescribe todos los datos actuales**. Cualquier dato ingresado entre el backup y el incidente se perderá.

### 3.2 — Restaurar desde Backup Manual (SQL Dump)

Si se creó un dump antes del despliegue:

```bash
# Restaurar el dump en Supabase (desde la máquina local)
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" < backup_YYYY-MM-DD.sql
```

---

## Verificación Post-Rollback

Después de completar el rollback, verificar:

- [ ] El frontend carga correctamente en la URL de producción
- [ ] El login funciona con un usuario de prueba
- [ ] Las rutas de la API responden (`/api/indicadores`, `/api/usuarios`)
- [ ] Los datos del dashboard se muestran correctamente
- [ ] Ningún error 5xx en los logs de Render

---

## Comunicación Durante el Incidente

1. **Detectar** → Registrar la hora exacta del fallo
2. **Notificar** → Avisar al equipo que se está ejecutando el rollback
3. **Ejecutar** → Seguir los pasos anteriores
4. **Verificar** → Confirmar que el sistema funciona
5. **Documentar** → Registrar qué falló y cómo se resolvió para la retrospectiva

---

*Última actualización: Abril 2026*
