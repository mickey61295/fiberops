/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  26/Dec/2025            
; Create By  :  ASLAM            
; Description  :  Trigger for Prodn Costing Factory Data
; Change Person  :  ASLAM          
; Last Change Date :  26/Dec/2025 10.00 AM            
; =============================================   */     
CREATE TRIGGER  [Trg_ST_Cost_Factory]    ON  [ST_Cost_Factory] AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    DECLARE @Date DateTime,@Coycode INT

  
		SELECT @Date = Dt FROM INSERTED
		SELECT @Coycode = unit_id FROM INSERTED
				
		
		if update(budget_value) or update(actual_value)
		begin
			Update ST_Cost_Factory SET UpdateFlg = 1 Where Dt=@Date And unit_id = @Coycode  
		end
  
END
 

