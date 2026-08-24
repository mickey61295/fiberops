/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  22/Dec/2020            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in Part Master
; Change Person  :  ASLAM          
; Last Change Date :  22/Dec/2020 10.00 AM            
; =============================================   */     
CREATE TRIGGER [dbo].[Trg_Mas_StyleGroup_Update]   ON  [dbo].[Mas_StyleGroup]    AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    declare @sgrpID as int   
    if not (update(server_id) OR update (UpdateFlg) )
    begin
        select @sgrpID = ID from inserted
        update Mas_StyleGroup set UpdateFlg=1 where ID=  @sgrpID
    end
END
