/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  04/01/2023 10.00 AM 
; =============================================  */  
 CREATE PROCEDURE SP_FindReqData1 (
    @StockID Int,@Ordid int,@coycode int,@jobOrdid int,@StyleNo Varchar(30),@deptID int) AS
BEGIN
    Select DISTINCT b.FabId_1,b.CntId_1,b.ColId_1,b.Diaid_1,b.FinDiaId_1,b.finGSM_1,b.LL_1,b.DesignId_1,b.FabId as FabId_Req,b.CntId as CntID_Req,b.ColId as ColID_Req,b.Diaid as DiaID_Req,b.GSM as GSM_Req,b.LL as LL_Req,b.DesignId as DesignID_Req   From Trs_FabAllot1 A INNER JOIN Trs_FabAllot2 B ON A.Id = B.ID    INNER JOIN Pro_ReqJob  C ON
	C.FabId = B.FabId And C.CntID = B.CntId And B.Diaid = C.FinDiaId And B.Gsm = C.FinGSM And B.ColId = C.ColId and b.LL = C.LL
	And B.DesignId = C.DesignId 
    WHERE
       stockid = @StockID And A.Ordid = @Ordid And A.Coycode = @coycode And JobOrdID = @jobOrdid And StyleNo = @StyleNo and C.DeptId = @deptID 
END
