<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte FEFO - PYMETORY</title>
    <style>
        @page { margin: 100px 25px; }
        header { position: fixed; top: -60px; left: 0px; right: 0px; height: 50px; text-align: center; line-height: 35px; border-bottom: 1px solid #ddd; }
        footer { position: fixed; bottom: -60px; left: 0px; right: 0px; height: 50px; text-align: center; line-height: 35px; border-top: 1px solid #ddd; font-size: 10px; color: #777; }
        body { font-family: 'Helvetica', sans-serif; color: #333; font-size: 12px; }
        .title { text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 20px; color: #dc2626; }
        .summary-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin-bottom: 20px; display: flex; gap: 20px; justify-content: center; }
        .summary-item { text-align: center; }
        .summary-item .val { font-size: 22px; font-weight: bold; color: #991b1b; }
        .summary-item .lbl { font-size: 9px; text-transform: uppercase; color: #b91c1c; font-weight: bold; letter-spacing: 1px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background-color: #7f1d1d; color: white; text-align: left; padding: 10px; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; }
        td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
        .critico { color: #dc2626; font-weight: bold; }
        .warning { color: #d97706; font-weight: bold; }
        .info { color: #2563eb; }
        .vencido { background: #fef2f2; }
        tr:nth-child(even) { background: #f8fafc; }
        tr.vencido:nth-child(even) { background: #fee2e2; }
    </style>
</head>
<body>
    <header><strong>PYMETORY</strong> - Alertas FEFO de Vencimiento</header>
    <footer>Pymetory &copy; {{ date('Y') }} - Universidad del Valle - Página <span class="pagenum"></span></footer>
    <main>
        <div class="title">Lotes Pr&oacute;ximos a Vencer (FEFO)</div>
        <div class="summary-box">
            <div class="summary-item"><div class="val">{{ $summary['total'] }}</div><div class="lbl">En Riesgo</div></div>
            <div class="summary-item"><div class="val">{{ $summary['vencidos'] }}</div><div class="lbl">Vencidos</div></div>
            <div class="summary-item"><div class="val">{{ $summary['criticos7dias'] }}</div><div class="lbl">&le; 7 D&iacute;as</div></div>
            <div class="summary-item"><div class="val">{{ $summary['criticos15dias'] }}</div><div class="lbl">&le; 15 D&iacute;as</div></div>
        </div>
        @if(!empty($recorte))
        <p style="font-size:9px;color:#555;margin:4px 0 8px">El resumen incluye los {{ $recorte['total'] }} registros. El detalle muestra los {{ $recorte['mostradas'] }} más recientes; el detalle completo está en el reporte en Excel o CSV.</p>
        @endif
        <table>
            <thead><tr><th>Material</th><th>Lote</th><th>Cantidad</th><th>Vencimiento</th><th>D&iacute;as Rest.</th><th>Bodega</th><th>Nivel</th><th>Valor</th></tr></thead>
            <tbody>
                @foreach($data as $row)
                @php $v = ($row['dias_restantes'] ?? 0) < 0; @endphp
                <tr class="{{ $v ? 'vencido' : '' }}">
                    <td><strong>{{ $row['material'] }}</strong><br><small>{{ $row['codigo'] }}</small></td>
                    <td><code>{{ $row['batch_number'] }}</code></td>
                    <td>{{ number_format($row['quantity'], 3) }}</td>
                    <td>{{ $row['expiration_date'] }}</td>
                    <td class="{{ $v ? 'critico' : (($row['dias_restantes'] ?? 99) <= 7 ? 'critico' : (($row['dias_restantes'] ?? 99) <= 15 ? 'warning' : 'info')) }}">
                        {{ ($row['dias_restantes'] ?? 0) < 0 ? 'VENCIDO' : $row['dias_restantes'] }}
                    </td>
                    <td>{{ $row['bodega'] }}</td>
                    <td>{{ strtoupper($row['nivel']) }}</td>
                    <td>${{ number_format($row['valor_total'], 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </main>
</body>
</html>
