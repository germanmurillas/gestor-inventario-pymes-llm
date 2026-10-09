<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte de Movimientos - PYMETORY</title>
    <style>
        @page { margin: 100px 25px; }
        header { position: fixed; top: -60px; left: 0px; right: 0px; height: 50px; text-align: center; line-height: 35px; border-bottom: 1px solid #ddd; }
        footer { position: fixed; bottom: -60px; left: 0px; right: 0px; height: 50px; text-align: center; line-height: 35px; border-top: 1px solid #ddd; font-size: 10px; color: #777; }
        body { font-family: 'Helvetica', sans-serif; color: #333; font-size: 12px; }
        .title { text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 20px; color: #1e293b; }
        .summary-box { background: #f1f5f9; border-radius: 8px; padding: 15px; margin-bottom: 20px; display: flex; gap: 20px; justify-content: center; }
        .summary-item { text-align: center; }
        .summary-item .val { font-size: 22px; font-weight: bold; color: #1e293b; }
        .summary-item .lbl { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; letter-spacing: 1px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background-color: #1e293b; color: white; text-align: left; padding: 10px; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; }
        td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
        .type-in { color: #059669; font-weight: bold; }
        .type-out { color: #dc2626; font-weight: bold; }
        tr:nth-child(even) { background: #f8fafc; }
    </style>
</head>
<body>
    <header><strong>PYMETORY</strong> - Kardex Histórico de Movimientos</header>
    <footer>Pymetory &copy; {{ date('Y') }} - Universidad del Valle - Página <span class="pagenum"></span></footer>
    <main>
        <div class="title">Historial de Movimientos</div>
        <div class="summary-box">
            <div class="summary-item"><div class="val">{{ $summary['total'] }}</div><div class="lbl">Total Mov.</div></div>
            <div class="summary-item"><div class="val">{{ $summary['entradas'] }}</div><div class="lbl">Entradas</div></div>
            <div class="summary-item"><div class="val">{{ $summary['salidas'] }}</div><div class="lbl">Salidas</div></div>
            <div class="summary-item"><div class="val">{{ number_format($summary['totalCantidad'], 3) }}</div><div class="lbl">Kgs Totales</div></div>
        </div>
        @if(!empty($recorte))
        <p style="font-size:9px;color:#555;margin:4px 0 8px">El resumen incluye los {{ $recorte['total'] }} registros. El detalle muestra los {{ $recorte['mostradas'] }} más recientes; el detalle completo está en el reporte en Excel o CSV.</p>
        @endif
        {{-- Tablas de 25 filas: una tabla larga que cruza muchas páginas vuelve muy lento a dompdf. --}}
        @foreach(array_chunk($data, 25) as $bloque)
        <table>
            <thead><tr><th>Fecha</th><th>Material</th><th>Lote</th><th>Bodega</th><th>Tipo</th><th>Cantidad</th><th>Raz&oacute;n</th><th>Usuario</th></tr></thead>
            <tbody>
                @foreach($bloque as $row)
                <tr>
                    <td>{{ $row['fecha'] }}</td>
                    <td><strong>{{ $row['material'] }}</strong><br><small>{{ $row['codigo'] }}</small></td>
                    <td><code>{{ $row['batch'] }}</code></td>
                    <td>{{ $row['bodega'] }}</td>
                    <td class="{{ $row['type'] === 'entrada' ? 'type-in' : 'type-out' }}">{{ $row['type'] === 'entrada' ? 'ENTRADA' : 'SALIDA' }}</td>
                    <td>{{ number_format($row['quantity'], 3) }}</td>
                    <td>{{ $row['reason'] }}</td>
                    <td>{{ $row['user'] }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @endforeach
    </main>
</body>
</html>
