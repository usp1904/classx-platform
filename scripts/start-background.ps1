$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

function Test-Healthy {
  try {
    $response = Invoke-WebRequest -Uri 'http://127.0.0.1:8787/api/health' -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

if (Test-Healthy) { exit 0 }

if (-not (Test-Path -LiteralPath (Join-Path $root 'server\public\index.html'))) {
  & npm run build | Out-Null
  if ($LASTEXITCODE -ne 0) { exit 1 }
}

$logDir = Join-Path $root 'logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$outLog = Join-Path $logDir 'classx.out.log'
$errLog = Join-Path $logDir 'classx.err.log'

Start-Process -FilePath 'node' -ArgumentList 'server/index.js' -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog

for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Milliseconds 500
  if (Test-Healthy) { exit 0 }
}

exit 1
