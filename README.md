<p align="center">
  <img src="https://static.wikia.nocookie.net/logopedia/images/b/b8/Univalle.png" width="120" alt="Univalle Logo">
</p>

# Gestor de Inventario de Materia Prima con LLM (PYMETORY)

> **Trabajo de Grado - Ingeniería de Sistemas**  
> *Universidad del Valle - Sede Tuluá*

PYMETORY es un sistema inteligente de gestión de inventarios diseñado específicamente para PYMES. Utiliza Inteligencia Artificial (LLM) con técnicas de **RAG (Retrieval-Augmented Generation)** para optimizar la toma de decisiones y garantizar el cumplimiento de la lógica **FEFO (First-Expired, First-Out)** en el manejo de insumos críticos.

## 🔗 Documentación Técnica (Tesis)
Para la revisión del director y el jurado, se han consolidado los siguientes anexos técnicos:

*   📊 **[Modelo Entidad-Relación (MER)](docs/MER.md)** - Estructura de la base de datos y Kardex.
*   🏗️ **[Arquitectura del Sistema](docs/ARCHITECTURE.md)** - Stack tecnológico y flujo de datos IA.
*   🎭 **[Casos de Uso](docs/USE_CASES.md)** - Definición de roles (Admin/Operario) y escenarios.

---

## 🛠️ Stack Tecnológico Premium
- **Backend:** Laravel 11 (PHP 8.3)
- **Frontend:** React 19 + Inertia.js 2.0
- **Estilos:** Tailwind CSS v4 (Midnight Luxe Concept)
- **IA:** OpenAI API (GPT-4o-mini) + Motor RAG Contextual
- **PDF:** DomPDF para reportes automatizados

## 👥 Equipo de Trabajo
*   **Autor:** German David Murillas Mondragón
*   **Socio Técnico & Partner:** Jorge Augusto Estacio Almeciga
*   **Director de Proyecto:** Ing. Héctor Fabio Ocampo Arbeláez

---

## 🚀 Instalación Rápida

1.  Clonar el repositorio.
2.  Configurar el archivo `.env` con las credenciales de base de datos y la `OPENAI_API_KEY`.
3.  Ejecutar las migraciones y seeders para inicializar bodegas y usuarios:
    ```bash
    composer install
    npm install
    php artisan migrate --seed
    npm run dev
    ```

## 📜 Licencia
Este proyecto es propiedad intelectual de los autores bajo el marco académico de la **Universidad del Valle**.
