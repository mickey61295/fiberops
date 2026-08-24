/*;=============================================   
; Author           :  Global Software's    
; Create date      :  14/11/2025    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  14/11/2025 10.05 AM 
; =============================================  */  
CREATE View Vue_YarnProgBalDetail_N AS 

SELECT 'Req' as Type,Pro_ReqYarn.OrdId,Mas_Dept.DeptID , Mas_Dept.Deptname, Mas_Dept.OrderSno, Mas_Count.CountName, ISNULL(Mas_Color.ColorDesc, '') AS ColorDesc, SUM(Pro_ReqYarn.ReqKgs) AS ReqKgs,0 as PoKgs,0 as RecKgs, 0 as ProgKgs,0 As TransInKgs,0 As TransOutKgs,0 as openingkgs,isNull(Mas_Count.CountID,0) as CountID, isNull(Mas_Color.ColID,0) as ColId FROM Pro_ReqYarn INNER JOIN Mas_Dept ON Pro_ReqYarn.DeptId = Mas_Dept.DeptID INNER JOIN Mas_Count ON Pro_ReqYarn.CountId = Mas_Count.CountID LEFT OUTER JOIN Mas_Color ON Pro_ReqYarn.ColId = Mas_Color.ColID GROUP BY Pro_ReqYarn.OrdId, Mas_Dept.DeptID,Mas_Dept.Deptname, Mas_Dept.OrderSno, Mas_Count.CountName, ISNULL(Mas_Color.ColorDesc, ''),isNull(Mas_Count.CountID,0) , isNull(Mas_Color.ColID,0)

 UNION ALL 
 
 SELECT 'PO' as Type, Trs_Po2.OrdID,Mas_Dept.DeptID, Mas_Dept.Deptname, Mas_Dept.OrderSno, Mas_Count.CountName,ISNULL(Mas_Color.ColorDesc, '') AS ColorDesc,0 as ReqKgs, SUM(Trs_Po2.PoQty-CancelKgs) AS PoQty,0 as RecKgs, 0 as ProgKgs,0 As TransInKgs,0 As TransOutKgs,0 as openingkgs,isNull(Mas_Count.CountID,0) as CountID, isNull(Mas_Color.ColID,0) as ColId  FROM Trs_Po2 INNER JOIN Trs_Po1 ON Trs_Po2.ID = Trs_Po1.ID INNER JOIN Mas_Dept ON Trs_Po1.Dept =Mas_Dept.DeptID INNER JOIN Mas_Count ON Trs_Po2.CntId = Mas_Count.CountID INNER JOIN  Mas_Color ON Trs_Po2.ClrId = Mas_Color.ColID WHERE Mas_Dept.OutputType='Y' GROUP BY Trs_Po2.OrdID,Mas_Dept.DeptID, Mas_Dept.Deptname, Mas_Dept.OrderSno, Mas_Count.CountName, ISNULL(Mas_Color.ColorDesc, '') ,isNull(Mas_Count.CountID,0) , isNull(Mas_Color.ColID,0)
 
 UNION ALL 
 
 SELECT 'Grn' as Type,Trs_Grn2.OrdID, Mas_Dept.DeptID,Mas_Dept.Deptname, Mas_Dept.OrderSno,Mas_Count.CountName, ISNULL(Mas_Color.ColorDesc, '') as ColorDesc,0 as ReqKgs,0 as PoKgs, 
SUM(Trs_GRN2.RecKgs) AS RecKgs, 0 as ProgKgs,0 As TransInKgs,0 As TransOutKgs,0 as openingkgs ,isNull(Mas_Count.CountID,0) as CountID, isNull(Mas_Color.ColID,0) as ColId  FROM Trs_Grn1 INNER JOIN Trs_GRN2 ON Trs_Grn1.ID =Trs_GRN2.ID INNER JOIN StockTable ON Trs_GRN2.StockID = StockTable.StockID INNER JOIN Mas_Dept ON Trs_Grn1.Dept = Mas_Dept.DeptID LEFT OUTER JOIN Mas_Color ON StockTable.ColID = Mas_Color.ColID INNER JOIN Mas_Count ON StockTable.CntID = Mas_Count.CountID WHERE Mas_Dept.OutputType = 'Y' GROUP BY  Trs_Grn2.OrdID, Mas_Dept.DeptID ,Mas_Dept.Deptname, Mas_Dept.OrderSno, Mas_Count.CountName, ISNULL(Mas_Color.ColorDesc, '')  ,isNull(Mas_Count.CountID,0) , isNull(Mas_Color.ColID,0)

UNION ALL 
SELECT 'Trans' as Type, Trs_Del2.TranOrdID AS OrdID,Mas_Dept.DeptID, Mas_Dept.Deptname, Mas_Dept.OrderSno, Mas_Count.CountName, ISNULL(Mas_Color.ColorDesc, '') AS ColorDesc,0 as ReqKgs,0 as PoKgs, SUM(Trs_Del2.Kg) AS RecKgs, 0 as ProgKgs,0 As TransInKgs,0 As TransOutKgs,0 as openingkgs,isNull(Mas_Count.CountID,0) as CountID, isNull(Mas_Color.ColID,0) as ColId  FROM StockTable INNER JOIN Mas_Count ON StockTable.CntID = Mas_Count.CountID INNER JOIN Trs_Del2 ON StockTable.StockID = Trs_Del2.StockID INNER JOIN Trs_Del1 ON Trs_Del2.ID = Trs_Del1.ID INNER JOIN Mas_Dept ON Trs_Del1.Prs_Dept = Mas_Dept.DeptID LEFT OUTER JOIN Mas_Color ON StockTable.ColID = Mas_Color.ColID WHERE Mas_Dept.OutputType = 'Y' AND Trs_Del1.TrType = 3 GROUP BY Trs_Del2.TranOrdID, Mas_Dept.DeptID
, Mas_Dept.Deptname, Mas_Dept.OrderSno, Mas_Count.CountName,ISNULL(Mas_Color.ColorDesc, '') ,isNull(Mas_Count.CountID,0) , isNull(Mas_Color.ColID,0)
UNION ALL   
SELECT 'TransIn' as Type, Trs_Del2.TranOrdID AS OrdID,Mas_Dept.DeptID, Mas_Dept.Deptname, Mas_Dept.OrderSno, Mas_Count.CountName, ISNULL(Mas_Color.ColorDesc, '') AS ColorDesc,0 as ReqKgs,0 as PoKgs, 0 AS RecKgs, 0 as ProgKgs,IsNull(Kg,0) As TransInKgs,0 As TransOutKgs,0 as openingkgs ,isNull(Mas_Count.CountID,0) as CountID, isNull(Mas_Color.ColID,0) as ColId FROM  Trs_Del1 INNER JOIN Trs_Del2 ON Trs_DEl1.ID=TRs_Del2.ID INNER JOIN StockTable ON StockTable.StockID=Trs_Del2.TranID INNER JOIN Mas_Dept ON Mas_Dept.DeptID=StockTable.Dept  INNER JOIN Mas_Count ON Mas_Count.CountID=StockTable.CntID INNER JOIN Mas_Color ON Mas_Color.ColID=StockTable.ColID WHERE Mas_Dept.OutputType = 'Y' AND Trs_Del1.TrType = 3 GROUP BY Trs_Del2.TranOrdID, Mas_Dept.DeptID, Mas_Dept.Deptname, Mas_Dept.OrderSno, Mas_Count.CountName,ISNULL(Mas_Color.ColorDesc, ''),Trs_Del2.Kg 
,isNull(Mas_Count.CountID,0) , isNull(Mas_Color.ColID,0)

UNION ALL   
SELECT 'TransOut' as Type, Trs_Del2.OrdID AS OrdID,Mas_Dept.DeptID, Mas_Dept.Deptname, Mas_Dept.OrderSno, Mas_Count.CountName, ISNULL(Mas_Color.ColorDesc, '') AS ColorDesc,0 as ReqKgs,0 as PoKgs, 0 AS RecKgs, 0 as ProgKgs,0 As TransInKgs,ISNULL(kg,0) as  TransOutKgs,0 as openingkgs  
,isNull(Mas_Count.CountID,0) as CountID, isNull(Mas_Color.ColID,0) as ColId
FROM Trs_Del1 INNER JOIN Trs_Del2 ON Trs_Del1.ID=Trs_Del2.ID INNER JOIN  StockTable ON StockTable.StockID = Trs_Del2.StockID INNER JOIN Mas_Count ON StockTable.CntID = Mas_Count.CountID  INNER JOIN Mas_Dept ON Trs_Del1.Prs_Dept = Mas_Dept.DeptID and StockTable.Dept=Mas_Dept.DeptId LEFT OUTER JOIN Mas_Color ON StockTable.ColID = Mas_Color.ColID 
WHERE Mas_Dept.OutputType = 'Y' AND Trs_Del1.TrType = 3 GROUP BY Trs_Del2.OrdID, Mas_Dept.DeptID, Mas_Dept.Deptname, Mas_Dept.OrderSno, Mas_Count.CountName,ISNULL(Mas_Color.ColorDesc,''),Trs_Del2.Kg ,isNull(Mas_Count.CountID,0) , isNull(Mas_Color.ColID,0)
UNION ALL 
SELECT 'Open' as Type,  Trs_Opening.OrdID, Mas_Dept.DeptID, Mas_Dept.Deptname, Mas_Dept.OrderSno, Mas_Count.CountName,ISNULL(Mas_Color.ColorDesc,'') as ColorDesc,0 as ReqKgs,0 as PoKgs, 0 AS RecKgs ,0 as ProgKgs,0 As TransInKgs,0 As TransOutKgs,SUM(Trs_Opening.Kgs) as openingkgs ,isNull(Mas_Count.CountID,0) as CountID, isNull(Mas_Color.ColID,0) as ColId FROM Trs_Opening INNER JOIN StockTable ON Trs_Opening.StockID = StockTable.StockID INNER JOIN Mas_Dept ON Trs_Opening.Dept = Mas_Dept.DeptID LEFT OUTER JOIN Mas_Count ON StockTable.CntID = Mas_Count.CountID LEFT OUTER JOIN Mas_Color ON StockTable.ColID = Mas_Color.ColID WHERE Mas_Dept.OutputType = 'Y' GROUP BY Trs_Opening.OrdID, Mas_Dept.DeptID, Mas_Dept.Deptname, Mas_Dept.OrderSno,Mas_Count.CountName,ISNULL(Mas_Color.ColorDesc, ''),isNull(Mas_Count.CountID,0) , isNull(Mas_Color.ColID,0)


UNION ALL 
SELECT 'Short' as Type,  Trs_shortage.OrdID, Mas_Dept.DeptID, Mas_Dept.Deptname, Mas_Dept.OrderSno, Mas_Count.CountName,ISNULL(Mas_Color.ColorDesc,'') as ColorDesc, isnull(sum(shortkgs),0) as ReqKgs,0 as PoKgs, 0 AS RecKgs, 0 as ProgKgs,0 As TransInKgs,0 As TransOutKgs,0 as openingkgs ,isNull(Mas_Count.CountID,0) as CountID, isNull(Mas_Color.ColID,0) as ColId FROM Trs_shortage INNER JOIN Mas_Dept ON Trs_shortage.Dept = Mas_Dept.DeptID LEFT OUTER JOIN Mas_Count ON trs_shortage.CntID = Mas_Count.CountID LEFT OUTER JOIN Mas_Color ON trs_shortage.ColID = Mas_Color.ColID WHERE Mas_Dept.OutputType = 'Y' GROUP BY Trs_shortage.OrdID, Mas_Dept.DeptID, Mas_Dept.Deptname,
 Mas_Dept.OrderSno,Mas_Count.CountName,ISNULL(Mas_Color.ColorDesc, '') ,isNull(Mas_Count.CountID,0) , isNull(Mas_Color.ColID,0)
 UNION ALL 
 SELECT 'PROG' AS Typt, Trs_Del3.OrdID, Mas_Dept.DeptID, Mas_Dept.Deptname, Mas_Dept.OrderSno, Mas_Count.CountName, ISNULL(Mas_Color.ColorDesc, '') AS ColorDesc,0 as ReqKgs, 0
 as PoQty ,0 as RecKgs, Prog as ProgKgs,0 As TransInKgs,0 As TransOutKgs,0 as openingkgs ,isNull(Mas_Count.CountID,0) as CountID, isNull(Mas_Color.ColID,0) as ColId FROM Trs_Del1 Inner Join  Trs_Del3 On Trs_Del1.ID = Trs_Del3.ID INNER JOIN Mas_Dept ON Trs_Del1.Prs_Dept = Mas_Dept.DeptID INNER JOIN Mas_Count ON Trs_Del3.Cnt = Mas_Count.CountID INNER JOIN  Mas_Color ON Trs_Del3.Clr = Mas_Color.ColID WHERE Mas_Dept.OutputType='Y'  GROUP BY Trs_Del3.OrdID,Mas_Dept.DeptID, Mas_Dept.Deptname, Mas_Dept.OrderSno, Mas_Count.CountName, ISNULL(Mas_Color.ColorDesc, ''), Trs_Del3.Prog,isNull(Mas_Count.CountID,0) , isNull(Mas_Color.ColID,0)