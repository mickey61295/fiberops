/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  15/12/2022 10.00 AM 
; =============================================  */  
CREATE PROCEDURE SP_RegQry3 (@Coycode int,@TmpOrdId nVarchar(max))
AS
BEGIN DECLARE @SQLSTR AS NVARCHAR(Max) Set @SQLSTR=N'
SELECT DISTINCT Trs_PcsRej.StyleNo, Trs_PcsRej.Styleid from Trs_PcsRej INNER JOIN Mas_JobWrkComp ON Mas_JobWrkComp.Id = Trs_PcsRej.Stageid INNER JOIN OrderMas ON Trs_PcsRej.Ordid = OrderMas.OrdId INNER JOIN Mas_RejectionType ON Mas_RejectionType.RejectionTypeId = Trs_PcsRej.RejectionTypeId  WHERE Mas_JobWrkComp.PcsType =''Piece'' And (Trs_PcsRej.CoyId = @Coycode) And OrderMas.Ordid in ((Select ID From fnSplitter(@TmpOrdId))) ORDER BY Trs_PcsRej.Styleid'  EXEC SP_EXECUTESQL @SQLSTR,N'@Coycode int,@TmpOrdId nVarchar(max)',@Coycode=@Coycode,@TmpOrdId=@TmpOrdId End