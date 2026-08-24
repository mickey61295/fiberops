/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  24/09/2022 10.00 AM 
; =============================================  */  

 CREATE PROCEDURE SP_FindReqData (
    @StockID Int,@Ordid int,@coycode int,@jobOrdid int,@StyleNo Varchar(30),@deptID int) AS
BEGIN
    Select  IsNull(Sum(isNull(C.ReqKgs,0)),0) as ReqKgs,IsNull(Sum(isNull(C.ReqMtr,0)),0) as ReqMtr From Trs_FabAllot1 A INNER JOIN Trs_FabAllot2 B ON A.Id = B.ID    INNER JOIN Pro_ReqJob_temp C ON
	C.FabId = B.FabId And C.CntID = B.CntId And B.Diaid = C.FinDiaId And B.Gsm = C.FinGSM And B.ColId = C.ColId and b.LL = C.LL
	And B.DesignId = C.DesignId 
    WHERE
        stockid = @StockID And A.Ordid = @Ordid And A.Coycode = @coycode And JobOrdID = @jobOrdid And StyleNo = @StyleNo and C.DeptId = @deptID 
END
