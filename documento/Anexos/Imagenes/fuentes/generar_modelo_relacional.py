"""Genera el modelo relacional del anexo desde el esquema real (base SQLite migrada con las migraciones de Laravel).
Uso: python3 generar_modelo_relacional.py <ruta database.sqlite>  → ModeloRelacional.dot y ../ModeloER_Pymetory.png"""
import sqlite3, subprocess, sys, os
AQUI = os.path.dirname(os.path.abspath(__file__))
TABLAS = ["bodegas", "materials", "tags", "material_tag", "lotes", "users", "vendors", "transferencias", "movimientos", "audit_log",
          "notifications", "chat_histories", "kanban_items", "purchase_orders", "purchase_order_items"]
OMITIR = {"created_at", "updated_at", "email_verified_at", "password", "remember_token"}
c = sqlite3.connect(sys.argv[1]); nodos, aristas = [], []
for t in TABLAS:
    cols = list(c.execute(f"PRAGMA table_info({t})"))
    if not cols: sys.exit(f"falta la tabla {t}")
    fks = {r[3]: r[2] for r in c.execute(f"PRAGMA foreign_key_list({t})")}
    filas = []
    for _, nombre, _, _, _, pk in cols:
        if nombre in OMITIR: continue
        marca = "PK" if pk else ("FK" if nombre in fks else "")
        filas.append(f'<tr><td align="left" width="22">{marca}</td><td align="left">{nombre}</td></tr>')
    color = "#7c2d12" if t == "movimientos" else "#1e1b4b"
    nodos.append(f'{t} [label=<<table border="1" cellborder="0" cellspacing="0" cellpadding="3"><tr><td colspan="2" bgcolor="{color}">'
                 f'<font color="white"><b>{t}</b></font></td></tr>{"".join(filas)}</table>>];')
    for col, destino in fks.items():
        if destino in TABLAS: aristas.append(f'{destino} -> {t} [label="{col}", arrowhead=crow, fontsize=9];')
dot = ("digraph G { graph [rankdir=TB, nodesep=0.35, ranksep=0.7, fontname=Helvetica]; node [shape=plaintext, fontname=Helvetica, fontsize=11];"
       " edge [color=\"#555555\", fontname=Times, fontcolor=\"#444444\"];\n" + "\n".join(nodos + aristas) + "\n}\n")
open(os.path.join(AQUI, "ModeloRelacional.dot"), "w").write(dot)
subprocess.run(["dot", "-Tpng", "-Gdpi=150", os.path.join(AQUI, "ModeloRelacional.dot"), "-o", os.path.join(AQUI, "..", "ModeloER_Pymetory.png")], check=True)
print(len(nodos), "tablas,", len(aristas), "llaves foráneas")
