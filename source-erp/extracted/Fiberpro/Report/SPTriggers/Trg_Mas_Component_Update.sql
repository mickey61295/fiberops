/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in Part Master
; Change Person  :  ASLAM          
; Last Change Date :  18/Apr/2019 10.00 AM            
; =============================================   */     
CREATE TRIGGER [dbo].[Trg_Mas_Component_Update]   ON  [dbo].[Mas_Component]    AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    declare @CompID as int   
    if not (update(server_id) OR update (UpdateFlg) )
    begin
        select @CompID = CompID from inserted
        update Mas_Component set UpdateFlg=1 where CompID=  @CompID
    end
END
