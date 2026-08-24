/*;=============================================   
; Author           :  Global Software's    
; Create date      :  25/01/2012
; Create By        :  ASLAM  
; Description      :  Program Requirement Calculation 
; Change Person    :  ASLAM
; Last Change Date :  25/01/2022 10.45 AM 
; =============================================  */   
CREATE TRIGGER [TRG_FAB_BALANCE_RCUT_RET_DEL] ON [dbo].[Trs_ReadyToCut_Ret2] AFTER DELETE AS DECLARE @OrdId int,@StyleNo Varchar(20),@DeptID int,@FabId int ,@ColId int,@CntId int , @DesignId int, @FinDiaId int,@FinGSM numeric(18,2) , @LL varchar (12),@RecKgs numeric (18,3),@RecMtr numeric (18,3),@Cnt int,@Id Int,@StockId Int  
SELECT @OrdId = OrdId FROM DELETED  
SELECT @Id = Id FROM DELETED   
SELECT @StockId = StockId FROM DELETED   
SELECT @StyleNo = ''   
SELECT @DeptId = Dept From StockTable Where StockId=@StockId    
SELECT @FabId = FabId From StockTable Where StockId=@StockId    
SELECT @ColId = ColId From StockTable Where StockId=@StockId    
SELECT @CntId = CntId From StockTable Where StockId=@StockId  
SELECT @DesignId = Print_DesignId From StockTable Where StockId=@StockId   
SELECT @FinDiaId = FinDiaId From StockTable Where StockId=@StockId  
SELECT @FinGSM = FinGSM From StockTable Where StockId=@StockId   
SELECT @LL = LL From StockTable Where StockId=@StockId    
SELECT @RecKgs = RecKgs FROM DELETED 
SELECT @RecMtr = RecMtr FROM DELETED    
SELECT @Cnt = COUNT(Ordid) from ST_ProgBalance_Fabric WHERE OrdId=@OrdId and StyleNo=@StyleNo and DeptId= @DeptId AND FabId= @FabId AND  ColId = @ColId AND CntId = @CntId AND DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL   
IF @Cnt >0    
begin  	

Select @RecKgs = Sum(RecKgs) From Trs_ReadyToCut_Ret1 as Trs_Grn1 Inner Join Trs_ReadyToCut_Ret2 as Trs_Grn2 On Trs_Grn1.Id=Trs_Grn2.Id Inner Join StockTable On Trs_Grn2.StockId=StockTable.Stockid WHERE Trs_Grn2.OrdId=@OrdId and StockTable.Dept= @DeptId AND FabId= @FabId AND ColId = @ColId AND CntId = @CntId AND StockTable.Print_DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL And GrnType In ('Return')  	



Select @RecMtr = Sum(RecMtr) From Trs_ReadyToCut_Ret1 as Trs_Grn1 Inner Join Trs_ReadyToCut_Ret2 as Trs_Grn2 On Trs_Grn1.Id=Trs_Grn2.Id Inner Join StockTable On Trs_Grn2.StockId=StockTable.Stockid WHERE Trs_Grn2.OrdId=@OrdId and StockTable.Dept= @DeptId AND FabId= @FabId AND ColId = @ColId AND CntId = @CntId AND StockTable.Print_DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL And GrnType In ('Return') 


 		Update ST_ProgBalance_Fabric SET ReturnKgs=@RecKgs,ReturnMtrs=@RecMtr WHERE OrdId=@OrdId and StyleNo=@StyleNo and DeptId= -7 AND FabId= @FabId AND ColId = @ColId AND CntId = @CntId AND DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL  	
END 




