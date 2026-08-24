/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in Color Master
; Change Person  :  ASLAM          
; Last Change Date :  04/Nov/2019 10.00 AM            
; =============================================   */     
CREATE TRIGGER Trg_Mas_Color_Update    ON  Mas_Color    AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    DECLARE @ColID int

    if not (update(server_id) OR update (UpdateFlg) )
    begin
        SELECT @ColID = ColID FROM INSERTED
        Update Mas_Color SET UpdateFlg = 1 Where ColID = @ColId
    end
END