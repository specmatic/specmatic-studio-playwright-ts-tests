@echo off
REM Restart docker containers by stopping and then starting them

SET SCRIPT_DIR=%~dp0

call "%SCRIPT_DIR%stop-docker.bat"
IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

call "%SCRIPT_DIR%start-docker.bat"
EXIT /B %ERRORLEVEL%
