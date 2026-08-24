/*;=============================================   
; Author           :  Global Software's    
; Create date      :  21/04/2022    
; Create By        :  ASLAM 
; Description      :  SP FOR Production Consolidated
; Change Person    :  ASLAM
; Last Change Date :  18/08/2023 10.47 AM 
; =============================================  */  
CREATE PROCEDURE SP_Vue_Prod_Consolidate_PCS_Line (@DBName Varchar(100)) AS 
BEGIN 

DECLARE @sql1 NVARCHAR(MAX);

SET @sql1 = 'ALTER VIEW Vue_Prod_Consolidate_PCS_Line as 

SELECT Coycode,StageId,OrdID,StyleNo,PartID,LineID,Sum(LinePcs) as LinePcs,Sum(LineOutPcs) AS LineOutPcs, Sum(GoodPcs) as GoodPcs,Sum(RejPcs) as RejPcs, Sum(ReworkPcs) as reWorkPcs  FROM (
Select Coycode,Final_StageId as StageId,b.MasterOrderID as OrdID,A.StyleNo,A.PartID,LineID,count(C.ActualPcs) as Linepcs, 0 as LineOutPcs,0 as GoodPcs,0 as RejPcs, 0 as ReworkPcs From ' + @DBName  + '..Cutting A INNER JOIN ' + @DBName  + '..Orders B ON A.OrderID = B.OrderID INNER JOIN ' + @DBName  + '..Bundle C ON 
 A.CuttingID = C.CuttingID INNER JOIN ' + @DBName  + '..BundlePiece D ON C.BundleID = D.BundleID inner join ' + @DBName  + '..LineIssueEntry LI on li.BundleID = C.BundleID                                 
 inner join ' + @DBName  + '..LineIssue on LineIssue.LineIssueID = Li.LineIssueID  
 inner join Mas_Exporter on A.Coycode = Mas_Exporter.ExpID 
 Group by Coycode,b.MasterOrderID,A.StyleNo,A.PartID,LineID,Final_StageId

 UNION

 Select Coycode,Final_StageId as StageId,b.MasterOrderID as OrdID,A.StyleNo,A.PartID,LineID,0 as Linepcs, count(Prod.BundlePieceID) as LineOutPcs,0 as GoodPcs,0 as RejPcs, 0 as ReworkPcs From ' + @DBName  + '..Cutting A INNER JOIN ' + @DBName  + '..Orders B ON A.OrderID = B.OrderID INNER JOIN ' + @DBName  + '..Bundle C ON 
 A.CuttingID = C.CuttingID INNER JOIN ' + @DBName  + '..BundlePiece D ON C.BundleID = D.BundleID INNER JOIN ' + @DBName  + ' ..LineOutput Prod ON 
 D.BundlePieceID = prod.BundlePieceID inner join ' + @DBName  + '..LineIssueEntry LI on li.BundleID = C.BundleID                                 
 inner join ' + @DBName  + '..LineIssue ON LineIssue.LineIssueID = Li.LineIssueID  
 inner join Mas_Exporter on A.Coycode = Mas_Exporter.ExpID 
 Group by Coycode,b.MasterOrderID,A.StyleNo,A.PartID,LineID,Final_StageId

UNION

 Select Coycode,Final_StageId as StageId,b.MasterOrderID as OrdID,A.StyleNo,A.PartID,LineID,0 as Linepcs, 0 as LineOutPcs,COUNT(Prod.BundlePieceID) as GoodPcs,0 as RejPcs, 0 as ReworkPcs From ' + @DBName  + '..Cutting A INNER JOIN ' + @DBName  + '..Orders B ON A.OrderID = B.OrderID INNER JOIN ' + @DBName  + '..Bundle C ON 
 A.CuttingID = C.CuttingID INNER JOIN ' + @DBName  + '..BundlePiece D ON C.BundleID = D.BundleID INNER JOIN ' + @DBName  + ' ..ProductionEntry Prod ON 
 D.BundlePieceID = prod.BundlePieceID inner join ' + @DBName  + '..LineIssueEntry LI on li.BundleID = C.BundleID                                 
 INNER JOIN ' + @DBName  + '..LineIssue ON LineIssue.LineIssueID = Li.LineIssueID  
 INNER JOIN Mas_Exporter on A.Coycode = Mas_Exporter.ExpID 
 INNER JOIN Mas_jobWrkComp ON Mas_jobWrkcomp.ID = Prod.OpTypeId
 WHERE Prod.EntryType =''GD''  and OperationSeqNo =(select max(operationSeqNo) from Mas_JobWrkComp Where Inspection_Operation=''Y'')
 GROUP BY Coycode,b.MasterOrderID,A.StyleNo,A.PartID,LineID,Final_StageId

 UNION
 Select Coycode,Final_StageId as StageId,b.MasterOrderID as OrdID,A.StyleNo,A.PartID,LineID,0 as Linepcs, 0 as LineOutPcs,0 as GoodPcs,COUNT(Prod.BundlePieceID) as RejPcs, 0 as ReworkPcs From ' + @DBName  + '..Cutting A INNER JOIN ' + @DBName  + '..Orders B ON A.OrderID = B.OrderID INNER JOIN ' + @DBName  + '..Bundle C ON 
 A.CuttingID = C.CuttingID INNER JOIN ' + @DBName  + '..BundlePiece D ON C.BundleID = D.BundleID INNER JOIN ' + @DBName  + ' ..ProductionEntry Prod ON 
 D.BundlePieceID = prod.BundlePieceID inner join ' + @DBName  + '..LineIssueEntry LI on li.BundleID = C.BundleID                                 
 INNER JOIN ' + @DBName  + '..LineIssue ON LineIssue.LineIssueID = Li.LineIssueID  
 INNER JOIN Mas_Exporter on A.Coycode = Mas_Exporter.ExpID 
 WHERE Prod.EntryType =''RJ''
 GROUP BY Coycode,b.MasterOrderID,A.StyleNo,A.PartID,LineID,Final_StageId

 UNION
 Select Coycode,Final_StageId as StageId,b.MasterOrderID as OrdID,A.StyleNo,A.PartID,LineID,0 as Linepcs, 0 as LineOutPcs,0 as GoodPcs,0 as RejPcs, COUNT(Prod.BundlePieceID) as ReworkPcs From ' + @DBName  + '..Cutting A INNER JOIN ' + @DBName  + '..Orders B ON A.OrderID = B.OrderID INNER JOIN ' + @DBName  + '..Bundle C ON 
 A.CuttingID = C.CuttingID INNER JOIN ' + @DBName  + '..BundlePiece D ON C.BundleID = D.BundleID INNER JOIN ' + @DBName  + ' ..ProductionEntry Prod ON 
 D.BundlePieceID = prod.BundlePieceID inner join ' + @DBName  + '..LineIssueEntry LI on li.BundleID = C.BundleID                                 
 INNER JOIN ' + @DBName  + '..LineIssue ON LineIssue.LineIssueID = Li.LineIssueID  
 INNER JOIN Mas_Exporter on A.Coycode = Mas_Exporter.ExpID 
 WHERE Prod.EntryType =''RK''
 GROUP BY Coycode,b.MasterOrderID,A.StyleNo,A.PartID,LineID,Final_StageId ) Y GROUP BY Coycode,StageId,OrdID,StyleNo,PartID,LineID'

EXEC sp_executesql @sql1 

END