# update-cache.ps1
# Exécuter avant de commiter : .\update-cache.ps1

$date = Get-Date -Format "yyyy-MM-dd-HHhmm"
$file = "sw.js"
$content = Get-Content $file -Raw
$newContent = $content -replace "const CACHE_VERSION = '.*';", "const CACHE_VERSION = '$date';"
Set-Content $file $newContent -NoNewline
Write-Host "Cache version mise à jour : $date"
