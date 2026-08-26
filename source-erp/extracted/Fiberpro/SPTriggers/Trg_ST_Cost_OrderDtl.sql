/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  26/Dec/2025            
; Create By  :  ASLAM            
; Description  :  Trigger for Prodn Costing Factory Data
; Change Person  :  ASLAM          
; Last Change Date :  26/Dec/2025 10.00 AM            
; =============================================   */     
CREATE TRIGGER  [Trg_ST_Cost_OrderDtl]    ON  [ST_Cost_OrderDtl] AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    DECLARE @Date DateTime,@Coycode INT,@DeptID int,@LineID int ,@Ordid Int,@Styleno Varchar(20)

  
		SELECT @Date = Dt FROM INSERTED
		SELECT @Coycode = unit_id FROM INSERTED
		SELECT @DeptId = Dept_id FROM INSERTED
		SELECT @LineId = Line_id FROM INSERTED
		SELECT @Ordid = Order_id FROM INSERTED
		SELECT @Styleno = Styleno FROM INSERTED		
		
		if update(budget_value) or update(actual_value)
		begin
			Update ST_Cost_OrderDtl SET UpdateFlg = 1 Where Dt=@Date And unit_id = @Coycode  And dept_id = @DeptID And line_id = @LineID
			And Order_ID= @Ordid And Styleno = @Styleno 
		end
  
END
 

