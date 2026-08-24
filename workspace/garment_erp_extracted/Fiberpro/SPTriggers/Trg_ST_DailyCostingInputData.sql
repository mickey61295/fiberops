/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  30/Jan/2026            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in ST_DailyCostingInputData Master
; Change Person  :  ASLAM          
; Last Change Date :  30/Jan/2026 10.10 AM            
; =============================================   */     
CREATE TRIGGER Trg_ST_DailyCostingInputData ON ST_DailyCostingInputData AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
     DECLARE @ID int

    if not (update(serverid) OR update (UpdateFlg))
    begin
        SELECT @ID = ID FROM INSERTED
        Update ST_DailyCostingInputData SET UpdateFlg = 1 Where ID = @Id
    end
END