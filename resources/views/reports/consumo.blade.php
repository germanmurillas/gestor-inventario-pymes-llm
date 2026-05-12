<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte de Consumo - PYMETORY</title>
    <style>
        @page { margin: 100px 25px; }
        header { position: fixed; top: -60px; left: 0px; right: 0px; height: 50px; text-align: center; line-height: 35px; border-bottom: 1px solid #ddd; }
        footer { position: fixed; bottom: -60px; left: 0px; right: 0px; height: 50px; text-align: center; line-height: 35px; border-top: 1px solid #ddd; font-size: 10px; color: #777; }
        body { font-family: 'Helvetica', sans-serif; color: #333; font-size: 12px; }
        .title { text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 20px; color: #1e293b; }
        .summary-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin-bottom: 20px; display: flex; gap: 20px; justify-content: center; }
        .summary-item { text-align: center; }
        .summary-item .val { font-size: 22px; font-weight: bold; color: #166534; }
        .summary-item .lbl { font-size: 9px; text-transform: uppercase; color: #15803d; font-weight: bold; letter-spacing: 1px; }
        .category-box { background: #f8fafc; border-radius: 6px; padding: 10px; margin-bottom: 15px; display: flex; gap: 15px; font-size: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background-color: #1e293b; color: white; text-align: left; padding: 10px; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; }
        td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
        tr:nth-child(even) { background: #f8fafc; }
    </style>
</head>
<body>
    <header><strong>PYMETORY</strong> - Reporte de Consumo por Per&iacute;odo</header>
    <footer>Pymetory &copy; {{ date('Y') }} - Universidad del Valle - Página <span class="pagenum"></span></footer>
    <main>
        <div class="title">Consumo de Materia Prima por Per&iacute;odo</div>
        <div class="summary-box">
            <div class="summary-item"><div class="val">{{ number_format($summary['totalKilosConsumidos'], 2) }}</div><div class="lbl">Kgs Consumidos</div></div>
            <div class="summary-item"><div class="val">{{ $summary['totalOperaciones'] }}</div><div class="lbl">Operaciones</div></div>
            <div class="summary-item"><div class="val">{{ $summary['porProduccion'] }}</div><div class="lbl">Producci&oacute;n</div></div>
            <div class="summary-item"><div class="val">{{ $summary['porVenta'] }}</div><div class="lbl">Ventas</div></div>
            <div class="summary-item"><div class="val">{{ $summary['porAjuste'] }}</div><div class="lbl">Ajustes</div></div>
        </div>
        <table>
            <thead><tr><th>Fecha</th><th>Material</th><th>Lote</th><th>Bodega</th><th>Cantidad</th><th>Raz&oacute;n</th><th>Descripci&oacute;n</th><th>Usuario</th></tr></thead>
            <tbody>
                @foreach($data as $row)
                <tr>
                    <td>{{ $row['fecha'] }}</td>
                    <td><strong>{{ $row['material'] }}</strong><br><small>{{ $row['codigo'] }}</small></td>
                    <td><code>{{ $row['batch'] }}</code></td>
                    <td>{{ $row['bodega'] }}</td>
                    <td>{{ number_format($row['quantity'], 3) }}</td>
                    <td>{{ $row['reason'] }}</td>
                    <td>{{ $row['description'] }}</td>
                    <td>{{ $row['user'] }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </main>
</body>
</html>
