# _legacy/

Tests de Breeze legacy que referencian rutas que ya no existen en Pymetory
(EmailVerification, PasswordReset, PasswordUpdate, PasswordConfirmation, Registration, Profile).

**Razón**: Estas rutas fueron reemplazadas por nuestro `AuthController` custom.
Los tests de Breeze quedaron obsoletos y devuelven 404.

**Decisión**: Se movieron aquí (no en `Feature/`) para que PHPUnit NO los ejecute.
Si necesitás restaurar alguna de estas funcionalidades Breeze, mové el archivo
a `tests/Feature/` y actualizá las rutas.
