/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in Design Master
; Change Person  :  ASLAM          
; Last Change Date :  04/Nov/2019 10.00 AM            
; =============================================   */     
CREATE TRIGGER Trg_Mas_Design_Update ON Mas_Design AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    DECLARE @ID int

    if not (update(server_id) OR update (UpdateFlg))
    begin
        SELECT @ID = DESIGNID FROM INSERTED
        Update Mas_Design SET UpdateFlg = 1 Where DESIGNID = @Id
    end
END