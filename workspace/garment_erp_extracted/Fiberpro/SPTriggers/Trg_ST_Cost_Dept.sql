/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  26/Dec/2025            
; Create By  :  ASLAM            
; Description  :  Trigger for Prodn Costing Factory Data
; Change Person  :  ASLAM          
; Last Change Date :  26/Dec/2025 10.00 AM            
; =============================================   */     
CREATE TRIGGER  [Trg_ST_Cost_Dept]    ON  [ST_Cost_Dept] AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    DECLARE @Date DateTime,@Coycode INT,@DeptID int,@LineID int 

  
		SELECT @Date = Dt FROM INSERTED
		SELECT @Coycode = unit_id FROM INSERTED
		SELECT @DeptId = Dept_id FROM INSERTED
		SELECT @LineId = Line_id FROM INSERTED
				
		
		if update(budget_value) or update(actual_value)
		begin
			Update ST_Cost_Dept SET UpdateFlg = 1 Where Dt=@Date And unit_id = @Coycode  And dept_id = @DeptID And line_id = @LineID
		end
  
END
 

