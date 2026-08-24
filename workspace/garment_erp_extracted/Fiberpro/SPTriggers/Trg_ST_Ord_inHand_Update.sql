/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in Acc.Prog Balance 
; Change Person  :  ASLAM          
; Last Change Date :  04/Nov/2019 10.00 AM            
; =============================================   */     
CREATE TRIGGER Trg_ST_Ord_inHand_Update    ON  ST_Ord_inHand AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    DECLARE @Ordid INT,@STYLENO VARCHAR(20)  

    IF not (update(serverid) OR update (UpdateFlg) )
    BEGIN
		SELECT @OrdID = OrdID FROM INSERTED
		SELECT @STYLENO = STYLENO FROM INSERTED
		

        Update ST_Ord_inHand SET UpdateFlg = 1 Where OrdID=@Ordid And Styleno = @Styleno  
    END
END