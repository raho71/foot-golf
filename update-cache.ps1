# update-cache.ps1
# Exécuter avant de commiter : .\update-cache.ps1

$date = Get-Date -Format "yyyy-MM-dd-HHhmm"
$file = "sw.js"
$content = Get-Content $file -Raw -Encoding UTF8
$newContent = $content -replace "CACHE_VERSION = '[^']*'", "CACHE_VERSION = '$date'"
[System.IO.File]::WriteAllText($file, $newContent)
Write-Host "Cache version mise à jour : $date"
