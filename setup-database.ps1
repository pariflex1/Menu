$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "========================================"
Write-Host "  SUPABASE DATABASE SETUP"
Write-Host "========================================"
Write-Host ""

$envContent = Get-Content ".env.local" -Raw
$supabaseUrl = ($envContent | Select-String -Pattern 'NEXT_PUBLIC_SUPABASE_URL=(.+)').Matches.Groups[1].Value.Trim()
$serviceKey = ($envContent | Select-String -Pattern 'SUPABASE_SERVICE_ROLE_KEY=(.+)').Matches.Groups[1].Value.Trim()

Write-Host "Supabase URL: $supabaseUrl"
Write-Host ""
Write-Host "========================================"
Write-Host "  MANUAL SETUP REQUIRED"
Write-Host "========================================"
Write-Host ""

Write-Host "I've already opened these for you:"
Write-Host "  1. Supabase SQL Editor (in browser)"
Write-Host "  2. setup-database.sql (in Notepad)"
Write-Host ""

Write-Host "Just do this:"
Write-Host "  1. In Notepad: Ctrl+A, then Ctrl+C"
Write-Host "  2. In Browser: Ctrl+V, then click RUN button"
Write-Host "  3. Wait 10 seconds for Success message"
Write-Host "  4. Press any key here to verify"
Write-Host ""

Write-Host "Press any key when you have clicked RUN..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host ""
Write-Host "Checking database..."
Write-Host ""

$headers = @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer $serviceKey"
}

try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/restaurants?limit=1" -Headers $headers -Method Get -ErrorAction Stop
    if ($response -and $response.Count -gt 0) {
        Write-Host "SUCCESS! Database is set up correctly!"
        Write-Host ""
        Write-Host "Found restaurant: $($response[0].name)"
        Write-Host ""
        Write-Host "Your app is ready!"
        Write-Host "Open: http://localhost:3000"
    } else {
        Write-Host "No data found yet."
        Write-Host "Refresh http://localhost:3000 to check"
    }
} catch {
    Write-Host "Could not verify database."
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host ""
    Write-Host "Please check:"
    Write-Host "  - Did you click RUN in Supabase?"
    Write-Host "  - Did you see Success message?"
    Write-Host ""
    Write-Host "If yes, just refresh: http://localhost:3000"
}

Write-Host ""
Write-Host "========================================"
Write-Host ""
