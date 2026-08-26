/*                  
;=============================================                  
; Author  :  Global Software's                  
; Create date  :  03/FEB/2026                  
; Create By  :  ASLAM                  
; Description  :  View for INPUT GST
; Change Person  :  ASLAM               
; Last Change Date :  03/Feb/2026 11.20 AM                  
; =============================================   */  
 CREATE View Vue_InputGST AS

  Select Distinct X.ID, X.PId,X.PartyName,X.coycode,X.Expr2,X.BillType,X.billno,X.brdt,X.billdt,X.brno,IsNull(Sum(X.SGSTValue),0) As SGSTValue,IsNull(Sum(X.CGSTValue),0) As CGSTValue,IsNull(Sum(X.IGSTValue),0) As IGSTValue,IsNull(Sum(X.SGSTAmt),0) As SGSTAmt,IsNull(Sum
(X.CGSTAmt),0) CGSTAmt,IsNull(Sum(X.IGSTAmt),0) As IGSTAmt,X.ExporterName,X.billamt,X.ERN,ISnull(Sum(X.Others),0) as Others From (


SELECT DISTINCT Trs_Bills.Id, Mas_Party.PId,RTRIM(dbo.Mas_Party.Pname) AS PartyName, dbo.Trs_Bills.coycode, RTRIM(dbo.Trs_Bills.brno) + '/'+ RTRIM(dbo.Trs_Bills.finyear) AS 
Expr2,dbo.Trs_Bills.BillType,dbo.Trs_Bills.billno,dbo.Trs_Bills.brdt,dbo.Trs_Bills.billdt,dbo.Trs_Bills.brno,
 dbo.Trs_BillAddded.Valu As SGSTValue,0 As CGSTValue,0 As IGSTValue,dbo.Trs_BillAddded.amt As SGSTAmt,0 As CGSTAmt,0 As IGSTAmt,dbo.Mas_Exporter.ExporterName,dbo.Trs_Bills.billamt,IsNull(Trs_Bills.ERN,'') As ERN,0 as Others FROM dbo.Trs_Bills INNER JOIN  dbo.Mas_Exporter ON dbo.Trs_Bills.coycode = dbo.Mas_Exporter.ExpID INNER JOIN dbo.Mas_Party ON dbo.Trs_Bills.party = dbo.Mas_Party.PID INNER JOIN dbo.Trs_BillAddded ON dbo.Trs_Bills.ID = dbo.Trs_BillAddded.ID INNER JOIN  dbo.Mas_AddDed ON dbo.Trs_BillAddded.Adddedcode = dbo.Mas_AddDed.AddDedCode WHERE (dbo.Mas_AddDed.AddDedName = 'SGST') And IsNull(GSTBill,'N')='Y'

 Union All SELECT DISTINCT Trs_Bills.Id,Mas_Party.PId,RTRIM(dbo.Mas_Party.Pname) AS PartyName, dbo.Trs_Bills.coycode, RTRIM(dbo.Trs_Bills.brno) + '/' + RTRIM(dbo.Trs_Bills.finyear) AS Expr2,dbo.Trs_Bills.BillType,dbo.Trs_Bills.billno,dbo.Trs_Bills.brdt,dbo.Trs_Bills.billdt,dbo.Trs_Bills.brno,0 As SGSTValue,dbo.Trs_BillAddded.Valu As CGSTValue,0 As IGSTValue,0 As SGSTAmt,dbo.Trs_BillAddded.amt As CGSTAmt,0 As IGSTAmt,dbo.Mas_Exporter.ExporterName,dbo.Trs_Bills.billamt,IsNull(Trs_Bills.ERN,'') As ERN,0 as Others FROM dbo.Trs_Bills 
INNER JOIN  dbo.Mas_Exporter ON dbo.Trs_Bills.coycode = dbo.Mas_Exporter.ExpID INNER JOIN dbo.Mas_Party ON dbo.Trs_Bills.party = dbo.Mas_Party.PID INNER JOIN dbo.Trs_BillAddded ON dbo.Trs_Bills.ID = dbo.Trs_BillAddded.ID INNER JOIN  dbo.Mas_AddDed ON dbo.
Trs_BillAddded.Adddedcode = dbo.Mas_AddDed.AddDedCode WHERE (dbo.Mas_AddDed.AddDedName = 'CGST') And IsNull(GSTBill,'N')='Y' 

Union All SELECT DISTINCT Trs_Bills.Id,Mas_Party.PId,RTRIM(dbo.Mas_Party.Pname) AS PartyName, dbo.Trs_Bills.coycode, RTRIM(dbo.Trs_Bills.brno) 
+ '/' + RTRIM(dbo.Trs_Bills.finyear) AS Expr2,dbo.Trs_Bills.BillType,dbo.Trs_Bills.billno,dbo.Trs_Bills.brdt,dbo.Trs_Bills.billdt,dbo.Trs_Bills.brno,0 As SGSTValue,0 As CGSTValue,dbo.Trs_BillAddded.Valu As IGSTValue,0 As SGSTAmt,0 As CGSTAmt,dbo.Trs_BillAddded.amt As IGSTAmt,dbo.Mas_Exporter.ExporterName,dbo.Trs_Bills.billamt,IsNull(Trs_Bills.ERN,'') As ERN,0 as Others FROM dbo.Trs_Bills INNER JOIN  dbo.Mas_Exporter ON dbo.Trs_Bills.coycode = dbo.Mas_Exporter.ExpID INNER JOIN dbo.Mas_Party ON dbo.Trs_Bills.party = dbo.Mas_Party.PID INNER JOIN dbo.Trs_BillAddded ON dbo.Trs_Bills.ID = dbo.Trs_BillAddded.ID INNER JOIN  dbo.Mas_AddDed ON dbo.Trs_BillAddded.Adddedcode = dbo.Mas_AddDed.AddDedCode WHERE 
(dbo.Mas_AddDed.AddDedName = 'IGST') And IsNull(GSTBill,'N')='Y'
UNION ALL
SELECT Distinct Trs_Bills.Id,Mas_Party.PId,RTRIM(dbo.Mas_Party.Pname) AS PartyName, dbo.Trs_Bills.coycode, RTRIM(dbo.Trs_Bills.brno) 
+ '/' + RTRIM(dbo.Trs_Bills.finyear) AS Expr2,dbo.Trs_Bills.BillType,dbo.Trs_Bills.billno,dbo.Trs_Bills.brdt,dbo.Trs_Bills.billdt,dbo.Trs_Bills.brno,0 As SGSTValue,0 As CGSTValue,0 As IGSTValue,0 As SGSTAmt,0 As CGSTAmt,0 As IGSTAmt,dbo.Mas_Exporter.ExporterName,dbo.Trs_Bills.billamt,IsNull(Trs_Bills.ERN,'') As ERN,Trs_BillAddded.amt As Others FROM dbo.Trs_Bills INNER JOIN  dbo.Mas_Exporter ON dbo.Trs_Bills.coycode = dbo.Mas_Exporter.ExpID INNER JOIN dbo.Mas_Party ON dbo.Trs_Bills.party = dbo.Mas_Party.PID INNER JOIN dbo.Trs_BillAddded ON dbo.Trs_Bills.ID = dbo.Trs_BillAddded.ID  WHERE (Trs_BillAddded.Adddedcode not in (1,2,40,41,42)) And IsNull(GSTBill,'N')='Y' 

) X  Group By X.PId,X.PartyName,X.coycode,X.Expr2,X.BillType,X.billno,X.brdt,X.billdt,X.brno,X.ExporterName,X.billamt,X.ERN,X.ID
 