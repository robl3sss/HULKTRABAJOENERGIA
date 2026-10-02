# HULK TRABAJO Y ENERGÍA

Simulador 3D de trabajo y energía con Hulk, automóvil, roca y plano inclinado. Versión 3.2 con las últimas correcciones de articulaciones y carga móvil.

## Contenido del proyecto

Incluye la página, estilos, controles, cálculo físico, gráficas, animaciones, modelo original de Hulk, automóvil para computadora y teléfono, texturas, imágenes, bibliotecas locales, licencias de las bibliotecas, lanzadores y documentación.

## Subir a GitHub desde tu computadora

1. Extrae este ZIP y abre la carpeta extraída.
2. Crea o abre el repositorio donde guardarás el simulador.
3. Selecciona **Add file → Upload files**; en un repositorio vacío, utiliza el enlace para subir archivos existentes.
4. Arrastra todos los archivos y carpetas del proyecto a esa pantalla, conservando las carpetas `assets`, `css` y `js`.
5. Comprueba que `index.html` quede directamente en la raíz del repositorio. Sube el contenido extraído, no el ZIP ni una carpeta adicional que lo envuelva.
6. Escribe un mensaje para guardar los cambios y confirma la carga.

## Si quieres abrirlo como página web con GitHub Pages

1. Entra en **Settings → Pages** del repositorio.
2. En **Source**, elige **Deploy from a branch**.
3. Selecciona la rama que contiene los archivos (normalmente `main`) y la carpeta **/(root)**.
4. Guarda y utiliza el enlace que GitHub muestre cuando termine la publicación.

Este proyecto funciona directamente desde su `index.html`; para esa configuración no necesitas ejecutar un proceso de compilación. Incluye `.nojekyll` para servir los recursos como archivos estáticos.

GitHub Pages con GitHub Free requiere un repositorio público. Con los planes que lo permiten puede usarse un repositorio privado; la publicación de la página es pública salvo configuraciones de acceso específicas disponibles en determinados planes.

## Abrirlo localmente

En Windows, ejecuta `INICIAR_HULK_ENERGIA.bat` después de extraer el ZIP. En macOS/Linux, con Python 3 instalado, ejecuta `python3 start_server.py` dentro de la carpeta del proyecto.

Usa la dirección local que indique el lanzador. Abrir `index.html` mediante doble clic no permite cargar correctamente los módulos y modelos 3D. Todas las dependencias del navegador están incluidas.

## Más información

- [LEEME.md](LEEME.md): controles, modelos, funcionamiento local y física.
- [docs/VERIFICACION.md](docs/VERIFICACION.md): comprobaciones del simulador.
- `npm test`: comprobaciones físicas con Node.js.
- `npm run build`: copia la página y sus recursos a `dist`.

La imagen y los modelos son los recursos proporcionados para el proyecto. Las licencias de Three.js y fflate están en `js/vendor`.

## Guías oficiales de GitHub

- [Subir archivos y carpetas](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)
- [Configurar GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
