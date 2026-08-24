CREATE TRIGGER [dbo].[Trg_ST_ProdRequirement_Update] ON [dbo].[ST_ProdRequirement] AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    DECLARE @OrdID int,@Styleno Varchar(20),@WrkId int,@DeptId int,@PartID int

    if not (update(server_id) OR update (UpdateFlg))
    begin
        SELECT @OrdID = Ordid FROM INSERTED
		SELECT @StyleNo = Styleno FROM INSERTED
		SELECT @WrkId = WrkId FROM INSERTED
		SELECT @DeptId = deptId FROM INSERTED
		SELECT @PartId = PartId FROM INSERTED
        Update ST_ProdRequirement SET UpdateFlg = 1 Where OrdId = @OrdID and StyleNo = @Styleno And WrkID = @WrkId And 
		DeptId = @DeptId And PartId = @PartID 
    end
END