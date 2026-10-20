@echo off
echo ==================================
echo BLAD SYSTEM STARTUP
echo ==================================
docker compose up --build -d
echo.
echo BLAD services are starting...
docker compose ps
echo.
echo Dashboard: http://localhost:3000
