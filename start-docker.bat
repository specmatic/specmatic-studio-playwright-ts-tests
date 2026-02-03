@echo off
REM Start the docker containers defined in the docker-compose.yaml with a unique project name

FOR %%I IN ("%CD%") DO SET REPO_NAME=%%~nxI

docker compose -p %REPO_NAME% -f specmatic-studio-demo/docker-compose.yaml up -d

REM Wait until the service is accessible
SET BASE_URL=http://localhost:9000/_specmatic/studio
SET MAX_ATTEMPTS=30
SET SLEEP_SECONDS=2
SET /A attempt=1
:wait_loop
curl --silent --fail %BASE_URL% >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    echo %BASE_URL% is accessible.
    EXIT /B 0
)
echo Attempt %attempt%/%MAX_ATTEMPTS%: %BASE_URL% not accessible yet. Waiting %SLEEP_SECONDS% seconds...
IF %attempt% GEQ %MAX_ATTEMPTS% (
    echo Error: %BASE_URL% was not accessible after %MAX_ATTEMPTS% attempts.
    EXIT /B 1
)
SET /A attempt+=1
powershell -Command "Start-Sleep -Seconds %SLEEP_SECONDS%"
GOTO wait_loop
