/*;=============================================   
; Author           :  Global Software's    
; Create date      :  25/01/2012
; Create By        :  ASLAM  
; Description      :  Program Requirement Calculation 
; Change Person    :  ASLAM
; Last Change Date :  25/01/2022 10.45 AM 
; =============================================  */  
CREATE TRIGGER [dbo].[TRG_FAB_BALANCE_RCUT_RET] ON [dbo].[Trs_ReadyToCut_Ret2]  AFTER INSERT,UPDATE AS DECLARE @OrdId int,@StyleNo Varchar(20),@DeptID int,@FabId int ,@ColId int,@CntId int , @DesignId int, @FinDiaId int,@FinGSM numeric(18,2) , @LL varchar (12),@RecKgs numeric (18,3),@RecMtr numeric (18,3),@Cnt int,@Id Int,@StockId Int  
BEGIN 
SELECT @OrdId = OrdId FROM INSERTED  
SELECT @Id = Id FROM INSERTED  
SELECT @StockId = StockId FROM INSERTED  
SELECT @StyleNo = ''  
SELECT @DeptId = Dept From Trs_ReadyToCut_Ret1 Where Id=@Id  
SELECT @FabId = FabId From StockTable Where StockId=@StockId  

SELECT @ColId = ColId From StockTable Where StockId=@StockId 

SELECT @CntId = CntId From StockTable Where StockId=@StockId  
SELECT @DesignId = Print_DesignId From StockTable Where StockId=@StockId  
SELECT @FinDiaId = FinDiaId From StockTable Where StockId=@StockId  
SELECT @FinGSM = FinGSM From StockTable Where StockId=@StockId  
SELECT @LL = LL From StockTable Where StockId=@StockId  
SELECT @RecKgs = RecKgs FROM INSERTED  
SELECT @RecMtr = RecMtr FROM INSERTED  

print @deptid
print @fabid 
SELECT @Cnt = COUNT(Ordid) from ST_ProgBalance_Fabric WHERE OrdId=@OrdId and DeptId= @DeptId AND FabId= @FabId AND colid=@ColId AND CntId = @CntId AND DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL  
print 'ii'

 IF @Cnt >0  begin  
print 'ii5'
Select @RecKgs = Sum(RecKgs) From Trs_ReadyToCut_Ret1 as Trs_Grn1 Inner Join Trs_ReadyToCut_Ret2 as Trs_Grn2 On Trs_Grn1.Id=Trs_Grn2.Id Inner Join StockTable On Trs_Grn2.StockId=StockTable.Stockid WHERE  Trs_Grn2.OrdId=@OrdId and Trs_Grn1.Dept= @DeptId AND FabId= @FabId  AND CntId = @CntId AND StockTable.Print_DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL AND colid=@ColId And GrnType In ('Return')  

Select @RecMtr = Sum(RecMtr) From Trs_Grn1 Inner Join Trs_Grn2 On Trs_Grn1.Id=Trs_Grn2.Id Inner Join StockTable On Trs_Grn2.StockId=StockTable.Stockid WHERE  Trs_Grn2.OrdId=@OrdId and Trs_Grn1.Dept= @DeptId AND FabId= @FabId  AND CntId = @CntId AND StockTable.Print_DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL AND colid=@ColId And GrnType In ('Return')  
end  

Update ST_ProgBalance_Fabric SET ReturnKgs=@RecKgs,ReturnMtrs=@RecMtr WHERE OrdId=@OrdId and StyleNo=@StyleNo and DeptId= @DeptId AND FabId= @FabId  AND CntId = @CntId AND DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL AND colid=@ColId  
end 



