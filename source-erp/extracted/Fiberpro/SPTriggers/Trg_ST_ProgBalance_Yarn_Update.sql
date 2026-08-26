/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in ProgramBalance Yarn Master
; Change Person  :  ASLAM          
; Last Change Date :  04/Nov/2019 10.00 AM            
; =============================================   */     
CREATE TRIGGER Trg_ST_ProgBalance_Yarn_Update    ON  ST_ProgBalance_Yarn AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    DECLARE @Ordid INT,@DeptID INT,@CountID INT,@ColID INT

    IF not (update(server_id) OR update (UpdateFlg) )
    BEGIN
		SELECT @OrdID = OrdID FROM INSERTED
		SELECT @DeptID = DeptID FROM INSERTED
		SELECT @CountID = CountID FROM INSERTED
        SELECT @ColID = ColID FROM INSERTED

        Update ST_ProgBalance_Yarn SET UpdateFlg = 1 Where OrdID=@Ordid And DeptID = @DeptId And CountID = @CountID And  ColID = @ColId
    END
END