# ================================================================
# MediConnect - Deploy Supabase Edge Functions
# Run: .\scripts\deploy-functions.ps1
# Prerequisites: supabase CLI installed, logged in
#   Install CLI: https://supabase.com/docs/guides/cli
#   Login:       supabase login
#   Link:        supabase link --project-ref qpwtgdephdjdodknjsqv
# ================================================================

Write-Host "Deploying Edge Functions to Supabase..." -ForegroundColor Cyan

$functions = @(
  "whatsapp-webhook",
  "send-reminders",
  "create-hospital-admin",
  "regenerate-slots"
)

foreach ($fn in $functions) {
  Write-Host "  Deploying: $fn" -ForegroundColor Yellow
  supabase functions deploy $fn --project-ref qpwtgdephdjdodknjsqv
  if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK: $fn" -ForegroundColor Green
  } else {
    Write-Host "  FAILED: $fn" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "Deployment complete." -ForegroundColor Green
Write-Host ""
Write-Host "Function URLs:" -ForegroundColor Cyan
Write-Host "  whatsapp-webhook:      https://qpwtgdephdjdodknjsqv.supabase.co/functions/v1/whatsapp-webhook"
Write-Host "  send-reminders:        https://qpwtgdephdjdodknjsqv.supabase.co/functions/v1/send-reminders"
Write-Host "  create-hospital-admin: https://qpwtgdephdjdodknjsqv.supabase.co/functions/v1/create-hospital-admin"
Write-Host "  regenerate-slots:      https://qpwtgdephdjdodknjsqv.supabase.co/functions/v1/regenerate-slots"
Write-Host ""
Write-Host "Next: Run .\scripts\set-secrets.ps1 to configure environment variables." -ForegroundColor Yellow
