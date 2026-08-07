# update-cache.ps1
# Exécuter avant de commiter : .\update-cache.ps1

$date = Get-Date -Format "yyyy-MM-dd-HHhmm"

# Mise à jour sw.js
$swFile = "sw.js"
$swContent = Get-Content $swFile -Raw -Encoding UTF8
$swContent = $swContent -replace "CACHE_VERSION = '[^']*'", "CACHE_VERSION = '$date'"
[System.IO.File]::WriteAllText($swFile, $swContent)

# Mise à jour index.html
$htmlFile = "index.html"
$htmlContent = Get-Content $htmlFile -Raw -Encoding UTF8
$htmlContent = $htmlContent -replace 'id="app-version">v[^<]*<', "id=""app-version"">v$date<"
[System.IO.File]::WriteAllText($htmlFile, $htmlContent)

Write-Host "Cache version mise à jour : $date"
