from PIL import Image
import os, pathlib

carpeta = pathlib.Path(os.getcwd())
print(f"Trabajando en: {carpeta}")
extensiones = {".jpg", ".jpeg", ".png", ".bmp", ".tiff"}
convertidas = 0
errores = 0
omitidas = 0

for archivo in carpeta.glob("*"):
    if archivo.suffix.lower() in extensiones:
        destino = archivo.with_suffix(".webp")
        if destino.exists():
            print(f"OMITIDO  {archivo.name}  (ya existe {destino.name})")
            omitidas += 1
            continue
        try:
            img = Image.open(archivo)
            w, h = img.size
            if w > 1200:
                ratio = 1200 / w
                img = img.resize((1200, int(h * ratio)), Image.LANCZOS)
            img.save(destino, format="WEBP", quality=82, method=6)
            size_orig = os.path.getsize(archivo) / 1024
            size_new  = os.path.getsize(destino) / 1024
            archivo.unlink()
            print(f"OK  {archivo.name}  ->  {destino.name}  ({size_orig:.0f}KB -> {size_new:.0f}KB)  [original borrado]")
            convertidas += 1
        except Exception as e:
            print(f"ERROR {archivo.name}: {e}")
            errores += 1

print()
print(f"Convertidas: {convertidas}  |  Omitidas: {omitidas}  |  Errores: {errores}")
