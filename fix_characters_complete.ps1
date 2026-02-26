# Script combinado para limpiar y reorganizar el JSON de personajes
# 1. Elimina todos los asteriscos (**)
# 2. Cambia status "reclamado" a "Libre"
# 3. Reorganiza propiedades con "id" primero

$jsonPath = "$PSScriptRoot\src\data\new_characters.json"
$backupPath = "$PSScriptRoot\src\data\new_characters.json.backup_final"

Write-Host "=== Iniciando limpieza y reorganizacion completa ===" -ForegroundColor Cyan

# Crear backup del archivo original
if (Test-Path $jsonPath) {
    Copy-Item -Path $jsonPath -Destination $backupPath -Force
    Write-Host "Backup creado en: $backupPath" -ForegroundColor Green
} else {
    Write-Host "Error: No se encontro el archivo $jsonPath" -ForegroundColor Red
    exit 1
}

Write-Host "`n--- Paso 1: Eliminando asteriscos ---" -ForegroundColor Yellow
# Leer el contenido del archivo
$content = Get-Content -Path $jsonPath -Raw -Encoding UTF8

# Contar asteriscos antes de eliminar
$asteriskCount = ($content.ToCharArray() | Where-Object { $_ -eq '*' }).Count
Write-Host "Asteriscos encontrados: $asteriskCount" -ForegroundColor White

# Eliminar todos los asteriscos
$content = $content -replace '\*', ''

Write-Host "`n--- Paso 2: Cambiando status 'reclamado' a 'Libre' ---" -ForegroundColor Yellow
# Contar cuantos status tienen "reclamado"
# Buscamos "status": "Texto" donde Texto contiene Reclamado
$reclamadoPattern = '"status"\s*:\s*"[^"]*[Rr]eclamado[^"]*"'
$reclamadoMatches = [regex]::Matches($content, $reclamadoPattern)
$reclamadoCount = $reclamadoMatches.Count
Write-Host "Entradas con status 'reclamado' encontradas: $reclamadoCount" -ForegroundColor White

# Reemplazar cualquier status que contenga "reclamado" con "Libre"
$content = $content -replace '"status"\s*:\s*"[^"]*[Rr]eclamado[^"]*"', '"status": "Libre"'

# Guardar temporalmente para que ConvertFrom-Json pueda leerlo limpio
$content | Set-Content -Path $jsonPath -Encoding UTF8 -NoNewline

Write-Host "`n--- Paso 3: Reorganizando estructura JSON ---" -ForegroundColor Yellow
# Leer y parsear el JSON limpio
try {
    $characters = Get-Content -Path $jsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
} catch {
    Write-Host "Error al parsear el JSON: $_" -ForegroundColor Red
    exit 1
}

Write-Host "Total de personajes: $($characters.Count)" -ForegroundColor White

# Reorganizar cada objeto con el orden correcto
# Usamos un enfoque optimizado asignando el resultado del loop directamente
$reorganized = foreach ($char in $characters) {
    [ordered]@{
        id = $char.id
        name = $char.name
        gender = $char.gender
        value = $char.value
        source = $char.source
        img = $char.img
        vid = $char.vid
        user = $char.user
        status = $char.status
        votes = $char.votes
    }
}

# Convertir a JSON con formato bonito
$jsonOutput = $reorganized | ConvertTo-Json -Depth 10

# Guardar el archivo final
$jsonOutput | Set-Content -Path $jsonPath -Encoding UTF8

Write-Host "`n=== Proceso completado exitosamente ===" -ForegroundColor Green
Write-Host "- Asteriscos eliminados: $asteriskCount" -ForegroundColor White
Write-Host "- Status 'reclamado' cambiados a 'Libre': $reclamadoCount" -ForegroundColor White
Write-Host "- Total de personajes procesados: $($reorganized.Count)" -ForegroundColor White
Write-Host "- Orden de propiedades: id, name, gender, value, source, img, vid, user, status, votes" -ForegroundColor White
Write-Host "`nPara restaurar el archivo original:" -ForegroundColor Cyan
Write-Host "Copy-Item -Path '$backupPath' -Destination '$jsonPath' -Force" -ForegroundColor Gray
