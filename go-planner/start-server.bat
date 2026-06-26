@echo off
setlocal

REM ============================================================
REM  Go Planner - iniciar servidor de desenvolvimento
REM  Faz duplo-clique neste ficheiro para arrancar a aplicacao.
REM ============================================================

REM Ir para a pasta onde este .bat esta (raiz do projeto)
cd /d "%~dp0"

title Go Planner - servidor

REM Verificar se o Node.js esta instalado
where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao foi encontrado no PATH.
  echo Instala o Node.js em https://nodejs.org e tenta novamente.
  echo.
  pause
  exit /b 1
)

REM Instalar dependencias na primeira utilizacao
if not exist "node_modules" (
  echo [INFO] A instalar dependencias pela primeira vez...
  call npm install
  if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo [INFO] A iniciar o servidor de desenvolvimento (next dev)...
echo [INFO] Abre o browser em http://localhost:3000
echo [INFO] Para parar o servidor, fecha esta janela ou carrega Ctrl+C.
echo.

call npm run dev

REM Se o servidor parar (erro ou Ctrl+C), manter a janela aberta
echo.
echo [INFO] O servidor terminou.
pause
endlocal
