/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in Part Master
; Change Person  :  ASLAM          
; Last Change Date :  04/Nov/2019 10.00 AM            
; =============================================   */     
CREATE TRIGGER Trg_Mas_Part_Update   ON  Mas_Part    AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    declare @PartID as int   
    if not (update(server_id) OR update (UpdateFlg) )
    begin
        select @PartID = PArtID from inserted
        update Mas_Part set UpdateFlg=1 where PartID=  @PartID
    end
END