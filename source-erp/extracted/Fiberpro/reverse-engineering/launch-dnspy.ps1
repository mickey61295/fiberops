param(
    [switch]$IncludeVendorAssemblies,
    [string]$RootPath = (Split-Path -Parent $PSScriptRoot)
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-DnSpyPath {
    $wingetRoot = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages"
    $wingetMatch = Get-ChildItem -Path $wingetRoot -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like "dnSpyEx.dnSpy*" } |
        Select-Object -First 1

    if ($wingetMatch) {
        $candidate = Join-Path $wingetMatch.FullName "dnSpy.exe"
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    $command = Get-Command dnspy -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    throw "dnSpy.exe was not found. Install dnSpyEx first or update this script."
}

$assemblyNames = @(
    "Fiberpro.exe",
    "GReportConfig.dll",
    "Fiberpro Library.dll",
    "Fiberpro_ReportLibrary.dll",
    "CustomFlexGrid.dll"
)

if ($IncludeVendorAssemblies) {
    $assemblyNames += @(
        "Newtonsoft.Json.dll",
        "log4net.dll",
        "Stimulsoft.Report.dll",
        "Stimulsoft.Report.Win.dll"
    )
}

$assemblyPaths = @($assemblyNames |
    ForEach-Object { Join-Path $RootPath $_ } |
    Where-Object { Test-Path $_ })

if ($assemblyPaths.Count -eq 0) {
    throw "No target assemblies were found under $RootPath"
}

$dnSpyPath = Resolve-DnSpyPath
Start-Process -FilePath $dnSpyPath -ArgumentList $assemblyPaths

Write-Host "Launched dnSpy with $($assemblyPaths.Count) assemblies."