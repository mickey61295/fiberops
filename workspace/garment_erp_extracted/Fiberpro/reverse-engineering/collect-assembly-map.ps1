param(
    [string]$RootPath = (Split-Path -Parent $PSScriptRoot),
    [string]$OutputPath = (Join-Path $PSScriptRoot "output")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:ReflectionOnlyCache = @{}

$targets = @(
    [PSCustomObject]@{ Name = "Fiberpro.exe"; Role = "Main ERP client"; Priority = 1 },
    [PSCustomObject]@{ Name = "GReportConfig.dll"; Role = "Reporting and dataset layer"; Priority = 2 },
    [PSCustomObject]@{ Name = "Fiberpro Library.dll"; Role = "Shared business library"; Priority = 3 },
    [PSCustomObject]@{ Name = "Fiberpro_ReportLibrary.dll"; Role = "Reporting helper library"; Priority = 4 },
    [PSCustomObject]@{ Name = "CustomFlexGrid.dll"; Role = "Custom UI grid control"; Priority = 5 },
    [PSCustomObject]@{ Name = "Fiberpro_Lib.dll"; Role = "Native or COM helper"; Priority = 6 }
)

function Get-AttributeValue {
    param(
        [System.Reflection.Assembly]$Assembly,
        [string]$AttributeTypeName
    )

    $attribute = $Assembly.CustomAttributes |
        Where-Object { $_.AttributeType.FullName -eq $AttributeTypeName } |
        Select-Object -First 1

    if ($null -eq $attribute) {
        return ""
    }

    if ($attribute.ConstructorArguments.Count -eq 0) {
        return ""
    }

    return [string]$attribute.ConstructorArguments[0].Value
}

function Get-ManagedAssemblyRecord {
    param(
        [string]$Path,
        [pscustomobject]$Target
    )

    $assemblyName = [System.Reflection.AssemblyName]::GetAssemblyName($Path)
    $reflectionAssembly = [System.Reflection.Assembly]::ReflectionOnlyLoadFrom($Path)

    $resolvedTypes = @()
    $loaderExceptions = @()
    try {
        $resolvedTypes = @($reflectionAssembly.GetTypes())
    }
    catch [System.Reflection.ReflectionTypeLoadException] {
        $resolvedTypes = @($_.Exception.Types | Where-Object { $null -ne $_ })
        $loaderExceptions = @($_.Exception.LoaderExceptions | ForEach-Object { $_.Message } | Select-Object -Unique)
    }

    $topLevelTypes = @($resolvedTypes | Where-Object {
        $_.FullName -and $_.FullName -notmatch "\+"
    })

    $candidateForms = @($resolvedTypes |
        Where-Object { $_.FullName -match "\.((frm|Frm)[^+]+)" } |
        ForEach-Object {
            if ($_.FullName -match "^(.*?\.(frm|Frm)[^+]+)") {
                $matches[1]
            }
        } |
        Where-Object { $_ } |
        Sort-Object -Unique)

    $topNamespaces = @($resolvedTypes |
        Where-Object { $_.Namespace } |
        Group-Object Namespace |
        Sort-Object Count -Descending |
        Select-Object -First 15 |
        ForEach-Object { [PSCustomObject]@{ Namespace = $_.Name; Count = $_.Count } })

    $referencedAssemblies = @($reflectionAssembly.GetReferencedAssemblies() |
        Sort-Object Name |
        Select-Object -ExpandProperty Name)

    return [PSCustomObject]@{
        File = $Target.Name
        Role = $Target.Role
        Priority = $Target.Priority
        Status = "Managed"
        FullName = $assemblyName.FullName
        Version = $assemblyName.Version.ToString()
        Company = Get-AttributeValue -Assembly $reflectionAssembly -AttributeTypeName "System.Reflection.AssemblyCompanyAttribute"
        Product = Get-AttributeValue -Assembly $reflectionAssembly -AttributeTypeName "System.Reflection.AssemblyProductAttribute"
        TypeCount = $resolvedTypes.Count
        TopLevelTypeCount = $topLevelTypes.Count
        CandidateForms = $candidateForms
        CandidateFormCount = $candidateForms.Count
        TopNamespaces = $topNamespaces
        ReferencedAssemblies = $referencedAssemblies
        LoaderExceptionCount = $loaderExceptions.Count
        LoaderExceptionsSample = @($loaderExceptions | Select-Object -First 10)
    }
}

function Get-AssemblyRecord {
    param(
        [pscustomobject]$Target,
        [string]$Root
    )

    $path = Join-Path $Root $Target.Name
    if (-not (Test-Path $path)) {
        return [PSCustomObject]@{
            File = $Target.Name
            Role = $Target.Role
            Priority = $Target.Priority
            Status = "Missing"
            FullName = ""
            Version = ""
            Company = ""
            Product = ""
            TypeCount = 0
            TopLevelTypeCount = 0
            CandidateForms = @()
            CandidateFormCount = 0
            TopNamespaces = @()
            ReferencedAssemblies = @()
            LoaderExceptionCount = 0
            LoaderExceptionsSample = @("File not found")
        }
    }

    try {
        return Get-ManagedAssemblyRecord -Path $path -Target $Target
    }
    catch {
        return [PSCustomObject]@{
            File = $Target.Name
            Role = $Target.Role
            Priority = $Target.Priority
            Status = "NativeOrUnsupported"
            FullName = ""
            Version = ""
            Company = ""
            Product = ""
            TypeCount = 0
            TopLevelTypeCount = 0
            CandidateForms = @()
            CandidateFormCount = 0
            TopNamespaces = @()
            ReferencedAssemblies = @()
            LoaderExceptionCount = 1
            LoaderExceptionsSample = @($_.Exception.Message)
        }
    }
}

[System.AppDomain]::CurrentDomain.add_ReflectionOnlyAssemblyResolve({
    param($sender, $eventArgs)

    if ($script:ReflectionOnlyCache.ContainsKey($eventArgs.Name)) {
        return $script:ReflectionOnlyCache[$eventArgs.Name]
    }

    try {
        $resolved = [System.Reflection.Assembly]::ReflectionOnlyLoad($eventArgs.Name)
        $script:ReflectionOnlyCache[$eventArgs.Name] = $resolved
        return $resolved
    }
    catch {
    }

    $requestedName = New-Object System.Reflection.AssemblyName($eventArgs.Name)
    foreach ($extension in @(".dll", ".exe")) {
        $candidatePath = Join-Path $RootPath ($requestedName.Name + $extension)
        if (Test-Path $candidatePath) {
            try {
                $resolved = [System.Reflection.Assembly]::ReflectionOnlyLoadFrom($candidatePath)
                $script:ReflectionOnlyCache[$eventArgs.Name] = $resolved
                return $resolved
            }
            catch {
            }
        }
    }

    return $null
})

if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath | Out-Null
}

$records = @($targets | Sort-Object Priority | ForEach-Object {
    Get-AssemblyRecord -Target $_ -Root $RootPath
})

$jsonPath = Join-Path $OutputPath "assembly-map.json"
$markdownPath = Join-Path $OutputPath "assembly-map.md"
$formsPath = Join-Path $OutputPath "candidate-forms.txt"

$records | ConvertTo-Json -Depth 6 | Set-Content -Path $jsonPath

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("# FiberPro Reverse Engineering Map")
$lines.Add("")
$lines.Add("Generated: $(Get-Date -Format s)")
$lines.Add("")
$lines.Add("## Priority Targets")
$lines.Add("")
$lines.Add("| Priority | File | Role | Status | Types | Candidate Forms |")
$lines.Add("| --- | --- | --- | --- | ---: | ---: |")
foreach ($record in ($records | Sort-Object Priority)) {
    $lines.Add("| $($record.Priority) | $($record.File) | $($record.Role) | $($record.Status) | $($record.TypeCount) | $($record.CandidateFormCount) |")
}

foreach ($record in ($records | Sort-Object Priority)) {
    $lines.Add("")
    $lines.Add("## $($record.File)")
    $lines.Add("")
    $lines.Add("- Role: $($record.Role)")
    $lines.Add("- Status: $($record.Status)")
    if ($record.FullName) {
        $lines.Add("- Assembly: $($record.FullName)")
    }
    if ($record.Company) {
        $lines.Add("- Company: $($record.Company)")
    }
    if ($record.Product) {
        $lines.Add("- Product: $($record.Product)")
    }
    $lines.Add("- Types recovered: $($record.TypeCount)")
    $lines.Add("- Top-level types: $($record.TopLevelTypeCount)")
    $lines.Add("- Candidate forms: $($record.CandidateFormCount)")

    if ($record.TopNamespaces.Count -gt 0) {
        $lines.Add("- Top namespaces:")
        foreach ($namespace in $record.TopNamespaces) {
            $lines.Add("  - $($namespace.Namespace) ($($namespace.Count))")
        }
    }

    if ($record.CandidateForms.Count -gt 0) {
        $lines.Add("- Candidate forms:")
        foreach ($formName in ($record.CandidateForms | Select-Object -First 50)) {
            $lines.Add("  - $formName")
        }
    }

    if ($record.ReferencedAssemblies.Count -gt 0) {
        $lines.Add("- Referenced assemblies:")
        foreach ($reference in ($record.ReferencedAssemblies | Select-Object -First 40)) {
            $lines.Add("  - $reference")
        }
    }

    if ($record.LoaderExceptionsSample.Count -gt 0) {
        $lines.Add("- Loader exception sample:")
        foreach ($message in $record.LoaderExceptionsSample) {
            $lines.Add("  - $message")
        }
    }
}

$lines | Set-Content -Path $markdownPath

$allCandidateForms = @($records |
    ForEach-Object { $_.CandidateForms } |
    Where-Object { $_ } |
    Sort-Object -Unique)

$allCandidateForms | Set-Content -Path $formsPath

Write-Host "Wrote: $jsonPath"
Write-Host "Wrote: $markdownPath"
Write-Host "Wrote: $formsPath"