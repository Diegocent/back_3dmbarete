# Genera un ZIP del API (back/) para subir a Hostinger Node: en la raíz del ZIP va package.json.
# Excluye node_modules, dist, .git, uploads locales, Docker y .env (configurá variables en el panel).
# Usa Python + make-hostinger-unix-zip.py (permisos Unix), igual que front/scripts.
#
# Uso (desde la carpeta back/):
#   powershell -ExecutionPolicy Bypass -File scripts/package-hostinger-node-zip.ps1

$ErrorActionPreference = "Stop"
$src = Split-Path $PSScriptRoot -Parent
$out = Join-Path (Split-Path $src -Parent) "3d-mbarete-api-hostinger.zip"
$tmp = Join-Path $env:TEMP "mbarete-api-hostinger-$(Get-Random)"
$pyScript = Join-Path $PSScriptRoot "make-hostinger-unix-zip.py"

if (-not (Test-Path (Join-Path $src "package.json"))) {
  throw "No se encontró package.json en $src"
}

New-Item -ItemType Directory -Path $tmp -Force | Out-Null
robocopy $src $tmp /E `
  /XD node_modules dist .git coverage storage .vscode `
  /XF .env .env.* .env.docker .env.local *.tsbuildinfo `
  /NFL /NDL /NJH /NJS /NC /NS | Out-Null

# Asegurar carpeta storage vacía en el zip (uploads se crean en runtime)
$storageEmpty = Join-Path $tmp "storage"
New-Item -ItemType Directory -Path $storageEmpty -Force | Out-Null
Set-Content -Path (Join-Path $storageEmpty ".gitkeep") -Value "" -Encoding utf8

if (Test-Path $out) { Remove-Item $out -Force }

$usedPython = $false
foreach ($launcher in @(
    @{ Cmd = "py"; Args = @("-3", $pyScript, $tmp, $out) },
    @{ Cmd = "python"; Args = @($pyScript, $tmp, $out) },
    @{ Cmd = "python3"; Args = @($pyScript, $tmp, $out) }
)) {
  try {
    $exe = Get-Command $launcher.Cmd -ErrorAction Stop
    & $exe.Source @($launcher.Args)
    if (Test-Path $out) {
      $usedPython = $true
      break
    }
  }
  catch {
    continue
  }
}

if (-not $usedPython) {
  Write-Warning "No se encontró Python. Se usa Compress-Archive (menos fiable en Linux)."
  Compress-Archive -Path (Join-Path $tmp '*') -DestinationPath $out -CompressionLevel Optimal -Force
}

Remove-Item $tmp -Recurse -Force

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($out)
try {
  $hasPkg = $false
  foreach ($e in $zip.Entries) {
    $n = $e.FullName -replace '\\', '/'
    if ($n -eq 'package.json' -or $n -eq './package.json') { $hasPkg = $true; break }
  }
  if (-not $hasPkg) { throw "El ZIP no contiene package.json en la raíz." }
}
finally { $zip.Dispose() }

Write-Host "Listo: $out"
Write-Host "Tamaño: $((Get-Item $out).Length / 1MB | ForEach-Object { '{0:N2} MB' -f $_ })"
Write-Host "En Hostinger: variables de entorno + build (npm ci && npm run build) + npm start. Migraciones solo si cambia el esquema."
Write-Host "Guía: deploy/HOSTINGER-API-NODE.md"
if ($usedPython) { Write-Host "ZIP con permisos Unix (Python)." }
