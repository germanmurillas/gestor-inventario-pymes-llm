Scripts de diagnóstico que se ejecutan contra producción (app.pymetory.com).
No forman parte de la suite repetible: dependen de los datos vivos del servidor.
Se excluyen en playwright.config.cjs (testIgnore). Ejecutar a mano:
  npx playwright test --config playwright.config.cjs tests/usabilidad/diagnostico-produccion/<archivo> --ignore-snapshots
