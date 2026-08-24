/*;=============================================   
; Author           :  Global Software's    
; Create date      :  25/01/2012
; Create By        :  ASLAM  
; Description      :  Program Requirement Calculation 
; Change Person    :  ASLAM
; Last Change Date :  25/01/2022 10.45 AM 
; =============================================  */   
CREATE TRIGGER [TRG_FAB_BALANCE_RCUT_DEL] ON [dbo].[Trs_ReadyToCut2] AFTER DELETE AS DECLARE @OrdId int,@StyleNo Varchar(20),@DeptID int,@FabId int ,@ColId int,@CntId int , @DesignId int, @FinDiaId int,@FinGSM numeric(18,2) , @LL varchar (12),@DcKgs numeric (18,3),@DcMtr numeric (18,3),@Cnt int,@Id Int,@StockId Int ,@StockId1 Int ,@DeptGrpCode int     ,@Kg Numeric(18,3), @Mtr Numeric(18,2)   

SELECT @OrdId = OrdId FROM DELETED   

SELECT @Id = Id FROM DELETED   
SELECT @StockId = TranID FROM DELETED   
SELECT @StyleNo = ''   
SELECT @DeptId = Prs_Dept From Trs_ReadyToCut1 Where Id=@Id   
SELECT @FabId = FabId From StockTable Where StockId=@StockId/*  SELECT @ColId = ColId From StockTable Where StockId=@StockId */ SELECT @DeptGrpCode = isNull(DeptGrpCode,0) from Mas_Dept WHERE DeptId = @DeptID   

SELECT @ColId = ColId From StockTable Where StockId=@StockId 

SELECT @CntId = CntId From StockTable Where StockId=@StockId  
SELECT @DesignId = Print_DesignId From StockTable Where StockId=@StockId  
SELECT @FinDiaId = FinDiaId From StockTable Where StockId=@StockId   
SELECT @FinGSM = FinGSM From StockTable Where StockId=@StockId  
SELECT @LL = LL From StockTable Where StockId=@StockId  
SELECT @DcKgs = Kg FROM DELETED   
SELECT @DcMtr = Mtr FROM DELETED  
SELECT @Cnt = COUNT(Ordid) from ST_ProgBalance_Fabric WHERE OrdId=@OrdId and DeptId= @DeptId AND FabId= @FabId AND  ColId = @ColId AND CntId = @CntId AND DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL   
 
 IF @Cnt >0  
  begin 
   
   Select @DcKgs = Sum(Kg) From Trs_ReadyToCut1 as Trs_Del1 Inner Join Trs_ReadyToCut2 as Trs_Del2 On Trs_Del1.Id=Trs_Del2.Id Inner Join StockTable On Trs_Del2.StockId=StockTable.StockId Inner Join Mas_Dept On Trs_Del1.Prs_Dept=Mas_Dept.DeptId WHERE Trs_Del2.OrdId=@OrdId and Prs_Dept= @DeptId AND FabId= @FabId AND ColId = @ColId AND CntId = @CntId AND Print_DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL And TrType=20 And (Mas_Dept.OutputType='F' Or Mas_Dept.DeptId=11) 
   
   Select @DcMtr = Sum(Mtr) From Trs_ReadyToCut1 as Trs_Del1 Inner Join Trs_ReadyToCut2 as Trs_Del2 On Trs_Del1.Id=Trs_Del2.Id Inner Join StockTable On Trs_Del2.StockId=StockTable.StockId Inner Join Mas_Dept On Trs_Del1.Prs_Dept=Mas_Dept.DeptId WHERE Trs_Del2.OrdId=@OrdId and Prs_Dept= @DeptId AND FabId= @FabId AND ColId = @ColId AND CntId = @CntId AND Print_DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL And TrType=20 And (Mas_Dept.OutputType='F' Or Mas_Dept.DeptId=11) 
   
     
	
	DECLARE LINE_CURSOR CURSOR FOR  
	select ID,StockID,kg,mtr from DELETED  
	OPEN LINE_CURSOR    
	FETCH NEXT FROM LINE_CURSOR INTO  @Id,@StockID1,@Kg,@Mtr 
	WHILE @@FETCH_STATUS = 0  
	BEGIn  
	SELECT @OrdId = OrdID From StockTable Where StockId=@StockId1 
	SELECT @FabId = FabId From StockTable Where StockId=@StockId1   
	SELECT @ColId = ColId From StockTable Where StockId=@StockId1  
	SELECT @CntId = CntId From StockTable Where StockId=@StockId1   
	SELECT @DesignId = Print_DesignId From StockTable Where StockId=@StockId1  
	SELECT @FinDiaId = FinDiaId From StockTable Where StockId=@StockId1  
	SELECT @FinGSM = FinGSM From StockTable Where StockId=@StockId1   
	SELECT @LL = LL From StockTable Where StockId=@StockId1   
	
	 Update ST_ProgBalance_Fabric SET DcKgs=isnull(DcKgs,0)- @Kg,DCMtr=@Mtr, GRNKgs = isnull(GRNKgs,0)- @Kg,GRNMtr=isnull(GRNMtr,0) - @Mtr  WHERE OrdId=@OrdId and DeptId= @DeptId AND FabId= @FabId AND ColId = @ColId AND CntId = @CntId AND DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL
	 
	   FETCH NEXT FROM LINE_CURSOR INTO @Id,@StockID1 ,@Kg,@Mtr   
	   ENd  
	   CLOSE LINE_CURSOR      
	   DEALLOCATE LINE_CURSOR     
	   SET NOCOUNT OFF 
	 
	   
	End    



