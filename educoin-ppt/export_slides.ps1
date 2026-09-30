param(
    [string]$PptPath,
    [string]$OutDir
)
$PptPath = (Resolve-Path $PptPath).Path
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }
$OutDir = (Resolve-Path $OutDir).Path

$ppt = New-Object -ComObject PowerPoint.Application
try { $ppt.Visible = [Microsoft.Office.Core.MsoTriState]::msoTrue } catch {}
$pres = $ppt.Presentations.Open($PptPath, $true, $false, $true)
$pres.Export($OutDir, "PNG", 1600, 900)
$pres.Close()
$ppt.Quit()
Write-Output "EXPORTED to $OutDir"
