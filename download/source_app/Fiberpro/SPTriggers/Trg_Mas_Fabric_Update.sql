/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in Fabric Master
; Change Person  :  ASLAM          
; Last Change Date :  04/Nov/2019 10.00 AM            
; =============================================   */     
CREATE TRIGGER Trg_Mas_Fabric_Update ON Mas_Fabric AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    DECLARE @ID int

    if not (update(server_id) OR update (UpdateFlg))
    begin
        SELECT @ID = FabID FROM INSERTED
        Update Mas_Fabric SET UpdateFlg = 1 Where FabID = @Id
    end
END