/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in LOT Master
; Change Person  :  ASLAM          
; Last Change Date :  21/Dec/2021 10.00 AM            
; =============================================   */     
CREATE TRIGGER Trg_Mas_Lot_Update ON Mas_Lot AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    DECLARE @ID int

    if not (update(server_id) OR update (UpdateFlg))
    begin
        SELECT @ID = LotSno FROM INSERTED
        Update Mas_Lot SET UpdateFlg = 1 Where LotSno = @Id
    end
END