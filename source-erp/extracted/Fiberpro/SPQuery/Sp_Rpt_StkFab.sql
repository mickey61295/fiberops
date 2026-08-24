 /*                  

;=============================================                  

; Author  :  Global Software's                  

; Create date  :  01/Nov/2019                  

; Create By  :  ASLAM                  

; Description  :  Stored Procedure for Posting the Production Details for commando cloud

; Change Person  :  ASLAM                

; Last Change Date :  10/Jan/2024 9.10 AM                  

; =============================================   */ 



 CREATE PROCEDURE Sp_Rpt_StkFab AS Begin DECLARE @SQLSTR AS NVARCHAR(4000) SET @SQLSTR=N'SELECT     TOP 100 PERCENT dbo.Temp_StkReports.ExporterName, dbo.Temp_StkReports.OrdId, dbo.Temp_StkReports.BuyerOrdNo, dbo.Temp_StkReports.DeptName, dbo.Temp_StkReports.CountName, dbo.Temp_StkReports.Color, dbo.Temp_StkReports.Fabric,  dbo.Temp_StkReports.Dia, dbo.Temp_StkReports.GSM, dbo.Temp_StkReports.GG, dbo.Temp_StkReports.LL, dbo.Temp_StkReports.StkBg,  dbo.Temp_StkReports.StkKgs, dbo.Temp_StkReports.StkMtr,   dbo.Temp_StkReports.UOM, dbo.Temp_StkReports.Lotno, dbo.OrderMas.Jobno,  dbo.OrderMas.Finyear, dbo.Temp_StkReports.Rate,   dbo.Options.CostCalc, dbo.Mas_Dept.DeptID,dbo.Temp_StkReports.GodownName,DesignDesc,Temp_StkReports.FinGSM,isNull(Temp_StkReports.SubProcess,'''') as SubProcess,FabricGroupName  FROM  dbo.Temp_StkReports INNER JOIN dbo.OrderMas ON dbo.Temp_StkReports.OrdId = dbo.OrderMas.OrdId LEFT JOIN dbo.Mas_Dept ON dbo.Temp_StkReports.DeptName = dbo.Mas_Dept.Deptname left outer join dbo.mas_fabric on dbo.Temp_StkReports.fabid =dbo.mas_fabric.FabID LEFT OUTER JOIN Mas_FabricGroup ON Mas_FabricGroup.id =mas_fabric.Fabgrpid  CROSS JOIN dbo.Options ORDER BY dbo.Mas_Dept.DeptID  '   EXEC SP_EXECUTESQL @SQLSTR END  