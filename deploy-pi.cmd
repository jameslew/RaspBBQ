echo ON
echo.-----Pushing files to Raspberry Pi-----
xcopy .\*.js* z:\app /R /Y
xcopy .\routes\*.js* z:\app\routes /R /Y
xcopy .\*.html z:\app /R /Y
xcopy .\*.css z:\app /R /Y
