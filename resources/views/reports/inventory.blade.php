<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte de Inventario - PYMETORY</title>
    <style>
        @page { margin: 40px 30px; }
        body { font-family: 'Helvetica', 'DejaVu Sans', sans-serif; color: #333; font-size: 12px; }
        .header { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-bottom: 20px; }
        .header h1 { font-size: 18px; color: #1e293b; margin: 0; }
        .header p { font-size: 10px; color: #666; margin: 4px 0 0; }
        .meta { margin-bottom: 20px; font-size: 11px; }
        .meta td { padding: 2px 10px; }
        table.data { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.data th { background-color: #1e293b; color: white; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; }
        table.data td { padding: 7px 10px; border-bottom: 1px solid #eee; font-size: 11px; }
        .badge-critico { background: #fef2f2; color: #dc2626; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
        .badge-ok { background: #ecfdf5; color: #059669; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
        .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 9px; color: #888; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PYMETORY — Reporte de Inventario</h1>
        <p>Universidad del Valle · Generado: {{ now()->format('d/m/Y H:i') }}</p>
    </div>

    <table class="meta" style="width:100%">
        <tr>
            <td><b>Responsable:</b> Germán David Murillas</td>
            <td style="text-align:right"><b>Estado Bodega:</b> ACTIVO</td>
        </tr>
        <tr>
            <td><b>Métrica:</b> Kilogramos (3 decimales)</td>
            <td style="text-align:right"><b>Total lotes:</b> {{ count($lotes) }}</td>
        </tr>
    </table>

    <table class="data">
        <thead>
            <tr>
                <th>Material</th>
                <th>Lote</th>
                <th>Cantidad (kg)</th>
                <th>Vencimiento</th>
                <th>Días</th>
                <th>Estado</th>
            </tr>
        </thead>
        <tbody>
            @forelse($lotes as $lote)
            <tr>
                <td><b>{{ $lote->material->name ?? '—' }}</b></td>
                <td>{{ $lote->batch_number }}</td>
                <td>{{ number_format($lote->quantity ?? 0, 3) }}</td>
                <td>{{ optional($lote->expiration_date)->format('d/m/Y') ?? '—' }}</td>
                <td>{{ $lote->days_until_expiration > 0 ? $lote->days_until_expiration : 'VENCIDO' }}</td>
                <td>
                    @if($lote->is_critical)
                        <span class="badge-critico">CRÍTICO</span>
                    @else
                        <span class="badge-ok">ÓPTIMO</span>
                    @endif
                </td>
            </tr>
            @empty
            <tr><td colspan="6" style="text-align:center;padding:30px;color:#999">Sin lotes en el inventario.</td></tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        Pymetory © {{ date('Y') }} — Universidad del Valle — Reporte generado automáticamente
    </div>
</body>
</html>
