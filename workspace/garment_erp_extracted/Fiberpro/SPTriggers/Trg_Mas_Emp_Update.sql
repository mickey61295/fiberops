 /*
;=============================================            
; Author  :  Global Software's            
; Create date  :  22/Dec/2020            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in Part Master
; Change Person  :  ASLAM          
; Last Change Date :  03/FEB/2026 10.00 AM            
; =============================================   */     
CREATE TRIGGER [dbo].[Trg_Mas_Emp_Update]   ON  [dbo].[Mas_Emp]    AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    declare @EmpID as int   
    if not (update(server_id) OR update (UpdateFlg) or UPDATE(EMP_SERVER_ID))
    begin
        select @EmpID = ID from inserted
        update Mas_Emp set UpdateFlg=1 where ID=  @EmpID
    end
END
