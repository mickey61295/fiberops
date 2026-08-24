/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in Season Master
; Change Person  :  ASLAM          
; Last Change Date :  04/Nov/2019 10.00 AM            
; =============================================   */     
CREATE TRIGGER Trg_Mas_Season_Update ON Mas_Season AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    DECLARE @ID int

    if not (update(server_id) OR update (UpdateFlg))
    begin
        SELECT @ID = SEASID FROM INSERTED
        Update Mas_Season SET UpdateFlg = 1 Where SEASID = @Id
    end
END