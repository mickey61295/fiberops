/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in UOM Master
; Change Person  :  ASLAM          
; Last Change Date :  04/Nov/2019 10.00 AM            
; =============================================   */     
CREATE TRIGGER Trg_Mas_UOM_Update ON Mas_UOM AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
     DECLARE @UOMID int

    if not (update(server_id) OR update (UpdateFlg))
    begin
        SELECT @UOMID = UOMID FROM INSERTED
        Update Mas_Uom SET UpdateFlg = 1 Where UOMID = @UOMId
    end
END