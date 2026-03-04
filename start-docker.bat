@echo off
REM Start the docker containers defined in the docker-compose.yaml with a unique project name

FOR %%I IN ("%CD%") DO SET REPO_NAME=%%~nxI

docker-compose -p %REPO_NAME% -f specmatic-studio-demo\docker-compose.yaml pull
docker-compose -p %REPO_NAME% -f specmatic-studio-demo\docker-compose.yaml up -d

REM Wait until required endpoints are accessible
SET MAX_ATTEMPTS=30
SET SLEEP_SECONDS=2

CALL :wait_for_url http://localhost:8095/health || EXIT /B 1
CALL :wait_for_url http://localhost:8090/products || EXIT /B 1
CALL :wait_for_url http://localhost:8080/health || EXIT /B 1
CALL :wait_for_url http://localhost:9000/_specmatic/studio || EXIT /B 1
EXIT /B 0

:wait_for_url
SET URL=%~1
SET /A attempt=1
echo Waiting for %URL% to become accessible...
:wait_loop
curl --silent --fail %URL% >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    echo %URL% is accessible.
    EXIT /B 0
)
echo Attempt %attempt%/%MAX_ATTEMPTS%: %URL% not accessible yet. Waiting %SLEEP_SECONDS% seconds...
IF %attempt% GEQ %MAX_ATTEMPTS% (
    echo Error: %URL% was not accessible after %MAX_ATTEMPTS% attempts.
    EXIT /B 1
)
SET /A attempt+=1
powershell -Command "Start-Sleep -Seconds %SLEEP_SECONDS%"
GOTO wait_loop
