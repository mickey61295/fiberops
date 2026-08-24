/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in Acc.Prog Balance 
; Change Person  :  ASLAM          
; Last Change Date :  04/Nov/2019 10.00 AM            
; =============================================   */     
CREATE TRIGGER Trg_ST_Acc_Prog_Balance_Update    ON  ST_Acc_Prog_Balance AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    DECLARE @Ordid INT,@STYLENO VARCHAR(20), @Atype INT,@Ades INT,@ACol INT , @Asize INT

    IF not (update(server_id) OR update (UpdateFlg) )
    BEGIN
		SELECT @OrdID = OrdID FROM INSERTED
		SELECT @STYLENO = STYLENO FROM INSERTED
		SELECT @Atype = Atype FROM INSERTED
		SELECT @Ades = Ades FROM INSERTED
		SELECT @ACol = ACol FROM INSERTED
		SELECT @ASize = Asize FROM INSERTED

        Update ST_Acc_Prog_Balance SET UpdateFlg = 1 Where OrdID=@Ordid And Styleno = @Styleno And AType = @Atype And ACol = 		 @ACol and ASize = @Asize
    END
END