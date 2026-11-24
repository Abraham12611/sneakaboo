<#
.SYNOPSIS
  Bootstraps GitHub labels, milestones and issues from plan/phases/phase-NN-*.md. Idempotent.
.PARAMETER DryRun
  Only print what would be done.
.PARAMETER Repo
  owner/name of the GitHub repo.
.PARAMETER ProjectOwner
  If set together with -ProjectNumber, new issues are also added to that Project (v2).
#>
param(
  [switch]$DryRun,
  [string]$Repo = 'Abraham12611/sneakaboo',
  [string]$ProjectOwner = '',
  [int]$ProjectNumber = 0,
  [int]$SleepMs = 600
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$phaseDir = Join-Path $root 'plan\phases'
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Invoke-Gh {
  # returns stdout lines; throws on non-zero exit
  $out = & gh @args 2>&1
  if ($LASTEXITCODE -ne 0) { throw "gh $($args -join ' ') failed: $out" }
  return $out
}

# ---------- labels ----------
$labels = @()
0..11 | ForEach-Object { $labels += ,@("phase:P$_", '1D76DB', "Phase $_") }
$labels += ,@('type:engine', '5319E7', 'Engine / simulation')
$labels += ,@('type:art', 'F9A8D4', 'Art and assets')
$labels += ,@('type:level', '0E8A16', 'Level design')
$labels += ,@('type:backend', 'FBCA04', 'Base44 backend')
$labels += ,@('type:ui', 'C5DEF5', 'UI / UX')
$labels += ,@('type:qa', 'BFD4F2', 'QA and performance')
$labels += ,@('contest-critical', 'B60205', 'Required for the contest submission')
$labels += ,@('blocked', '000000', 'Blocked')
$labels += ,@('bug', 'D73A4A', 'Something is broken')
$labels += ,@('S1', 'B60205', 'Severity 1')
$labels += ,@('S2', 'D93F0B', 'Severity 2')
$labels += ,@('S3', 'FBCA04', 'Severity 3')

$existingLabels = @()
if (-not $DryRun -or $true) {
  try { $existingLabels = @(Invoke-Gh label list --repo $Repo --limit 200 --json name --jq '.[].name') } catch { Write-Warning $_ }
}
foreach ($l in $labels) {
  if ($existingLabels -contains $l[0]) { Write-Host "label exists: $($l[0])"; continue }
  if ($DryRun) { Write-Host "[dry] label create $($l[0])"; continue }
  Invoke-Gh label create $l[0] --repo $Repo --color $l[1] --description $l[2] | Out-Null
  Write-Host "label created: $($l[0])"
  Start-Sleep -Milliseconds $SleepMs
}

# ---------- parse phases ----------
$files = Get-ChildItem $phaseDir -Filter '*.md' | Where-Object { $_.Name -match '^phase-\d\d-' } | Sort-Object Name
$phases = @()
foreach ($f in $files) {
  $lines = Get-Content $f.FullName -Encoding UTF8
  if ($lines[0] -notmatch '^#\s+Phase\s+(\d+):\s*(.+?)\s*$') { Write-Warning "no heading in $($f.Name)"; continue }
  $n = [int]$Matches[1]; $name = $Matches[2]
  $milestone = "P$n $name"
  $head = ($lines | Select-Object -First 6) -join "`n"
  if ($head -match '\*\*Milestone:\*\*\s*`([^`]+)`') { $milestone = $Matches[1] }
  $critical = $head -match '\*\*Contest critical:\*\*\s*yes'
  $subs = @(); $cur = $null
  foreach ($line in $lines) {
    if ($line -match '^##\s+(P\d+\.\d+\s+.+?)\s*$') {
      $cur = @{ Title = $Matches[1]; Acceptance = $null; Tasks = @() }; $subs += $cur; continue
    }
    if ($line -match '^##\s') { $cur = $null; continue }
    if ($cur) {
      if ($line -match '^Acceptance:') { $cur.Acceptance = $line }
      elseif ($line -match '^- \[[ xX]\] P\d+\.\d+\.\d+') { $cur.Tasks += ($line -replace '^- \[[xX]\]', '- [ ]') }
    }
  }
  $phases += @{ N = $n; Name = $name; Milestone = $milestone; Critical = $critical; File = $f.Name; Subs = $subs }
}

# ---------- milestones ----------
$msExisting = @()
try { $msExisting = @(Invoke-Gh api "repos/$Repo/milestones?state=all&per_page=100" --jq '.[].title') } catch { Write-Warning $_ }
foreach ($p in $phases) {
  if ($msExisting -contains $p.Milestone) { Write-Host "milestone exists: $($p.Milestone)"; continue }
  $desc = "Phase $($p.N): see plan/phases/$($p.File)"
  if ($DryRun) { Write-Host "[dry] milestone create $($p.Milestone)"; continue }
  Invoke-Gh api "repos/$Repo/milestones" -X POST -f "title=$($p.Milestone)" -f "description=$desc" | Out-Null
  Write-Host "milestone created: $($p.Milestone)"
  Start-Sleep -Milliseconds $SleepMs
}

# ---------- issues ----------
$issueTitles = @()
try { $issueTitles = @(Invoke-Gh issue list --repo $Repo --state all --limit 500 --json title --jq '.[].title') } catch { Write-Warning $_ }
$created = 0; $skipped = 0
foreach ($p in $phases) {
  foreach ($s in $p.Subs) {
    if ($issueTitles -contains $s.Title) { $skipped++; Write-Host "issue exists: $($s.Title)"; continue }
    $body = "Phase file: [plan/phases/$($p.File)](https://github.com/$Repo/blob/main/plan/phases/$($p.File))`n`n"
    if ($s.Acceptance) { $body += "$($s.Acceptance)`n`n" }
    $body += "### Tasks`n" + ($s.Tasks -join "`n") + "`n"
    $lab = "phase:P$($p.N)"
    if ($p.Critical) { $lab += ',contest-critical' }
    if ($DryRun) { Write-Host "[dry] issue '$($s.Title)' milestone='$($p.Milestone)' labels=$lab tasks=$($s.Tasks.Count)"; continue }
    $tmp = [System.IO.Path]::GetTempFileName()
    try {
      [System.IO.File]::WriteAllText($tmp, $body, $utf8)
      $url = (Invoke-Gh issue create --repo $Repo --title $s.Title --body-file $tmp --milestone $p.Milestone --label $lab | Select-Object -Last 1)
    } finally { Remove-Item $tmp -ErrorAction SilentlyContinue }
    $created++
    Write-Host "issue created: $($s.Title) -> $url"
    if ($ProjectOwner -and $ProjectNumber -gt 0) {
      Invoke-Gh project item-add $ProjectNumber --owner $ProjectOwner --url "$url" | Out-Null
    }
    Start-Sleep -Milliseconds $SleepMs
  }
}
Write-Host "Done. issues created=$created skipped(existing)=$skipped dryRun=$($DryRun.IsPresent)"

