# ================================================================
# MediConnect - Set Supabase Edge Function Secrets
# Reads values from ../.env automatically
# Run: .\scripts\set-secrets.ps1
# Prerequisites: supabase CLI installed, logged in, project linked
# ================================================================

# Parse .env file
$envFile = Join-Path $PSScriptRoot ".." ".env"
if (-not (Test-Path $envFile)) {
  Write-Error ".env file not found at $envFile"
  exit 1
}

$envVars = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*([^#][^=]+?)\s*=\s*(.*)\s*$') {
    $envVars[$Matches[1].Trim()] = $Matches[2].Trim()
  }
}

# Extract required secrets
$TWILIO_ACCOUNT_SID    = $envVars['TWILIO_ACCOUNT_SID']
$TWILIO_AUTH_TOKEN     = $envVars['TWILIO_AUTH_TOKEN']
$TWILIO_WHATSAPP_FROM  = $envVars['TWILIO_WHATSAPP_FROM']
$GROQ_API_KEY          = $envVars['GROQ_API_KEY']
$SERVICE_ROLE_KEY      = $envVars['SUPABASE_SERVICE_ROLE_KEY']
$APP_URL               = $envVars['APP_URL']
$TWILIO_DEV_MODE       = $envVars['TWILIO_DEV_MODE'] ?? 'false'

# Validate
$missing = @()
if (-not $TWILIO_ACCOUNT_SID)   { $missing += 'TWILIO_ACCOUNT_SID' }
if (-not $TWILIO_AUTH_TOKEN)    { $missing += 'TWILIO_AUTH_TOKEN' }
if (-not $TWILIO_WHATSAPP_FROM) { $missing += 'TWILIO_WHATSAPP_FROM' }
if (-not $GROQ_API_KEY)         { $missing += 'GROQ_API_KEY' }
if (-not $SERVICE_ROLE_KEY -or $SERVICE_ROLE_KEY -like 'eyJ...') {
  $missing += 'SUPABASE_SERVICE_ROLE_KEY (replace placeholder in .env)'
}

if ($missing.Count -gt 0) {
  Write-Error "Missing or placeholder values in .env:`n  $($missing -join "`n  ")"
  exit 1
}

Write-Host "Reading secrets from .env..." -ForegroundColor Cyan
Write-Host "Setting Supabase secrets..." -ForegroundColor Cyan

supabase secrets set `
  TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID `
  TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN `
  TWILIO_WHATSAPP_FROM=$TWILIO_WHATSAPP_FROM `
  GROQ_API_KEY=$GROQ_API_KEY `
  SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY `
  APP_URL=$APP_URL `
  TWILIO_DEV_MODE=$TWILIO_DEV_MODE

if ($LASTEXITCODE -eq 0) {
  Write-Host "Done! All secrets set." -ForegroundColor Green
  Write-Host ""
  Write-Host "Twilio webhook URL:" -ForegroundColor Yellow
  Write-Host "  https://qpwtgdephdjdodknjsqv.supabase.co/functions/v1/whatsapp-webhook"
  Write-Host ""
  Write-Host "Set this in Twilio Sandbox > 'When a message comes in'" -ForegroundColor Yellow
} else {
  Write-Error "supabase secrets set failed"
}
