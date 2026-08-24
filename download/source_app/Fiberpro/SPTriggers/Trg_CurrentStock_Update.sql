/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  17/Apr/2024            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in CURRENT STOCK
; Change Person  :  ASLAM          
; Last Change Date :  17/Apr/2024 10.30 AM            
; =============================================   */     
CREATE TRIGGER [Trg_CurrentStock_Update] ON CURRENTSTOCK AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    DECLARE @ID int

     if not (update (UpdateFlg))  
     Begin	
        SELECT @ID = stockid FROM INSERTED
        Update Currentstock SET UpdateFlg = 1 Where Stockid = @Id
     end
END
 

