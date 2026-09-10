"""Rasteriza un rango de páginas de un PDF a PNG.

Existe porque import-book-concepts.mts manda las páginas a un modelo con
visión, y los dos proveedores las quieren distinto: Claude acepta el PDF
nativo, Grok solo imágenes. Rasterizar en Node necesita canvas y pdfjs; en
Python es una línea con PyMuPDF, así que el TS llama acá y sigue siendo el
único lugar donde vive el prompt.

Imprime una ruta por línea, en orden de página.

    python3 scripts/_pdf_to_png.py libro.pdf 45 72 /tmp/salida
"""

import sys
from pathlib import Path

import pymupdf

# 150 dpi alcanza para leer texto de libro y ver un diagrama, y deja las
# páginas por debajo del medio mega. Más resolución es más plata sin más señal.
DPI = 150


def main() -> int:
    if len(sys.argv) != 5:
        print(__doc__, file=sys.stderr)
        return 1
    pdf, desde, hasta, salida = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), Path(sys.argv[4])
    salida.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open(pdf)
    if doc.needs_pass and not doc.authenticate(""):
        print("El PDF pide una contraseña que no tenemos.", file=sys.stderr)
        return 1
    if hasta > doc.page_count:
        print(f"El PDF tiene {doc.page_count} páginas y pediste hasta la {hasta}.", file=sys.stderr)
        return 1
    for numero in range(desde, hasta + 1):
        destino = salida / f"p{numero:04d}.png"
        # Las páginas son 0-based adentro; el usuario cuenta desde 1.
        doc[numero - 1].get_pixmap(dpi=DPI).save(destino)
        print(destino)
    return 0


if __name__ == "__main__":
    sys.exit(main())
