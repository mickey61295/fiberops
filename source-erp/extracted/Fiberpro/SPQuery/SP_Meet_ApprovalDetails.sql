/*                  
;=============================================                  
; Author  :  Global Software's                  
; Create date  :  16/JUL/2018                  
; Create By  :  ASLAM                  
; Description  :  Stored Procedure for Commando- Approval Details
; Change Person  :  ASLAM                
; Last Change Date :  16/Jul/2018 09.00 AM                  
; =============================================   */      
CREATE PROC SP_Meet_ApprovalDetails (@ID int)
 AS
 BEGIN

 DECLARE @ORdid int,@StyleNo Varchar(20),@OPCODE INT

 SELECT @ORdid = OrdID from WF_WorkFlow_Planning WHERE ID = @ID 
 SELECT @StyleNo  = StyleNo from WF_WorkFlow_Planning WHERE ID = @ID 
 SELECt @OpCode = WF_OperationCode From WF_WorkFlow_Planning Where ID = @ID 

 SELECT DISTINCT A.OrdID as orderid, A.styleno, a.descr as description, a.plandate, "mas_buyer"."buyername", "mas_merchandiser"."merchname", b."finyear", b."buyordno", b."jobno", "mas_exporter"."exportername", "mas_color"."colordesc", a."feedbackdate", a."status", a."remarks", c."sentdate", "app_approvaldc"."awbillno", "app_approvaldc"."awbilldate", "app_couriermas"."couriername", d."opname", d."seqno"
 FROM App_ApprovalPlan A INNER JOIN OrderMas B ON A.Ordid = B.ORdid  
 INNER JOIN Wf_OperationMaster D ON A.ApprovalId = D.OPCode  
 INNER JOIN Mas_Buyer ON B.BuyerID = Mas_Buyer.BuyerID 
 INNER JOIN Mas_Exporter ON B.ExpID = Mas_Exporter.ExpID 
 INNER JOIN Mas_Merchandiser ON B.MerchID = Mas_Merchandiser.MerchID 

 LEFT OUTER JOIN Mas_Color ON A.ColorId = Mas_Color.ColID  LEFT OUTER JOIN  App_ApprovalSent C ON A.ApprovalId = C.ApprovalId 
 And A.Descr = C.Description And A.OrdId = C.OrdId And A.StyleNo = C.Styleno And A.ColorId = C.ColID And A.Slno = C.Slno 
 LEFT OUTER JOIN App_ApprovalDc ON C.DcId = App_ApprovalDc.DcId 
 LEFT  OUTER JOIN App_CourierMas ON App_ApprovalDc.CourierId = App_CourierMas.ID 

 WHERE A.Ordid = @ORdid And A.StyleNo = @StyleNo And A.ApprovalId = @OPCODE 

 END 
 -- EXEC SP_Meet_ApprovalDetails 5791