# HULK TRABAJO Y ENERGÍA

Simulador 3D de automóvil, roca y plano inclinado. Incluye el Hulk original, el Mazda MX-5 proporcionado, las texturas, la imagen de inicio y Three.js local.

## Abrir en teléfono

Abre la versión publicada con Chrome o Safari:
https://hulk-lab-robles-energia.roblesssw.chatgpt.site

Si solicita acceso, inicia sesión con la cuenta propietaria. El ZIP es el proyecto completo para ejecutarlo localmente; no es una APK.

## Ejecutar sin Internet en computadora

1. Extrae todo el ZIP.
2. Windows: abre `INICIAR_HULK_ENERGIA.bat` y mantén abierta su ventana. Usa el servidor PowerShell incluido; Python 3 es la alternativa.
3. macOS/Linux: con Python 3 instalado, ejecuta `python3 start_server.py`, o abre `INICIAR_HULK_ENERGIA.command`.
4. Utiliza la dirección local que muestra el lanzador.

Los módulos y modelos necesitan un servidor local: no abras index.html mediante doble clic. No se usan CDN ni peticiones a servicios externos. La versión alojada requiere conexión; el paquete local funciona sin Internet una vez instalado el entorno indicado.

## Controles

Selecciona automóvil, roca o pendiente. Ajusta las variables; INICIAR incluye una preparación breve antes de avanzar. PAUSAR congela tiempo, personaje y ruedas; REANUDAR continúa. REINICIAR conserva las variables y vuelve al inicio. Un dedo rota la cámara y dos dedos acercan o alejan. Toca la gráfica para consultar valores. Si una descarga falla, pulsa REINTENTAR. Con el seguimiento activado, la cámara acompaña a Hulk incluso después de rotarla.

La duración visual se adapta para observar a Hulk; el tiempo físico y su factor se indican debajo de la escena. El HUD muestra el instante actual; los resultados muestran el recorrido efectivo previsto. La gráfica se construye conforme avanza la simulación.

## Modelos y animación

- Hulk: FBX original intacto, 15,252 triángulos, 64 nombres de huesos y 19 animaciones. Texturas originales incluidas.
- Mazda MX-5: geometría de `carro-2(1).zip/source/Carro 2.rar/1.fbx`, convertida a GLB. Se excluyeron paredes y elementos ajenos al automóvil. 397,871 → 114,864 triángulos en computadora; 56,829 en teléfono. El automóvil móvil se descarga comprimido (1,5 MB), con detalles de textura que no bloquean el inicio. UV y normales preservadas; mapas reducidos a un máximo de 1024 px y materiales Corona adaptados a PBR.
- Cuatro conjuntos de ruedas originales, centrados individualmente. Giro = −distancia/radio sobre el eje de cada rueda.
- Reposo del FBX para respiración; locomoción con pasos ligados al desplazamiento. La postura de trabajo distribuye la inclinación entre pelvis y espalda y orienta los hombros hacia la carga.
- IK con ejes de flexión y giro definidos: codos entre 12° y 132°, rodillas entre 7° y 125°. Son límites visuales de este rig, no un modelo clínico.
- Muñecas con flexión limitada; giro del antebrazo repartido entre los huesos auxiliares. Palmas y dedos adaptados al automóvil, a la roca y a la carga.
- Los ocho auxiliares siguen la articulación correspondiente. No se escalan huesos ni se alargan segmentos.
- Pies orientados hacia la carga con ligera apertura; apoyo durante el paso, elevación suave y transición gradual al iniciar/detenerse. La animación conserva el estilo del modelo original y no calcula colisión individual de cada dedo.

## Física

`js/physics.js` conserva las ecuaciones originales: g=9.81 m/s², trabajo neto y cambio de energía cinética, reposo con fricción estática, frenado hasta detenerse, normal y trabajo gravitatorio. Un coeficiente común representa fricción estática/cinética. La pendiente tiene seguro antirretroceso. La roca se muestra detenida en el último fotograma calculado; el frenado adicional al sujetarla queda fuera del tramo de fuerza constante.

## Estructura

- `js/app.js`: controles y reloj físico.
- `js/scene.js`: escena, modelos, iluminación y cámaras.
- `js/animations.js`: mezcla y contacto del rig.
- `js/car.js`: carga del Mazda y materiales.
- `js/physics.js` y `js/charts.js`: cálculo y gráfica.
- `assets`: modelos, mapas e imagen de inicio.
- `docs`: inspección y comprobaciones.

Las licencias de Three.js y fflate están en `js/vendor`. Los modelos y la imagen son los recursos proporcionados para este proyecto.

## Desarrollo

Node.js permite ejecutar `npm test` y `npm run build`. No es necesario instalar paquetes para utilizar la aplicación: todas las dependencias del navegador están incluidas.
