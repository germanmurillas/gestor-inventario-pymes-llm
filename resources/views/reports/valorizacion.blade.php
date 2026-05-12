<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Valorización de Inventario - PYMETORY</title>
    <style>
        @page { margin: 100px 25px; }
        header { position: fixed; top: -60px; left: 0px; right: 0px; height: 50px; text-align: center; line-height: 35px; border-bottom: 1px solid #ddd; }
        footer { position: fixed; bottom: -60px; left: 0px; right: 0px; height: 50px; text-align: center; line-height: 35px; border-top: 1px solid #ddd; font-size: 10px; color: #777; }
        body { font-family: 'Helvetica', sans-serif; color: #333; font-size: 12px; }
        .title { text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 20px; color: #1e293b; }
        .summary-box { background: linear-gradient(135deg, #ede9fe, #f5f3ff); border: 1px solid #c4b5fd; border-radius: 8px; padding: 15px; margin-bottom: 20px; display: flex; gap: 20px; justify-content: center; }
        .summary-item { text-align: center; }
        .summary-item .val { font-size: 22px; font-weight: bold; color: #4c1d95; }
        .summary-item .lbl { font-size: 9px; text-transform: uppercase; color: #6d28d9; font-weight: bold; letter-spacing: 1px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background-color: #2e1065; color: white; text-align: left; padding: 10px; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; }
        td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
        tr:nth-child(even) { background: #f8fafc; }
    </style>
</head>
<body>
    <header><strong>PYMETORY</strong> - Valorizaci&oacute;n del Inventario</header>
    <footer>Pymetory &copy; {{ date('Y') }} - Universidad del Valle - Página <span class="pagenum"></span></footer>
    <main>
        <div class="title">Valorizaci&oacute;n de Inventario (AVECO)</div>
        <div class="summary-box">
            <div class="summary-item"><div class="val">${{ number_format($summary['totalValorInventario'], 2) }}</div><div class="lbl">Valor Total</div></div>
            <div class="summary-item"><div class="val">{{ $summary['totalMateriales'] }}</div><div class="lbl">Materiales</div></div>
            <div class="summary-item"><div class="val">{{ number_format($summary['totalStock'], 3) }}</div><div class="lbl">Kgs Totales</div></div>
            <div class="summary-item"><div class="val">${{ number_format($summary['costoPromedio'], 2) }}</div><div class="lbl">Costo Prom. kg</div></div>
        </div>
        <table>
            <thead><tr><th>Material</th><th>C&oacute;digo</th><th>Stock (kg)</th><th>Costo Prom.</th><th>Valor Total</th><th>Lotes Activos</th></tr></thead>
            <tbody>
                @foreach($data as $row)
                <tr>
                    <td><strong>{{ $row['material'] }}</strong></td>
                    <td><code>{{ $row['codigo'] }}</code></td>
                    <td>{{ number_format($row['stock_total'], 3) }}</td>
                    <td>${{ number_format($row['costo_promedio'], 2) }}</td>
                    <td><strong>${{ number_format($row['valor_total'], 2) }}</strong></td>
                    <td>{{ $row['lotes_activos'] }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </main>
</body>
</html>
