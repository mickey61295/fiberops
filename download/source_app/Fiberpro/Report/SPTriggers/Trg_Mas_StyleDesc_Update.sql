/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in Style Description Master
; Change Person  :  ASLAM          
; Last Change Date :  04/Nov/2019 10.00 AM            
; =============================================   */     
CREATE TRIGGER Trg_Mas_StyleDesc_Update ON Mas_StyleDesc AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    DECLARE @ID int

    if not (update(server_id) OR update (UpdateFlg))
    begin
        SELECT @ID = StyleID FROM INSERTED
        Update Mas_StyleDesc SET UpdateFlg = 1 Where StyleID = @Id
    end
END