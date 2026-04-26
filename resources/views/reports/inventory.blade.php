<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte de Inventario - PYMETORY</title>
    <style>
        @page { margin: 100px 25px; }
        header { position: fixed; top: -60px; left: 0px; right: 0px; height: 50px; text-align: center; line-height: 35px; border-bottom: 1px solid #ddd; }
        footer { position: fixed; bottom: -60px; left: 0px; right: 0px; height: 50px; text-align: center; line-height: 35px; border-top: 1px solid #ddd; font-size: 10px; color: #777; }
        body { font-family: 'Helvetica', sans-serif; color: #333; font-size: 12px; }
        .title { text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 20px; color: #1e293b; }
        .meta-info { margin-bottom: 30px; }
        .meta-info table { width: 100%; }
        .meta-info td { vertical-align: top; }
        
        table.inventory-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.inventory-table th { background-color: #1e293b; color: white; text-align: left; padding: 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
        table.inventory-table td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
        
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
        .badge-optimal { background-color: #ecfdf5; color: #059669; }
        .badge-critical { background-color: #fef2f2; color: #dc2626; }
        
        .footer-text { font-style: italic; font-size: 9px; margin-top: 40px; color: #64748b; }
    </style>
</head>
<body>
    <header>
        <strong>PYMETORY</strong> - Gestor de Inventario con Inteligencia Artificial
    </header>

    <footer>
        Pymetory © {{ date('Y') }} - Universidad del Valle - Página <span class="pagenum"></span>
    </footer>

    <main>
        <div class="title">Reporte de Existencias - Materia Prima</div>
        
        <div class="meta-info">
            <table>
                <tr>
                    <td>
                        <strong>Fecha de generación:</strong> {{ now()->format('d/m/Y H:i') }}<br>
                        <strong>Socio Responsable:</strong> Germán David Murillas<br>
                        <strong>Institución:</strong> Universidad del Valle
                    </td>
                    <td style="text-align: right;">
                        <strong>Estado de Bodega:</strong> ACTIVO<br>
                        <strong>Métrica Principal:</strong> Kilogramos (3 decimales)
                    </td>
                </tr>
            </table>
        </div>

        <table class="inventory-table">
            <thead>
                <tr>
                    <th>Material</th>
                    <th>Lote</th>
                    <th>Cantidad</th>
                    <th>Vencimiento</th>
                    <th>Días Restantes</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                @foreach($lotes as $lote)
                <tr>
                    <td><strong>{{ $lote->material->name }}</strong></td>
                    <td><code>{{ $lote->batch_number }}</code></td>
                    <td>{{ number_format($lote->quantity, 3) }}</td>
                    <td>{{ $lote->expiration_date->format('d/m/Y') }}</td>
                    <td>
                        @php
                            $days = now()->diffInDays($lote->expiration_date, false);
                        @endphp
                        {{ $days > 0 ? $days : 'VENCIDO' }}
                    </td>
                    <td>
                        @if($lote->is_critical)
                            <span class="badge badge-critical">CRÍTICO FEFO</span>
                        @else
                            <span class="badge badge-optimal">ÓPTIMO</span>
                        @endif
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <div class="footer-text">
            * Este reporte es un avance técnico del proyecto de grado. La precisión de los datos está sujeta a la última conciliación física registrada.
        </div>
    </main>
</body>
</html>
