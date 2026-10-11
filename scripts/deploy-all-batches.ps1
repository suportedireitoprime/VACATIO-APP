$ErrorActionPreference = "Continue"

$projectRef = "tlpxubeagmxapkysgobk"
Write-Host "Obtendo funcoes ja deployadas no Supabase..."
$listJson = npx supabase functions list --project-ref $projectRef --output json | ConvertFrom-Json
$deployedNames = @()
if ($listJson -and $listJson.functions) {
    $deployedNames = $listJson.functions | ForEach-Object { $_.slug }
}

Write-Host "Total ja deployadas: $($deployedNames.Count)"

$allLocalFolders = Get-ChildItem -Path "supabase/functions" -Directory | 
    Where-Object { $_.Name -ne "_shared" } | 
    Select-Object -ExpandProperty Name

$pending = $allLocalFolders | Where-Object { $deployedNames -notcontains $_ }
Write-Host "Total pendentes para deploy: $($pending.Count)"

$batchSize = 10
for ($i = 0; $i -lt $pending.Count; $i += $batchSize) {
    $end = [Math]::Min($i + $batchSize - 1, $pending.Count - 1)
    $currentBatch = $pending[$i..$end]
    
    $batchNum = [Math]::Floor($i / $batchSize) + 1
    $totalBatches = [Math]::Ceiling($pending.Count / $batchSize)
    Write-Host "=== Subindo Lote $batchNum de $totalBatches ($($currentBatch.Count) funcoes) ==="
    Write-Host ($currentBatch -join ", ")

    $batchArgs = $currentBatch + @("--project-ref", $projectRef)
    npx supabase functions deploy @batchArgs
    Start-Sleep -Seconds 3
}

Write-Host "=== CONCLUIDO! Todas as funcoes foram processadas ==="
