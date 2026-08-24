/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in Party Master
; Change Person  :  ASLAM          
; Last Change Date :  04/Nov/2019 10.00 AM            
; =============================================   */     
CREATE TRIGGER Trg_Mas_Party_Update ON Mas_Party AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
     DECLARE @PID int

    if not (update(server_id) OR update (UpdateFlg))
    begin
        SELECT @PID = PID FROM INSERTED
        Update Mas_Party SET UpdateFlg = 1 Where PID = @PId
    end
END