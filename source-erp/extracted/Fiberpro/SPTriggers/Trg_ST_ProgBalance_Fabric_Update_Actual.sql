/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for Actual Entry UpdateFlg in ST_ProgBalance_Fabric 
; Change Person  :  ASLAM          
; Last Change Date :  25/Jan/2020 10.00 AM            
; =============================================   */     
CREATE TRIGGER Trg_ST_ProgBalance_Fabric_Update_Actual    ON  ST_ProgBalance_Fabric AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    DECLARE @Ordid INT,@DeptID INT,@CntID INT,@ColID INT,@FabID INT,@DesignID INT,@FinDiaID int,@FinGSM Numeric(10,2),@LL Varchar(10)

    IF not (update(server_id) OR update (UpdateFlg) )
    BEGIN
		SELECT @OrdID = OrdID FROM INSERTED
		SELECT @DeptID = DeptID FROM INSERTED
		SELECT @FabID = FabID FROM INSERTED
		SELECT @CntID = CntID FROM INSERTED
        SELECT @ColID = ColID FROM INSERTED
		SELECT @DesignID = DesignID FROM INSERTED
		SELECT @FinDiaID = FinDiaID FROM INSERTED
		SELECT @FinGSM = FinGSM FROM INSERTED
		SELECT @LL = LL FROM INSERTED
		if update(actstartdate) or update(actfinishdate)
		begin
			if @deptID = 4 
			begin
				Update ST_ProgBalance_Fabric SET ActualPosting_UpdateFlg = 1 Where OrdID=@Ordid And DeptID = @DeptId 
			end
			else
			begin
				Update ST_ProgBalance_Fabric SET ActualPosting_UpdateFlg = 1 Where OrdID=@Ordid And DeptID = @DeptId AND ColID = @ColId And DesignID = @DesignID 
			end 
			
		end
        
    END
END