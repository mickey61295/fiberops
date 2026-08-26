/*;=============================================   

; Author           :  Global Software's    

; Create date      :  21/04/2022    

; Create By        :  ASLAM 

; Description      :  SP FOR Production Consolidated

; Change Person    :  ASLAM

; Last Change Date :  25/04/2023 10.35 AM 

; =============================================  */  

CREATE PROCEDURE SP_QRY25 (@DBName Varchar(100),@Dt varchar(20)) AS 

BEGIN 



DECLARE @sql1 NVARCHAR(MAX);



SET @sql1 = 'SELECT Coycode,StageId,OrdID,StyleNo,PartID,ColId,SizeId,LineID,Sum(LinePcs) as LinefeedPcs,Sum(LineOutPcs) AS prodPcs FROM (

Select  Coycode,Final_StageId as StageId,b.MasterOrderID as OrdID,A.StyleNo,A.PartID,LineID,count(C.ActualPcs) as Linepcs, 0 as LineOutPcs,0 as GoodPcs,0 as RejPcs, 0 as ReworkPcs,A.colorID as ColId,C.SizeId From ' + @DBName  + '..Cutting A INNER JOIN ' + @DBName  + '..Orders B ON A.OrderID = B.OrderID INNER JOIN ' + @DBName  + '..Bundle C ON 

 A.CuttingID = C.CuttingID INNER JOIN ' + @DBName  + '..BundlePiece D ON C.BundleID = D.BundleID inner join ' + @DBName  + '..LineIssueEntry LI on li.BundleID = C.BundleID                                 

 inner join ' + @DBName  + '..LineIssue on LineIssue.LineIssueID = Li.LineIssueID  

 inner join Mas_Exporter on A.Coycode = Mas_Exporter.ExpID 

 Group by Coycode,b.MasterOrderID,A.StyleNo,A.PartID,LineID,Final_StageId,A.colorID ,C.SizeId

 UNION



 Select Coycode,Final_StageId as StageId,b.MasterOrderID as OrdID,A.StyleNo,A.PartID,LineID,0 as Linepcs, count(Prod.BundlePieceID) as LineOutPcs,0 as GoodPcs,0 as RejPcs, 0 as ReworkPcs,A.colorID as ColId,C.SizeId
 From ' + @DBName  + '..Cutting A INNER JOIN ' + @DBName  + '..Orders B ON A.OrderID = B.OrderID INNER JOIN ' + @DBName  + '..Bundle C ON 

 A.CuttingID = C.CuttingID INNER JOIN ' + @DBName  + '..BundlePiece D ON C.BundleID = D.BundleID INNER JOIN ' + @DBName  + ' ..LineOutput Prod ON 

 D.BundlePieceID = prod.BundlePieceID inner join ' + @DBName  + '..LineIssueEntry LI on li.BundleID = C.BundleID                                 

 inner join ' + @DBName  + '..LineIssue ON LineIssue.LineIssueID = Li.LineIssueID  

 inner join Mas_Exporter on A.Coycode = Mas_Exporter.ExpID 
 WHERE convert(date, prod.createdOn,108) = ''' + CAST(@Dt AS VARCHAR(30)) + '''
 
 Group by Coycode,b.MasterOrderID,A.StyleNo,A.PartID,LineID,Final_StageId ,A.colorID ,C.SizeId) X Group by 

 Coycode,StageId,OrdID,StyleNo,PartID,LineID,ColID,SizeID'



EXEC sp_executesql @sql1 



END


 



