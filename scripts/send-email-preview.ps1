# Sends the invoice and welcome preview emails to the address you give.
#   cd C:\Users\Colin\Documents\sendletter
#   .\scripts\send-email-preview.ps1 -To you@example.com
param(
  [Parameter(Mandatory = $true)][string]$To,
  [string]$Dir = "C:\Users\Colin\AppData\Local\Temp\claude\ed0a8528388de1cb\1be5875c-461f-459a-a1bb-06f54d7a4c86\scratchpad"
)
$line = (canner env list --reveal | Select-String '^RESEND_API_KEY').Line
if (-not $line) { throw "RESEND_API_KEY not found in 'canner env list --reveal'" }
$env:RESEND_API_KEY = ($line -split '\s+')[3]
$env:PREVIEW_TO = $To
python scripts\send-email-preview.py $Dir
Remove-Item Env:RESEND_API_KEY, Env:PREVIEW_TO
