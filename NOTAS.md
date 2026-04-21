# LeGarage - Pagina de Ventas

## URLs
- Publica: https://agrofly.github.io/legarage
- Admin:   https://agrofly.github.io/legarage/?admin=1
- GitHub:  https://github.com/agrofly/legarage

## Como publicar cambios desde el admin (cualquier dispositivo)
1. Abrir el admin (URL de arriba con ?admin=1)
2. Editar catalogo, precios, productos
3. Panel "4) Publicar sitio" → pegar token → Guardar token → click Guardar y publicar
4. Esperar ~1 minuto → todos los dispositivos ven los cambios

## Como publicar desde la PC local
1. Editar archivos localmente
2. Doble clic en publicar.bat

## Como agregar imagenes de productos
1. Copiar foto a: assets/images/
2. Doble clic en convertir-imagenes.bat (convierte todo a WebP liviano)
3. En el campo "URL de imagen" del admin escribir: assets/images/nombre.webp
4. Publicar con publicar.bat o boton admin

## Estructura de archivos
```
pagina_ventas/
├── index.html              ← estructura de la pagina
├── styles.css              ← estilos visuales
├── app.js                  ← logica y admin
├── data.js                 ← datos de ejemplo (fallback)
├── catalogo.json           ← datos reales (este es el que se edita)
├── publicar.bat            ← push rapido desde PC
├── convertir-imagenes.bat  ← convierte fotos a WebP
├── assets/
│   ├── brand/
│   │   ├── logo-legarage.png
│   │   └── sim-logo-legarage.webp
│   └── images/             ← fotos de productos van aqui
└── NOTAS.md                ← este archivo
```

## Tecnologia
- HTML + CSS + JS puro (sin frameworks)
- Admin oculto en ?admin=1
- Datos en catalogo.json (GitHub Pages lo sirve sin cache)
- Boton publicar escribe catalogo.json en GitHub via API
- Hosting: GitHub Pages (gratis, sin limites de deploys)

## WhatsApp
- Numero configurado en catalogo.json → campo contact.whatsapp
- Formato: codigo pais + numero sin espacios (ej: 5491112345678)

## Token GitHub (para publicar.bat y panel admin)
Guardalo solo en tu navegador (panel admin → Guardar token).
No lo escribas en archivos del proyecto.
