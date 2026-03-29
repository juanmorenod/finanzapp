@echo off
echo ==============================================
echo Publicando cambios en Firebase Hosting...
echo ==============================================
echo.

cd /d "%~dp0"

echo Autenticando (es posible que se abra tu navegador)...
echo.
call npx -y firebase-tools@latest login

echo.
echo Desplegando app...
echo.
call npx -y firebase-tools@latest deploy --only hosting --project presupuesto-2bcd5

echo.
echo ==============================================
echo Listo! Tu app esta actualizada.
echo ==============================================
pause
