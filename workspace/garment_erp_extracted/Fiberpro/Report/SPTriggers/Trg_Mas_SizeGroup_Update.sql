/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in SizeGroup Master
; Change Person  :  ASLAM          
; Last Change Date :  04/Nov/2019 10.00 AM            
; =============================================   */     
CREATE TRIGGER Trg_Mas_SizeGroup_Update ON Mas_SizeGroup AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    DECLARE @ID int

    if not (update(server_id) OR update (UpdateFlg))
    begin
        SELECT @ID = ID FROM INSERTED
        Update Mas_SizeGroup SET UpdateFlg = 1 Where ID = @Id
    end
END