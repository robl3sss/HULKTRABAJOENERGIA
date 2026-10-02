@echo off
cd /d "%~dp0"
echo HULK TRABAJO Y ENERGÍA - Trabajo y Energia
echo Abriendo el laboratorio. Mantenga esta ventana abierta.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_windows.ps1"
if errorlevel 1 (
 echo El servidor de Windows no pudo iniciar. Intentando con Python...
 py -3 "%~dp0start_server.py"
)
pause
