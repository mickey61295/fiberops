
/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  28/11/2022 10.00 AM 
; =============================================  */  
CREATE PROCEDURE SP_RegQry1 (@Ordid nvarchar(max),@Coycode int )
AS
BEGIN 
DECLARE @SQLSTR AS NVARCHAR(Max) Set @SQLSTR=N'
SELECT DISTINCT A.StyleNo, A.Styleid from Trs_PanelRej A INNER JOIN Mas_JobWrkComp B ON B.Id = A.Stageid INNER JOIN OrderMas O ON A.Ordid = O.OrdId INNER JOIN Mas_RejectionType C ON C.RejectionTypeId = A.RejectionTypeId WHERE B.PcsType =''PANEL'' And (A.CoyId = @Coycode) And O.Ordid in((Select ID From fnSplitter(@Ordid))) ORDER BY A.Styleid '  EXEC SP_EXECUTESQL @SQLSTR,N'@Ordid nvarchar(max), @Coycode int ',@Ordid=@Ordid, @Coycode=@Coycode  End
