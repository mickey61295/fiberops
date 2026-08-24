/*                  
;=============================================                  
; Author  :  Global Software's                  
; Create date  :  30/JAN/2026                  
; Create By  :  ASLAM                  
; Description  :  Stored Procedure for CDaily Costing Input
; Change Person  :  ASLAM                
; Last Change Date :  30/Jan/2026 11.20 AM                  
; =============================================   */  
 CREATE VIEW Vue_DailyCostingInputData AS
Select A.EntryDt,A.coycode, B.ExpId, B.Amount,C.Exp_Level,0 as DeptId,0 as LineId ,0 as Ordid,'' as Styleno ,ShiftWageExp from Trs_DailyPrdn_Costing1 A INNER JOIN Trs_DailyPrdn_Costing2  B ON A.ID = B.ID INNER JOIN Mas_Expenses C ON B.ExpId = C.ExpId 
UNION 
Select A.EntryDt,A.coycode,B.ExpId,B.Amount,C.Exp_Level ,B.DeptId ,0 as LineId ,0 as Ordid,'' as Styleno,ShiftWageExp   from Trs_DailyPrdn_Costing1 A INNER JOIN Trs_DailyPrdn_Costing3  B ON A.ID = B.ID INNER JOIN Mas_Expenses C ON B.ExpId = C.ExpId 
UNION 
Select A.EntryDt,A.coycode,B.ExpId,B.Amount,C.Exp_Level ,D.Stitching_DeptCode as DeptID  ,B.LineId ,0 as Ordid,'' as Styleno ,ShiftWageExp  from Trs_DailyPrdn_Costing1 A INNER JOIN Trs_DailyPrdn_Costing4  B ON A.ID = B.ID INNER JOIN Mas_Expenses C ON B.ExpId = C.ExpId Cross join Options D
UNION 
Select A.EntryDt,A.coycode,B.ExpId,B.Amount,C.Exp_Level ,0 as DeptId ,0 as LineId ,B.Ordid,B.Styleno as Styleno ,ShiftWageExp  from Trs_DailyPrdn_Costing1 A INNER JOIN Trs_DailyPrdn_Costing5  B ON A.ID = B.ID INNER JOIN Mas_Expenses C ON B.ExpId = C.ExpId INNER JOIN OrderMas ON B.Ordid = OrderMas.OrdId INNER JOIN OrderStyleDtl E ON OrderMas.OrdId = E.OrdID And B.Ordid = E.OrdID And B.Styleno = E.StyleNo