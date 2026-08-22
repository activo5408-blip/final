# ChatLAN — Compilar en GitHub Actions

Este proyecto está preparado para compilar **ChatLAN para Windows x64** directamente en GitHub. No necesitas instalar Rust, Visual Studio ni Node.js en tu PC para hacer la compilación.

## 1. Crear el repositorio

1. Entra en GitHub.
2. Pulsa **New repository**.
3. Ponle, por ejemplo, `ChatLAN`.
4. Puede ser **Private** o **Public**.
5. No marques README, `.gitignore` ni licencia; este proyecto ya trae sus archivos.
6. Crea el repositorio.

## 2. Subir el proyecto

Descomprime el ZIP de ChatLAN.

En GitHub entra a:

**Add file → Upload files**

Sube **el contenido de la carpeta del proyecto**, no el ZIP dentro de otro ZIP.

Debes ver en la raíz del repositorio algo parecido a:

```text
ChatLAN/
├── .github/
│   └── workflows/
│       └── build.yml
├── src/
├── src-tauri/
├── package.json
├── vite.config.ts
├── tsconfig.json
└── index.html
```

Pulsa **Commit changes**.

## 3. Compilación automática

Al hacer el commit, GitHub abrirá automáticamente:

**Actions → Compilar ChatLAN para Windows → Windows x64**

El workflow hace todo esto:

1. Descarga el código.
2. Instala Node.js 20.
3. Instala Rust estable con MSVC.
4. Instala las dependencias de React/Tauri.
5. Compila React/Vite.
6. Compila Tauri para Windows x64.
7. Genera el instalador NSIS.
8. Guarda el instalador y el ejecutable portable como **Artifacts**.

## 4. Descargar el programa

Cuando el trabajo termine con un ✅ verde:

1. Abre la ejecución de Actions.
2. Baja hasta **Artifacts**.
3. Descarga:

### ChatLAN-Windows-Installer

Contiene el instalador `.exe`.

### ChatLAN-Windows-Portable

Contiene `chatlan.exe`, para probarlo sin usar el instalador.

## 5. Si no empieza automáticamente

Ve a:

**Actions → Compilar ChatLAN para Windows → Run workflow → Run workflow**

Espera a que termine.

## 6. Para recompilar después

Cada vez que cambies código y hagas:

**Commit changes**

GitHub volverá a compilar automáticamente si el cambio está en `main` o `master`.

## 7. Importante para probar la red LAN

La compilación de GitHub solamente genera el programa. Para probar el chat real:

- Instala ChatLAN en dos PCs Windows.
- Conecta ambas PCs a la misma red local.
- Ejecuta ChatLAN en ambas.
- Usa nombres diferentes.
- Deben aparecer en **Contactos**.

La comunicación del chat y la transferencia de archivos están diseñadas para funcionar dentro de la red local.

## 8. Llamadas de voz y video

La interfaz incluye los botones de llamada de voz y videollamada y la señalización LAN necesaria para iniciar la conexión entre dos clientes.

Para una prueba real de llamadas, ambas PCs deben tener:

- micrófono para llamadas de voz;
- cámara para videollamadas;
- permisos de Windows para micrófono/cámara;
- conectividad entre ambas PCs en la LAN.

Si Windows Firewall pregunta por ChatLAN, permite el acceso en **Redes privadas**.

## 9. Si GitHub muestra un error

No vuelvas a subir otro ZIP todavía.

Entra en:

**Actions → Compilar ChatLAN para Windows → Windows x64**

Abre el paso que tenga la ❌ roja y copia el error completo o manda una captura.

Con ese error se puede corregir el proyecto y volver a ejecutar Actions.


## ChatLAN 2.1.0 — arranque corregido

- Al ejecutar ChatLAN se abre directamente la ventana **Contactos**.
- En la primera ejecución usa automáticamente el nombre del equipo; puedes cambiarlo en **Ajustes**.
- El nombre de perfil queda guardado entre reinicios.
- La ventana principal ya no queda oculta solamente en la barra/bandeja al arrancar.
- Contactos y Chat aparecen como ventanas normales de Windows y pueden minimizarse/ocultarse sin cerrar ChatLAN.
- El icono de la bandeja permite volver a mostrar Contactos.
- El workflow de GitHub Actions usa Node.js 22 y no depende de un lockfile para la caché.
