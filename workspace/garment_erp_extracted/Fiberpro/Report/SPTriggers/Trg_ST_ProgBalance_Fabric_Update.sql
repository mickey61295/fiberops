/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in ProgramBalance Fabric Master
; Change Person  :  ASLAM          
; Last Change Date :  25/Jan/2020 10.00 AM            
; =============================================   */     
CREATE TRIGGER Trg_ST_ProgBalance_Fabric_Update    ON  ST_ProgBalance_Fabric AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    DECLARE @Ordid INT,@DeptID INT,@CntID INT,@ColID INT,@FabID INT,@DesignID INT,@FinDiaID int,@FinGSM Numeric(10,2),@LL Varchar(10)

    IF not (update(server_id) OR update (UpdateFlg) )
    BEGIN
		SELECT @OrdID = OrdID FROM INSERTED
		SELECT @DeptID = DeptID FROM INSERTED
		SELECT @FabID = FabId FROM INSERTED
		SELECT @CntID = CntID FROM INSERTED
        SELECT @ColID = ColID FROM INSERTED
		SELECT @DesignID = DesignID FROM INSERTED
		SELECT @FinDiaID = FinDiaID FROM INSERTED
		SELECT @FinGSM = FinGSM FROM INSERTED
		SELECT @LL = LL FROM INSERTED

        Update ST_ProgBalance_Fabric SET UpdateFlg = 1 Where OrdID=@Ordid And DeptID = @DeptId And FabID = @FabID And CntID = @CntID And  ColID = @ColId And DesignID = @DesignID And FinDiaId = @FinDiaId And FinGSM = @FinGSM And LL = @LL
    END
END