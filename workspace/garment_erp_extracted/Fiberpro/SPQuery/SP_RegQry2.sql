/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  15/12/2022 10.06 AM 
; =============================================  */  
CREATE PROCEDURE SP_RegQry2 (@Coycode int,@Gbl_BuyerCol nVarchar(max),@Gbl_MerchCol nvarchar(max),@OrderType Varchar(100),@complete varchar(50))
AS
BEGIN DECLARE @SQLSTR AS NVARCHAR(Max) Set @SQLSTR=N'
SELECT DISTINCT Trs_PcsRej.StyleNo, Trs_PcsRej.Styleid from Trs_PcsRej INNER JOIN Mas_JobWrkComp ON Mas_JobWrkComp.Id = Trs_PcsRej.Stageid INNER JOIN OrderMas ON Trs_PcsRej.Ordid = OrderMas.OrdId INNER JOIN Mas_RejectionType ON Mas_RejectionType.RejectionTypeId = Trs_PcsRej.RejectionTypeId WHERE Mas_JobWrkComp.PcsType =''Piece'' And (Trs_PcsRej.CoyId = @Coycode) And (OrderMas.BuyerId in ((Select ID From fnSplitter(@Gbl_BuyerCol))) or OrderMas.BuyerId=0) And (OrderMas.MerchId in ((Select ID From fnSplitter(@Gbl_MerchCol))) or OrderMas.MerchId=0) and Ordertype in (@OrderType) and completed in ((Select ID From fnSplitter(@complete))) ORDER BY Trs_PcsRej.Styleid'  EXEC SP_EXECUTESQL @SQLSTR,N'@Coycode int,@Gbl_BuyerCol nVarchar(max),@Gbl_MerchCol nvarchar(max),@OrderType Varchar(100),@Complete Varchar(50)',@Coycode=@Coycode,@Gbl_BuyerCol=@Gbl_BuyerCol,@Gbl_MerchCol=@Gbl_MerchCol,@OrderType=@OrderType,@Complete=@Complete End