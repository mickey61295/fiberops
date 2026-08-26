# FiberPro reverse-engineering workspace

This folder is the starting point for reversing the ERP without manually clicking through every assembly in dnSpy.

## What is here

- `collect-assembly-map.ps1`: scans the application-owned binaries, identifies managed vs native modules, and exports a first-pass assembly map.
- `launch-dnspy.ps1`: opens dnSpyEx with the main ERP assemblies already loaded.
- `output/`: generated metadata for prioritizing analysis.

## Current findings

- `Fiberpro.exe` is the main ERP client and contains the bulk of the UI flow.
- `GReportConfig.dll` is a very large managed assembly focused on reporting and typed datasets.
- `Fiberpro Library.dll` and `Fiberpro_ReportLibrary.dll` are smaller helper libraries.
- `CustomFlexGrid.dll` is a custom control library.
- `Fiberpro_Lib.dll` is not a normal managed .NET assembly and should be treated as native or COM until proven otherwise.
- The application is database-heavy. `Fiberpro.exe.config` contains multiple SQL Server connection strings and environment-specific database names.

## How to use it

1. Run `powershell -ExecutionPolicy Bypass -File .\reverse-engineering\collect-assembly-map.ps1`
2. Review `reverse-engineering\output\assembly-map.md`
3. Launch dnSpy with `powershell -ExecutionPolicy Bypass -File .\reverse-engineering\launch-dnspy.ps1`

## What to inspect first in dnSpy

1. `Fiberpro.exe`
2. `GReportConfig.dll`
3. `Fiberpro Library.dll`
4. `Fiberpro_ReportLibrary.dll`

## Suggested analysis order

1. Start from `Fiberpro.My.MyProject` and the application startup path.
2. Identify top-level forms from the generated `candidate-forms.txt` list.
3. Trace database access classes and typed dataset adapters in `GReportConfig.dll`.
4. Map report names in the `Report/` folder back to the code paths that invoke them.