# Verificación de la actualización

Pruebas ejecutadas en Chromium con WebGL por software; esto verifica funcionamiento y diseño, no promete una tasa de cuadros en un teléfono físico.

- Modelo Hulk original y texturas cargados; 19 clips inspeccionados y registrados en animaciones-inspeccion.json.
- Mazda GLB cargado con cuatro ruedas y materiales locales; reducción documentada en automovil.json.
- Tres escenas comprobadas en preparación y movimiento; ajuste de manos con solver de alcance limitado, sin escalado de huesos. Pausa conserva exactamente poses, posición, giro de ruedas y tiempo del mixer.
- Inicio, pausa, reanudación, reinicio, tres cámaras, vectores y guía operativos. Reinicio deja tiempo y progreso en cero y restaura las ruedas.
- Título actualizado y panel de explicación eliminado.
- Resoluciones comprobadas sin desbordamiento horizontal: 320×720, 360×800, 390×844, 430×932, 768×1024, 1366×768, 1920×1080 y 3840×2160.
- En móvil: escena → botones → variables → resultados → gráfica.
- Sin errores JavaScript críticos durante las pruebas funcionales.
- Pruebas físicas existentes aprobadas: trabajo-energía, detención, equilibrio estático, pendiente, elevación, velocidad constante y pérdida de contacto.
- Recursos del navegador locales; sin CDN. La ejecución local requiere el lanzador/servidor incluido.

## Corrección 3.1 — carga móvil y deformación

- Revisado el video proporcionado: huesos auxiliares de brazos y muslos permanecían en la pose anterior al aplicar IK. Ahora conservan su transformación respecto del segmento corregido.
- Verificados ocho auxiliares durante 100 pasos por escena. Desviación máxima de matrices relativas menor que 0,000001; escalas sin cambios y transformaciones finitas. Variación de longitud de segmentos de menos de 0,000001 por precisión de los clips originales.
- Comprobación visual de codos y hombros en empuje, levantamiento y pendiente.
- En pantalla de 390 × 844 se carga exclusivamente el automóvil móvil de 1.497.504 bytes. Conserva las cuatro ruedas del original.
- Texturas del automóvil retenidas sin respuesta durante la prueba: inicio disponible al 100 %, sin errores JavaScript.
- Error de descarga simulado: botón REINTENTAR activo; después de restaurar la conexión se alcanza 100 %.
- Pausa mantiene la pose exactamente. Cámara sigue el desplazamiento después de rotarla, cuando el seguimiento está activo.
- Pruebas físicas originales aprobadas de nuevo; ecuaciones sin cambios.

## Articulaciones 3.2

- Orientación completa de cada segmento: flexión y eje de giro controlados para evitar la torsión libre de hombros/codos.
- Postura de cadera, espalda y hombros dirigida hacia la carga. Distancia de Hulk y apoyos de las manos ajustados por escena.
- Muñecas limitadas a 68° de flexión respecto del antebrazo; pronación/supinación visual limitada a 85° respecto de la referencia del rig y distribuida en auxiliares. Dedos abiertos para empujar y curvados para sostener.
- Caminata de combate reemplazada por pasos procedurales de 1 m por ciclo; fase de apoyo ligada a la distancia, despegue suave, pies hacia delante y arranque/parada gradual.
- Recorridos completos verificados: automóvil 948 fotogramas, roca elevada hasta 1,8 m en 210 fotogramas y pendiente de 35° en 948 fotogramas, más preparación.
- En esos recorridos: sin cambios de escala, sin errores JavaScript; codos y rodillas dentro de sus límites; muñecas dentro del límite de 68° (tolerancia numérica); pies sin penetrar el suelo.
- Error máximo de alcance de manos: 0,11 mm en empuje, 2,6 cm en el extremo de alcance del levantamiento. Se prioriza no estirar los brazos.
- Inspección visual cercana y lateral de las tres escenas. Pausa conserva exactamente las transformaciones.
- Informe numérico: articulaciones-3.2.json. Cálculos físicos y carga móvil 3.1 conservados.

Limitación visual: las animaciones del recurso original no incluyen clips específicos de empuje o levantamiento. Se adaptan reposo y caminata con correcciones limitadas. No se simula colisión fina de dedos ni un sistema biomecánico completo.
