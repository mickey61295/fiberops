/*;=============================================   
; Author           :  Global Software's    
; Create date      :  31/12/2022    
; Create By        :  ASLAM 
; Description      :  SP FOR SHIFTWAGES REG
; Change Person    :  ASLAM
; Last Change Date :  08/04/2023 10.01 AM 
; =============================================  */  
CREATE PROCEDURE SP_Vue_PRodStatus_1 (@DBName as Varchar(20))  AS 
BEGIN 
DECLARE @sql1 NVARCHAR(MAX);
SET @sql1 = ' ALTER VIEW Vue_PRodStatus  as 
Select X.coycode,X.Ordid,X.Styleno,X.PartId,X.ColId,x.sizeId,X.Lineid,isNull(Sum(X.Cutpcs),0) as CutPcs,isNull(Sum(LineFeedPcs),0) as LineFeedPcs,isNull(Sum(LineoutputPcs),0) as LineoutputPcs,IsNull(Sum(Goodpcs),0) as GoodPcs,IsNull(sum(rejectPcs),0) as RejectPcs,IsNull(Sum(ReworkWIP),0) as ReworkWIP from (

Select A.Coyid as Coycode, A.OrdId,a.StyleNo,a.PartID,a.Clrid as colid,b.SizID as SizeID,0 as lineid,sum(b.ProdPcs) as CutPcs , 0 as LineFeedPcs,0 as LineoutputPcs,0 as Goodpcs, 0 as RejectPcs,
0 as ReworkWIP From  Trs_Prodentry a inner join Trs_ProdentryQty B on A.Id = B.Id WHERE isnull(Rework,0)=0 and StageId =1 group by A.Coyid ,A.OrdId,A.StyleNo,A.PartID,A.Clrid,B.SizID 

UNION 

Select Coycode,b.MasterOrderID as OrdID,A.StyleNo,A.PartID,C.colorid as colid, c.Sizeid,LineID,0 as cutpcs,count(C.ActualPcs) as LineFeedPcs, 0 as LineoutputPcs,0 as GoodPcs,0 as RejectPcs, 0 as ReworkWIP From ' + @DBName  + '..Cutting A INNER JOIN ' + 
@DBName  + '..Orders B ON A.OrderID = B.OrderID INNER JOIN ' + @DBName  + '..Bundle C ON 
 A.CuttingID = C.CuttingID INNER JOIN ' + @DBName  + '..BundlePiece D ON C.BundleID = D.BundleID inner join ' + @DBName  + '..LineIssueEntry LI on li.BundleID = C.BundleID          
 inner join ' + @DBName  + '..LineIssue on LineIssue.LineIssueID = Li.LineIssueID  
 inner join Mas_Exporter on A.Coycode = Mas_Exporter.ExpID 
 Group by Coycode,b.MasterOrderID,A.StyleNo,A.PartID,LineID,C.ColorID ,C.SizeId

UNION   

 Select Coycode,b.MasterOrderID as OrdID,A.StyleNo,A.PartID,C.colorid as colid, c.Sizeid,LineID,0 as cutpcs,0 as LineFeedPcs, count(Prod.BundlePieceID) as LineoutputPcs,0 as GoodPcs,0 as RejectPcs, 0 as ReworkWIP From ' + @DBName  + '..Cutting A INNER JOIN ' + @DBName  + '..Orders B ON A.OrderID = B.OrderID INNER JOIN ' + @DBName  + '..Bundle C ON 
 A.CuttingID = C.CuttingID INNER JOIN ' + @DBName  + '..BundlePiece D ON C.BundleID = D.BundleID INNER JOIN ' + @DBName  + ' ..LineOutput Prod ON 
 D.BundlePieceID = prod.BundlePieceID inner join ' + @DBName  + '..LineIssueEntry LI on li.BundleID = C.BundleID                                 
 INNER JOIN ' + @DBName  + '..LineIssue ON LineIssue.LineIssueID = Li.LineIssueID  
 INNER JOIN Mas_Exporter on A.Coycode = Mas_Exporter.ExpID 
 Group by Coycode,b.MasterOrderID,A.StyleNo,A.PartID,LineID,C.ColorID ,C.SizeId  
 
UNION  

 Select Coycode,b.MasterOrderID as OrdID,A.StyleNo,A.PartID,C.colorid as colid, c.Sizeid,LineID,0 as cutpcs,0 as LineFeedPcs, 0 as LineoutputPcs,COUNT(Prod.BundlePieceID) as GoodPcs,0 as RejectPcs, 0 as ReworkWIP  From ' + @DBName  + '..Cutting A INNER JOIN ' + @DBName  + '..Orders B ON A.OrderID = B.OrderID INNER JOIN ' + @DBName  + '..Bundle C ON 

 A.CuttingID = C.CuttingID INNER JOIN ' + @DBName  + '..BundlePiece D ON C.BundleID = D.BundleID INNER JOIN ' + @DBName  + ' ..ProductionEntry Prod ON 

 D.BundlePieceID = prod.BundlePieceID inner join ' + @DBName  + '..LineIssueEntry LI on li.BundleID = C.BundleID                                 

 INNER JOIN ' + @DBName  + '..LineIssue ON LineIssue.LineIssueID = Li.LineIssueID  

 INNER JOIN Mas_Exporter on A.Coycode = Mas_Exporter.ExpID 

 WHERE Prod.EntryType =''GD'' Group by A.coycode,B.MasterOrderID,A.StyleNo,A.PartID,c.colorid,c.SizeID ,LineId 

UNION  
Select Coycode,b.MasterOrderID as OrdID,A.StyleNo,A.PartID,C.colorid as colid, c.Sizeid,LineID,0 as cutpcs,0 as LineFeedPcs, 0 as LineoutputPcs,0 as GoodPcs,COUNT(Prod.BundlePieceID) as RejectPcs, 0 as ReworkWIP From ' + @DBName  + '..Cutting A INNER JOIN ' + @DBName  + '..Orders B ON A.OrderID = B.OrderID INNER JOIN ' + @DBName  + '..Bundle C ON 

 A.CuttingID = C.CuttingID INNER JOIN ' + @DBName  + '..BundlePiece D ON C.BundleID = D.BundleID INNER JOIN ' + @DBName  + ' ..ProductionEntry Prod ON 

 D.BundlePieceID = prod.BundlePieceID inner join ' + @DBName  + '..LineIssueEntry LI on li.BundleID = C.BundleID     

 INNER JOIN ' + @DBName  + '..LineIssue ON LineIssue.LineIssueID = Li.LineIssueID  

 INNER JOIN Mas_Exporter on A.Coycode = Mas_Exporter.ExpID 

 WHERE Prod.EntryType =''RJ''

 GROUP BY Coycode,b.MasterOrderID,A.StyleNo,A.PartID,LineID,C.ColorID  ,C.SizeId

UNION 

 Select Coycode,b.MasterOrderID as OrdID,A.StyleNo,A.PartID,C.colorid as colid, c.Sizeid,LineID,0 as cutpcs,0 as LineFeedPcs, 0 as LineoutputPcs,0 as GoodPcs,0 as RejectPcs, COUNT(Prod.BundlePieceID) as ReworkWIP  From ' + @DBName  + '..Cutting A INNER 
JOIN ' + @DBName  + '..Orders B ON A.OrderID = B.OrderID INNER JOIN ' + @DBName  + '..Bundle C ON 

 A.CuttingID = C.CuttingID INNER JOIN ' + @DBName  + '..BundlePiece D ON C.BundleID = D.BundleID INNER JOIN ' + @DBName  + ' ..ProductionEntry Prod ON 

 D.BundlePieceID = prod.BundlePieceID inner join ' + @DBName  + '..LineIssueEntry LI on li.BundleID = C.BundleID                                 

 INNER JOIN ' + @DBName  + '..LineIssue ON LineIssue.LineIssueID = Li.LineIssueID  

 INNER JOIN Mas_Exporter on A.Coycode = Mas_Exporter.ExpID 

 WHERE Prod.EntryType =''RW''

 GROUP BY Coycode,b.MasterOrderID,A.StyleNo,A.PartID,LineID,C.ColorID ,C.SizeId  ) X Group by X.coycode,X.Ordid,X.Styleno,X.PartId,X.ColId,x.sizeId,X.lineid'


EXEC sp_executesql @sql1 

END


-- SP_Vue_RptShiftWagesReg 