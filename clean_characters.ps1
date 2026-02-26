# Script para limpiar el archivo new_characters.json
# - Elimina todos los asteriscos (**)
# - Cambia status "reclamado" a "Libre"

$jsonPath = "$PSScriptRoot\src\data\new_characters.json"
$backupPath = "$PSScriptRoot\src\data\new_characters.json.backup"

Write-Host "Iniciando limpieza de $jsonPath..." -ForegroundColor Cyan

# Crear backup del archivo original
if (Test-Path $jsonPath) {
    Copy-Item -Path $jsonPath -Destination $backupPath -Force
    Write-Host "Backup creado en: $backupPath" -ForegroundColor Green
} else {
    Write-Host "Error: No se encontró el archivo $jsonPath" -ForegroundColor Red
    exit 1
}

# Leer el contenido del archivo
$content = Get-Content -Path $jsonPath -Raw -Encoding UTF8

# Contar asteriscos antes de eliminar
$asteriskCount = ($content.ToCharArray() | Where-Object { $_ -eq '*' }).Count
Write-Host "Asteriscos encontrados: $asteriskCount" -ForegroundColor Yellow

# Eliminar todos los asteriscos
$content = $content -replace '\*', ''

# Cambiar status "reclamado" a "Libre"
# Buscar patrones como: "status": "*Reclamado*" o "status": "Reclamado" o variaciones
$reclamadoPattern = '"status"\s*:\s*"[^"]*[Rr]eclamado[^"]*"'
$reclamadoMatches = [regex]::Matches($content, $reclamadoPattern)
$reclamadoCount = $reclamadoMatches.Count

Write-Host "Entradas con status 'reclamado' encontradas: $reclamadoCount" -ForegroundColor Yellow

# Reemplazar cualquier status que contenga "reclamado" con "Libre"
$content = $content -replace '"status"\s*:\s*"[^"]*[Rr]eclamado[^"]*"', '"status": "Libre"'

# Guardar el archivo modificado
$content | Set-Content -Path $jsonPath -Encoding UTF8 -NoNewline

Write-Host "`nLimpieza completada exitosamente!" -ForegroundColor Green
Write-Host "- Asteriscos eliminados: $asteriskCount" -ForegroundColor White
Write-Host "- Status 'reclamado' cambiados a 'Libre': $reclamadoCount" -ForegroundColor White
Write-Host "`nSi necesitas restaurar el archivo original, usa:" -ForegroundColor Cyan
Write-Host "Copy-Item -Path '$backupPath' -Destination '$jsonPath' -Force" -ForegroundColor Gray
