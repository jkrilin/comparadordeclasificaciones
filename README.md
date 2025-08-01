# Herramienta Web de Generación de Clasificaciones

Esta aplicación web permite cargar archivos CSV con datos de clasificaciones deportivas, seleccionar columnas relevantes y generar tablas comparativas de clasificaciones antiguas y nuevas. Además, incluye funcionalidades de paginación, resaltado de pilotos destacados, visualización de cambios en posiciones, leyendas explicativas y listado de pilotos que salen del Top 20.

## Funcionalidades principales

- Carga de archivos CSV para clasificaciones antiguas y nuevas.
- Selección dinámica de columnas a mostrar en la tabla.
- Visualización lado a lado de clasificaciones anteriores y nuevas.
- Indicadores visuales para cambios en posiciones (sube, baja, nueva entrada).
- Destacar piloto seleccionado por el usuario.
- Paginación con flechas para navegar en tablas largas.
- Mostrar leyenda de símbolos y texto de actualización de carrera.
- Mostrar listado de pilotos que salieron del Top 20.
- Visualización responsiva con scroll horizontal para tablas anchas.
- Exportación de clasificación generada (copiar HTML).
- Ventana emergente o nueva pestaña para ver la clasificación ampliada con los estilos y configuraciones actuales.

## Uso

1. Visita la pagina web https://jkrilin.github.io/generadordeclasificacion/ y selecciona los archivos CSV para las clasificaciones antigua y nueva.
2. Define el nombre que quieres mostrar para cada archivo.
3. Selecciona las columnas que quieres que aparezcan en la tabla.
4. Configura opciones como piloto destacado, tamaño máximo de tabla, mostrar leyenda y pilotos salientes.
5. Pulsa "Generar Clasificación" para visualizar las tablas y los datos adicionales.
6. Usa los botones para copiar el HTML o actualizar la clasificación con nuevas configuraciones.
7. Puedes ampliar la clasificación en una ventana nueva para una vista detallada.

## Tecnologías usadas

- HTML, CSS y JavaScript puro.
- Uso de APIs web estándar (FileReader, DOM).
- Sin dependencias externas ni frameworks.

---

# CHANGELOG.md

```markdown
# Changelog

## [1.0.0] - 2025-07-31

### Añadido
- Funcionalidad para cargar y parsear archivos CSV con clasificaciones.
- Selector dinámico de columnas para mostrar en las tablas.
- Visualización comparativa de clasificaciones antigua y nueva con paginación.
- Indicadores de cambio de posición (sube, baja, misma posición, nueva entrada).
- Resaltado de piloto destacado.
- Visualización de pilotos que salen del Top 20.
- Leyenda explicativa de símbolos.
- Texto de actualización de carrera visible y estilizado.
- Botones para copiar el HTML generado y actualizar la clasificación.
- Ventana emergente para ver la clasificación ampliada con estilos.
- Ventana nueva (pestaña) para ver clasificación con paginación y configuración actual.
- Manejo de errores y mensajes emergentes (popups).
- Barra de progreso al cargar archivos.
- Diseño responsivo y accesible.
- Código modular y comentado para fácil mantenimiento.

### Corregido
- Errores en manejo de paginación y recálculo dinámico.
- Problemas visuales en tablas cuando se añaden muchas columnas.
- Mejoras en rendimiento y UX.

