# Trayectorias Ortogonales - Dipolo Eléctrico

Aplicación web desarrollada en Python con Flask que modela y visualiza las trayectorias ortogonales de un campo eléctrico generado por un dipolo.

## Requisitos Previos
- Python 3.8+ (Recomendado)

## Instrucciones de Instalación y Ejecución Local

1.  **Abrir una terminal** y navegar a este directorio.
2.  **Crear un entorno virtual** (opcional pero recomendado):
    ```bash
    python -m venv venv
    ```
3.  **Activar el entorno virtual**:
    - En Windows:
      ```bash
      venv\Scripts\activate
      ```
    - En macOS/Linux:
      ```bash
      source venv/bin/activate
      ```
4.  **Instalar las dependencias**:
    ```bash
    pip install -r requirements.txt
    ```
5.  **Ejecutar la aplicación Flask**:
    ```bash
    python app.py
    ```
6.  **Abrir el navegador** y visitar: [http://127.0.0.1:5000/](http://127.0.0.1:5000/)

## Funcionalidades
- Visualización de curvas equipotenciales y líneas de campo eléctrico en tiempo real.
- Interfaz moderna y responsiva construida con Tailwind CSS.
- Modo Claro y Oscuro.
- Controles interactivos para ajustar la magnitud de la carga ($q$) y la distancia ($d$).
