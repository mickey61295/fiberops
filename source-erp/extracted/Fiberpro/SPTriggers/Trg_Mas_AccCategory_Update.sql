/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in Accessories Category Master
; Change Person  :  ASLAM          
; Last Change Date :  04/Nov/2019 10.00 AM            
; =============================================   */     
CREATE TRIGGER Trg_Mas_AccCategory_Update ON Mas_AccCategory AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
     DECLARE @ID int

    if not (update(server_id) OR update (UpdateFlg))
    begin
        SELECT @ID = CatID FROM INSERTED
        Update Mas_AccCategory SET UpdateFlg = 1 Where CatID = @Id
    end
END