<?php

/**
 * Configuración central de MiLoto.
 * NADA hardcodeado en el controlador — todo se lee de aquí.
 */
return [
    // Universo de números (MiLoto: 1-39)
    'universo' => 39,

    // Cantidad de números por sorteo
    'muestra' => 5,

    // Ventana temporal: cuántos sorteos usar (null = todos)
    // Histórico actual = 553 sorteos (2023-10-20 → 2026-06-12).
    'ventana' => 553,

    // Umbrales para calientes/fríos
    'factor_caliente' => 1.15,
    'factor_frio'     => 0.85,

    // Monte Carlo: iteraciones
    'montecarlo_iter' => 10000,

    // Delta: máximo por delta
    'delta_max' => 15,

    // Chi-cuadrado: nivel de significancia
    'chi_alpha'     => 0.05,
    'chi_critico_38gl' => 53.38, // α=0.05, gl=38

    // Wheeling: tamaño del pool
    'wheeling_pool' => 8,

    // Cobertura: tamaño del pool
    'cobertura_pool' => 10,

    // ── Backtesting walk-forward (Fase 3) ──────────────────────────
    // Sorteos iniciales de calentamiento: no se evalúan (no hay historia
    // suficiente para que los algoritmos sean informativos). El backtest
    // arranca en idx = warmup + 1.
    'backtest_warmup' => 30,

    // Pesos del score (desempate del "mejor algoritmo" y ranking global).
    //   score = aciertos*peso_acierto + (aciertos>=2 ? bono_2 : 0) + pct
    'score_peso_acierto' => 100,
    'score_bono_2'       => 50,

    // Cobertura (covering design): fuerza mínima de garantía t (t-subsets).
    'cobertura_t' => 3,
];
