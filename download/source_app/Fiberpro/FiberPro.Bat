@echo off
@echo Please Wait Updation is in Progress,DONT Close.,
%systemroot%\System32\xcopy "\\ACCOUNTS\Global\FiberPro\Fiberpro.exe" "%cd%\Fiberpro.exe" /d/y
%systemroot%\System32\xcopy "\\ACCOUNTS\Global\FiberPro\report" "%cd%\report" /d/y
%systemroot%\System32\xcopy "\\ACCOUNTS\Global\FiberPro\Fiberpro Library.dll" "%cd%\Fiberpro Library.dll" /d/y
%systemroot%\System32\xcopy "\\ACCOUNTS\Global\FiberPro\Fiberpro_ReportLibrary.dll" "%cd%\Fiberpro_ReportLibrary.dll" /d/y
%systemroot%\System32\xcopy "\\ACCOUNTS\Global\FiberPro\preprint\298" "%cd%\preprint\298" /d/y
%systemroot%\System32\xcopy "\\ACCOUNTS\Global\FiberPro\SPFunction" "%cd%\SPFunction" /d/y
%systemroot%\System32\xcopy "\\ACCOUNTS\Global\FiberPro\SPQuery" "%cd%\SPQuery" /d/y
%systemroot%\System32\xcopy "\\ACCOUNTS\Global\FiberPro\GReportConfig.dll" "%cd%\GReportConfig.dll" /d/y
%systemroot%\System32\xcopy "\\ACCOUNTS\Global\FiberPro\SPTriggers" "%cd%\SPTriggers" /d/y
%systemroot%\System32\xcopy "\\ACCOUNTS\Global\FiberPro\SPTriggers\SpViews" "%cd%\SPTriggers\Spviews" /d/y
%systemroot%\System32\xcopy "\\ACCOUNTS\Global\FiberPro\FiberPro.bat" "%cd%\FiberPro.bat" /d/y
%systemroot%\System32\xcopy "\\ACCOUNTS\Global\FiberPro\zxing.dll" "%cd%\zxing.dll" /d/y
%systemroot%\System32\xcopy "\\ACCOUNTS\Global\FiberPro\AxInterop.AcroPDFLib.dll" "%cd%\AxInterop.AcroPDFLib.dll" /d/y
%systemroot%\System32\xcopy "\\ACCOUNTS\Global\FiberPro\Interop.AcroPDFLib.dll" "%cd%\Interop.AcroPDFLib.dll" /d/y
%systemroot%\System32\xcopy "\\ACCOUNTS\Global\FiberPro\Interop.Excel.dll" "%cd%\Interop.Excel.dll" /d/y
%systemroot%\System32\xcopy "\\ACCOUNTS\Global\FiberPro\MessagingToolkit.Barcode.dll" "%cd%\MessagingToolkit.Barcode.dll" /d/y
@echo Updation Task Completed.
"%cd%\Fiberpro.exe" /d/y