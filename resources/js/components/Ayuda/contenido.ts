/**
 * Contenido de la ayuda de Pymetory: tareas frecuentes (guía rápida del Tablero) y una explicación
 * corta de cada pantalla (botón "Ayuda" del encabezado). Los textos siguen los botones reales de la
 * interfaz y el manual de usuario (tesis.pymetory.com/manual-de-usuario.pdf).
 */

export interface Tarea {
    id: string;
    titulo: string;
    cuando: string;
    pasos: string[];
    consejo?: string;
    vista: string;
    soloAdmin?: boolean;
}

export const TAREAS: Tarea[] = [
    {
        id: 'ingreso-lote', titulo: 'Registrar mercancía que llegó', cuando: 'Llegó un pedido del proveedor (por ejemplo, bultos de azúcar).', vista: 'INVENTARIO',
        pasos: [
            'Abra Inventario y toque el insumo (use el buscador si no lo ve).',
            'Pulse «Registrar ingreso de lote».',
            'Escriba el número de lote (el de la factura o la etiqueta), la cantidad, el costo por unidad, la fecha de vencimiento y la bodega.',
            'Pulse «Registrar lote».',
        ],
        consejo: 'Si el insumo no existe todavía, use el botón «Ingreso» de Inventario: crea el insumo con su primer lote.',
    },
    {
        id: 'escanear', titulo: 'Escanear un producto', cuando: 'Tiene la bolsa o el paquete en la mano.', vista: 'ESCANER',
        pasos: [
            'Pulse «Escanear» (abajo en el celular) y apunte la cámara al código de barras de la bolsa.',
            'Aparece el producto con su foto: pulse «Entró» o «Salió».',
            'Escriba la cantidad y pulse «Registrar». El lote y el vencimiento ya vienen llenos.',
        ],
        consejo: 'Si la cámara no lee, escriba los números que están debajo de las barras. Un código nuevo se registra en los ajustes del producto.',
    },
    {
        id: 'consumo', titulo: 'Sacar insumo para producción', cuando: 'Se va a usar harina, levadura u otro insumo.', vista: 'INVENTARIO',
        pasos: [
            'Abra Inventario y pulse «Consumo FEFO».',
            'Elija el insumo y pulse «Siguiente: Cantidad».',
            'Escriba la cantidad y el motivo (producción, venta, desperdicio…) y pulse «Revisar y Confirmar».',
            'Revise qué lotes se van a usar y pulse «Confirmar Despacho FEFO».',
        ],
        consejo: 'No tiene que escoger el lote: el sistema saca primero del que vence antes.',
    },
    {
        id: 'devolver', titulo: 'Devolver lo que sobró', cuando: 'Terminó la producción y quedó parte del bulto o de la estiva.', vista: 'INVENTARIO',
        pasos: [
            'Abra Inventario y toque el insumo.',
            'En el lote del que sacó, pulse «Devolver».',
            'Escriba cuánto sobró (lo que dice la báscula) y pulse «Devolver».',
        ],
        consejo: 'Vuelve al mismo lote y queda en el Kardex. Al sacar, puede escribir la cantidad en bultos: el sistema la pasa a kilos.',
    },
    {
        id: 'asistente', titulo: 'Preguntarle al asistente', cuando: 'Quiere saber cuánto hay, qué vence o qué se ha gastado, sin buscar en tablas.', vista: 'LLM',
        pasos: [
            'Abra «Asistente (IA)»: es la inteligencia artificial; los recuadros con lupa de las otras pantallas solo buscan en la lista.',
            'Escriba la pregunta como la diría en voz alta, por ejemplo «¿cuánta levadura hay?» o «¿qué vence esta semana?».',
            'Pulse el botón de enviar y espere la respuesta.',
        ],
        consejo: 'Nombre el insumo en cada pregunta. Si pregunta «¿y cuánto vale eso?», el asistente no sabe a qué se refiere «eso».',
    },
    {
        id: 'ajuste', titulo: 'Corregir una cantidad que no cuadra', cuando: 'Lo que hay en la bodega no coincide con el sistema (por ejemplo, la sal).', vista: 'INVENTARIO', soloAdmin: true,
        pasos: [
            'Abra Inventario y toque el insumo.',
            'En el lote que no cuadra, pulse «Conciliar».',
            'Escriba la cantidad real y el motivo del ajuste, y guarde.',
        ],
        consejo: 'Nada se borra: la corrección queda en el Kardex como un ajuste con su motivo. Si se equivoca, haga otro ajuste.',
    },
    {
        id: 'reporte', titulo: 'Sacar un reporte', cuando: 'Necesita el informe de la semana o del mes en PDF o Excel.', vista: 'REPORTES',
        pasos: [
            'Abra Reportes y elija el tipo (por ejemplo, «Historial de Movimientos» o «Inventario Actual»).',
            'Ponga las fechas en «Desde» y «Hasta» y, si quiere, la bodega o el insumo.',
            'Pulse «Exportar PDF» o «Exportar Excel».',
        ],
    },
    {
        id: 'reponer', titulo: 'Saber qué hay que pedir', cuando: 'Va a hacer el pedido al proveedor.', vista: 'REABASTECIMIENTO',
        pasos: [
            'Abra Reabastecimiento.',
            'Pulse «Por reponer» para ver solo lo que está bajo el mínimo o en su punto de pedido.',
            'Toque un insumo para ver cuánto se gasta por día, semana o mes.',
        ],
        consejo: 'Para que el sistema diga «pedir antes de…», registre los días que tarda el proveedor en los ajustes del insumo.',
    },
    {
        id: 'conteo', titulo: 'Cuadrar el conteo de fin de mes', cuando: 'Terminó el conteo físico de la bodega en la hoja de Excel.', vista: 'CONCILIACION', soloAdmin: true,
        pasos: [
            'Abra Conteo físico y pulse «Elegir archivo» para subir la hoja (.xlsx).',
            'Pulse «Ver comparación»: aparece lo contado, lo del sistema y la diferencia.',
            'Revise las filas marcadas y asigne a mano las que digan «Sin insumo».',
            'Pulse «Registrar ajustes en el Kardex».',
        ],
        consejo: 'Hasta el último paso no cambia nada: puede revisar con calma.',
    },
];

export interface AyudaPantalla {
    titulo: string;
    para: string;
    pasos: string[];
    consejo?: string;
}

/** Explicación de cada vista del tablero; la clave es el nombre de la vista. */
export const AYUDA_PANTALLAS: Record<string, AyudaPantalla> = {
    TABLERO: {
        titulo: 'Tablero', para: 'Ver de un vistazo cómo está el inventario.',
        pasos: ['Arriba: cuántos insumos y lotes hay, cuántos están por vencer y cuánto vale el inventario.', 'Abajo: los últimos movimientos y qué tan llena está cada bodega.', 'Toque una bodega para ver lo que tiene.'],
        consejo: 'La guía rápida de esta pantalla explica las tareas de todos los días.',
    },
    INVENTARIO: {
        titulo: 'Inventario', para: 'Ver cada insumo con sus lotes, registrar lo que llega y lo que sale.',
        pasos: ['Toque un insumo para ver sus lotes; el de arriba es el que sale primero.', '«Ingreso» crea un insumo nuevo; «Registrar ingreso de lote» (dentro del insumo) agrega un lote.', '«Consumo FEFO» saca insumo del lote que vence primero.', 'Use los botones de bodega y categoría para filtrar.'],
    },
    BUSCAR: {
        titulo: 'Buscar', para: 'Encontrar un lote por nombre, código, número de lote, categoría o bodega.',
        pasos: ['Escriba lo que busca.', 'Filtre por vigentes, por vencer o en cuarentena, y por bodega.'],
    },
    LLM: {
        titulo: 'Asistente', para: 'Preguntar por el inventario en palabras normales.',
        pasos: ['Escriba la pregunta, por ejemplo «¿cuánta harina hay?», «¿qué vence esta semana?» o «¿cuánto se gastó de azúcar este mes?».', 'Pulse enviar. El asistente consulta la base de datos antes de responder.', 'Las conversaciones quedan a la izquierda.'],
        consejo: 'Nombre el insumo en cada pregunta; el asistente no recuerda de qué se hablaba en la pregunta anterior.',
    },
    REPORTES: {
        titulo: 'Reportes', para: 'Descargar informes en PDF, CSV o Excel.',
        pasos: ['Elija el tipo de reporte.', 'Ponga las fechas en «Desde» y «Hasta» y, si quiere, la bodega o el insumo.', 'Pulse «Exportar PDF», «Exportar CSV» o «Exportar Excel».'],
    },
    REABASTECIMIENTO: {
        titulo: 'Reabastecimiento', para: 'Saber cuánto dura cada insumo y cuándo pedirlo.',
        pasos: ['Cada fila dice el consumo diario, para cuántos días alcanza y cuándo se agota.', '«Por reponer» deja solo lo que hay que pedir ya.', 'Toque un insumo para ver su gráfico de consumo.'],
        consejo: 'Se calcula con el consumo real de las últimas 4 semanas.',
    },
    LOG_MAESTRO: {
        titulo: 'Kardex', para: 'Ver todo lo que ha entrado y salido, quién lo hizo y cuándo.',
        pasos: ['Filtre por entradas o salidas, o busque por insumo, lote o usuario.'],
        consejo: 'Los movimientos no se pueden editar ni borrar. Una corrección se hace con un ajuste («Conciliar» en Inventario).',
    },
    ETIQUETAS: {
        titulo: 'Etiquetas', para: 'Clasificar los insumos con etiquetas propias.',
        pasos: ['Pulse «Nuevo Tag», póngale nombre y color.', 'Asígnela a los insumos que quiera agrupar (por ejemplo, «Perecedero»).'],
    },
    ESCANER: {
        titulo: 'Escanear código', para: 'Registrar entradas o salidas leyendo el código de barras de la bolsa o la etiqueta QR de un lote.',
        pasos: ['Permita el uso de la cámara y apunte al código de barras de la bolsa (o al QR de la etiqueta del lote).', 'Si no hay cámara, use «Manual» y escriba los números del código o el número de lote.', 'Con un producto: pulse «Entró» o «Salió» y escriba la cantidad.'],
    },
    SCAN_HISTORY: {
        titulo: 'Historial QR', para: 'Ver los escaneos hechos con el escáner.',
        pasos: ['Cada fila es un escaneo con su lote, tipo, cantidad y fecha.'],
    },
    TRANSFERENCIAS: {
        titulo: 'Transferencias', para: 'Pasar cantidad de un lote de una bodega a otra.',
        pasos: ['Elija el lote, la bodega de destino y la cantidad.', 'Confirme: queda una salida en la bodega de origen y una entrada en la de destino.'],
    },
    PURCHASE_ORDERS: {
        titulo: 'Órdenes de compra', para: 'Registrar pedidos a proveedores y recibirlos.',
        pasos: ['Cree la orden con el proveedor y los insumos.', 'Cuando llegue, pulse «Recibir», escriba por insumo la cantidad, el lote, el vencimiento y la bodega, y pulse «Confirmar recepción».', 'El sistema crea los lotes y sus entradas en el Kardex.'],
    },
    LABELS_PRINT: {
        titulo: 'Imprimir etiquetas', para: 'Imprimir códigos QR y de barras para pegar en los lotes.',
        pasos: ['Busque y elija los lotes; escoja código QR o de barras.', 'Pulse «Imprimir Todo».'],
    },
    NOTIFICACIONES: {
        titulo: 'Alertas', para: 'Ver avisos de existencias bajas y de lotes por vencer.',
        pasos: ['Toque una alerta para marcarla como leída y abrir el inventario.'],
        consejo: 'El sistema revisa el inventario cada hora.',
    },
    CONCILIACION: {
        titulo: 'Conteo físico', para: 'Cuadrar el sistema con el conteo de fin de mes que está en la hoja de Excel.',
        pasos: ['Pulse «Elegir archivo», escoja la hoja (.xlsx o .csv) y la unidad (kg).', 'Pulse «Ver comparación» y revise cada fila; asigne a mano las que digan «Sin insumo».', 'Pulse «Registrar ajustes en el Kardex».'],
        consejo: 'Hasta el último paso no cambia nada. Lo que falta sale por FEFO y lo que sobra entra al lote más reciente.',
    },
};
