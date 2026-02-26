# Script para reorganizar el JSON de personajes
# - Asegura que "id" esté primero en cada objeto
# - Mantiene el orden: id, name, gender, value, source, img, vid, user, status, votes

$jsonPath = "$PSScriptRoot\src\data\new_characters.json"
$backupPath = "$PSScriptRoot\src\data\new_characters.json.backup2"

Write-Host "Reorganizando estructura del JSON..." -ForegroundColor Cyan

# Crear backup
if (Test-Path $jsonPath) {
    Copy-Item -Path $jsonPath -Destination $backupPath -Force
    Write-Host "Backup creado en: $backupPath" -ForegroundColor Green
} else {
    Write-Host "Error: No se encontró el archivo $jsonPath" -ForegroundColor Red
    exit 1
}

# Leer y parsear el JSON
$content = Get-Content -Path $jsonPath -Raw -Encoding UTF8
$characters = $content | ConvertFrom-Json

Write-Host "Total de personajes encontrados: $($characters.Count)" -ForegroundColor Yellow

# Reorganizar cada objeto con el orden correcto
$reorganized = @()
foreach ($char in $characters) {
    $newChar = [ordered]@{
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
    $reorganized += $newChar
}

# Convertir a JSON con formato bonito
$jsonOutput = $reorganized | ConvertTo-Json -Depth 10

# Guardar el archivo
$jsonOutput | Set-Content -Path $jsonPath -Encoding UTF8

Write-Host "`nReorganización completada exitosamente!" -ForegroundColor Green
Write-Host "- Total de personajes procesados: $($reorganized.Count)" -ForegroundColor White
Write-Host "- Orden de propiedades: id, name, gender, value, source, img, vid, user, status, votes" -ForegroundColor White
