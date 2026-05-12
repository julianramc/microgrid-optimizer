@echo off
setlocal
:: Cambiar al directorio donde se encuentra el script
cd /d "%~dp0"

:: Colores y Estética (Fondo negro, texto cian brillante)
title MicroGrid Optimizer v2.0 - Lanzador
color 0B

echo.
echo  =================================================================
echo           MICROGRID OPTIMIZER - ZONAS NO INTERCONECTADAS
echo  =================================================================
echo.
echo  [1/3] Verificando entorno de ejecucion...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Node.js no esta instalado. 
    echo  Es necesario para ejecutar la aplicacion web.
    echo  Descargalo en: https://nodejs.org/
    echo.
    pause
    exit /b
)

:: Verificar si existen las dependencias
if not exist "node_modules\" (
    echo  [2/3] Instalando dependencias (solo la primera vez)...
    echo        Esto puede tardar un momento...
    call npm install --quiet
) else (
    echo  [2/3] Dependencias verificadas correctamente.
)

echo  [3/3] Iniciando el software...
echo.
echo  -----------------------------------------------------------------
echo   LA APLICACION SE ABRIRA EN TU NAVEGADOR EN BREVES SEGUNDOS
echo   URL: http://localhost:3000
echo  -----------------------------------------------------------------
echo.

:: Pequeña espera para que el servidor tenga tiempo de arrancar antes de abrir el navegador
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000"

:: Ejecutar Next.js
npm run dev

echo.
echo  Servidor detenido.
pause
