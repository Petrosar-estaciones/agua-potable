# Agua potable – Partes de entrega

App para cargar los partes de agua potable desde el celular, con foto de respaldo.
Los datos van a una planilla de Google y las fotos a una carpeta de Google Drive.

## 1. Planilla y script (una sola vez)

1. Crear una planilla nueva en Google Sheets, por ejemplo **"Partes agua potable"**.
2. Menú **Extensiones → Apps Script**.
3. Borrar lo que haya y pegar todo el contenido de `Code.gs`.
4. En la línea `const CLAVE = 'cambiar-esta-clave';` poner una clave propia.
5. Guardar (ícono del disquete).
6. Arriba, en el desplegable de funciones, elegir **setup** y tocar **Ejecutar**.
   Google pide permisos: *Revisar permisos → elegir la cuenta → Configuración avanzada → Ir a (proyecto) → Permitir*.
   Esto crea la hoja **Partes** y la carpeta **"Partes agua potable - fotos"** en Drive.
7. **Implementar → Nueva implementación** → tipo **Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
8. Copiar la **URL de la aplicación web** (termina en `/exec`).

## 2. Configurar la app

En `index.html`, buscar esta línea (está al principio del `<script>`) y pegar la URL:

```js
const API_URL = "PEGAR_ACA_LA_URL_DE_APPS_SCRIPT";
```

## 3. Subir a GitHub Pages

Subir todos estos archivos a un repositorio (por ejemplo `petrosar-estaciones/agua-potable`):

```
index.html  manifest.json  sw.js  logo.png  icon-180.png  icon-192.png  icon-512.png
```

`Code.gs` y este README pueden quedar en el repo o no; la app no los usa.

Luego **Settings → Pages → Branch: main / root → Save**. La app queda en
`https://petrosar-estaciones.github.io/agua-potable/`

## 4. En el celular

1. Abrir el link en Chrome (Android) o Safari (iPhone).
2. La primera vez pide la **clave** del paso 1.4.
3. Instalarla como app:
   - Android: menú ⋮ → **Instalar app** / **Agregar a pantalla principal**
   - iPhone: botón Compartir → **Agregar a inicio**

## Si cambiás el script

Cada vez que modifiques `Code.gs`: **Implementar → Administrar implementaciones → editar (lápiz) → Versión: Nueva versión → Implementar**.
Así la URL sigue siendo la misma.

## Notas

- Las fotos quedan en Drive compartidas "con el enlace", para poder verlas desde la app. Sin el enlace nadie las encuentra.
- Si no hay señal al guardar, la app avisa y los datos quedan cargados en pantalla para reintentar.
