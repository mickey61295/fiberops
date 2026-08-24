/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in Acc.Prog Balance 
; Change Person  :  ASLAM          
; Last Change Date :  10/Feb/2020 11.00 AM            
; =============================================   */     
CREATE TRIGGER Trg_ST_Acc_Prog_Balance_Update_Actual    ON  ST_Acc_Prog_Balance AFTER UPDATE AS 
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

		if update(actstartdate) or update(actfinishdate)
		begin
			Update ST_Acc_Prog_Balance SET ActualPosting_UpdateFlg = 1 Where OrdID=@Ordid And Styleno = @Styleno And AType = @Atype 
		end


    END
END