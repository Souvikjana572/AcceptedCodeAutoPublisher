@echo off
setlocal

set "EXT_DIR=%~dp0"
set "PROFILE_DIR=%~dp0chrome-profile"
set "CHROME="

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

if not defined CHROME (
  echo Google Chrome was not found. Install Chrome or edit this file with its chrome.exe path.
  pause
  exit /b 1
)

start "Accepted Solutions Sync" "%CHROME%" --user-data-dir="%PROFILE_DIR%" --load-extension="%EXT_DIR%" --no-first-run --new-window "https://www.geeksforgeeks.org/problems/" "https://leetcode.com/problemset/" "https://codeforces.com/problemset"
endlocal
