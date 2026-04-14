#!/usr/bin/env python3
"""
ZIP con permisos Unix 644/755 para desplegar en Linux (Hostinger / Node).
Uso: python make-hostinger-unix-zip.py <carpeta_origen> <archivo.zip>
"""
from __future__ import annotations

import sys
import zipfile
from pathlib import Path

FILE_MODE = (0o100644 << 16)
DIR_MODE = (0o040755 << 16)


def main() -> None:
    if len(sys.argv) != 3:
        print("Uso: make-hostinger-unix-zip.py <origen> <salida.zip>", file=sys.stderr)
        sys.exit(2)
    src = Path(sys.argv[1]).resolve()
    out = Path(sys.argv[2]).resolve()
    if not src.is_dir():
        print(f"No es carpeta: {src}", file=sys.stderr)
        sys.exit(1)

    dirs: set[str] = set()
    files: list[tuple[Path, str]] = []

    for p in src.rglob("*"):
        if not p.is_file():
            continue
        rel = p.relative_to(src)
        arc = rel.as_posix()
        files.append((p, arc))
        parent = rel.parent
        while parent != Path("."):
            dirs.add(parent.as_posix() + "/")
            parent = parent.parent

    dir_list = sorted(dirs, key=lambda s: (s.count("/"), len(s)))

    out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for d in dir_list:
            zi = zipfile.ZipInfo(d)
            zi.create_system = 3
            zi.external_attr = DIR_MODE
            zf.writestr(zi, b"")

        for path, arc in sorted(files, key=lambda x: x[1]):
            zi = zipfile.ZipInfo(arc)
            zi.create_system = 3
            zi.external_attr = FILE_MODE
            zf.writestr(zi, path.read_bytes())

    print(f"OK {out} ({len(files)} archivos, {len(dir_list)} directorios)")


if __name__ == "__main__":
    main()
