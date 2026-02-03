@echo off
REM Stop the docker containers defined in the docker-compose.yaml with a unique project name

FOR %%I IN ("%CD%") DO SET REPO_NAME=%%~nxI

docker compose -p %REPO_NAME% -f specmatic-studio-demo/docker-compose.yaml down
