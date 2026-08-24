/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for Readuto cut Update for commando
; Change Person  :  ASLAM          
; Last Change Date :  14/Feb/2022 10.00 AM            
; =============================================   */     
CREATE TRIGGER  [TRG_FAB_BALANCE_RCUT] ON [dbo].[Trs_ReadyToCut2] AFTER INSERT,UPDATE AS DECLARE @OrdId int,@StyleNo Varchar(20),@DeptID int,@FabId int ,@ColId int,@CntId int , @DesignId int, @FinDiaId int,@FinGSM numeric(18,2) , @LL varchar (12),@DcKgs numeric (18,3),@DcMtr numeric (18,3),@Cnt int,@Id Int,@StockId Int ,@DeptGrpCode int   

SELECT @OrdId = OrdId FROM INSERTED   
SELECT @Id = Id FROM INSERTED   

SELECT @StockId = TranID FROM INSERTED   
SELECT @StyleNo = ''    
SELECT @DeptId = Prs_Dept From Trs_ReadyToCut1 Where Id=@Id 
   
SELECT @FabId = FabId From StockTable Where StockId=@StockId /*SELECT @ColId = ColId From StockTable Where StockId=@StockId  */    SELECT @DeptGrpCode = isNull(DeptGrpCode,0) from Mas_Dept WHERE DeptId = @DeptID   
IF @DeptId=8 OR @DeptGrpCode = 8  
BEGIN  	
SELECT @ColId=DyeColId From Trs_ReadyToCut1 Where Id=@Id   
END    
Else   
BEGIN    
SELECT @ColId = ColId From StockTable Where StockId=@StockId   
END   
SELECT @CntId = CntId From StockTable Where StockId=@StockId    
if @DeptId=10   
BEGIN   
SELECT @DesignId=DesignId From Trs_ReadyToCut1 Where Id=@Id  
END  
else  
SELECT @DesignId = Print_DesignId From StockTable Where StockId=@StockId  
SELECT @FinDiaId = FinDiaId From StockTable Where StockId=@StockId  
SELECT @FinGSM = FinGSM From StockTable Where StockId=@StockId  
SELECT @LL = LL From StockTable Where StockId=@StockId  
SELECT @DcKgs = Kg FROM INSERTED  
SELECT @DcMtr = Mtr FROM INSERTED  

SELECT @Cnt = COUNT(Ordid) from ST_ProgBalance_Fabric WHERE OrdId=@OrdId and DeptId= @DeptId AND FabId= @FabId AND  ColId = @ColId AND CntId = @CntId AND DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL   

 

IF @DeptId=8 OR @DeptGrpCode = 8  
BEGIN  
If @Cnt >0  
begiN  
Select @DcKgs = Sum(Kg) From Trs_ReadyToCut1 as Trs_Del1 Inner Join Trs_ReadyToCut2 Trs_del2 On Trs_Del1.Id=Trs_Del2.Id Inner Join StockTable On Trs_Del2.StockId=StockTable.StockId Inner Join Mas_Dept On Trs_Del1.Prs_Dept=Mas_Dept.DeptId WHERE Trs_Del2.OrdId=@OrdId and Prs_Dept= @DeptId AND FabId= @FabId AND Trs_Del1.DyeColId = @ColId AND CntId = @CntId AND Print_DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL And TrType=20 And (Mas_Dept.OutputType='F' Or Mas_Dept.DeptId=11) And (Mas_Dept.ProgFrm_Issue='Y' Or Mas_Dept.DeptId=11) and  Isnull(ProcessType,'P')<>'R'  
Select @DcMtr = Sum(Mtr) From Trs_ReadyToCut1 as Trs_Del1 Inner Join Trs_ReadyToCut2 as Trs_Del2 On Trs_Del1.Id=Trs_Del2.Id Inner Join StockTable On Trs_Del2.StockId=StockTable.StockId Inner Join Mas_Dept On Trs_Del1.Prs_Dept=Mas_Dept.DeptId WHERE Trs_Del2.OrdId=@OrdId and Prs_Dept= @DeptId AND FabId= @FabId AND Trs_Del1.DyeColId = @ColId AND CntId = @CntId AND Print_DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL And TrType=20 And (Mas_Dept.OutputType='F' Or Mas_Dept.DeptId=11) And (Mas_Dept.ProgFrm_Issue='Y' Or Mas_Dept.DeptId=11)  
If (Select ProgFrm_Issue From Mas_Dept Where DeptId=@DeptId)='Y' Or @DeptId=11  
Begin  
Update ST_ProgBalance_Fabric SET DcKgs=@DcKgs,DCMtr=@DcMtr,GRNKgs = @DcKgs,GRNMtr = @DcMtr WHERE OrdId=@OrdId and DeptId= @DeptId AND FabId= @FabId AND ColId = @ColId AND CntId = @CntId AND DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL  
End  
End  
End  
Else  
IF @Cnt >0  
begiN  
 
Select @DcKgs = Sum(Kg) From Trs_ReadyToCut1 as Trs_Del1 Inner Join Trs_ReadyToCut2 as Trs_Del2 On Trs_Del1.Id=Trs_Del2.Id Inner Join StockTable On Trs_Del2.StockId=StockTable.StockId Inner Join Mas_Dept On Trs_Del1.Prs_Dept=Mas_Dept.DeptId WHERE Trs_Del2.OrdId=@OrdId and Prs_Dept= @DeptId AND FabId= @FabId AND ColId = @ColId AND CntId = @CntId AND Print_DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL And TrType=20 And (Mas_Dept.OutputType='F' Or Mas_Dept.DeptId=11)  and  Isnull(ProcessType,'P')<>'R' 

 
Select @DcMtr = Sum(Mtr) From Trs_ReadyToCut1 as Trs_Del1 Inner Join Trs_ReadyToCut2 Trs_Del2 On Trs_Del1.Id=Trs_Del2.Id Inner Join StockTable On Trs_Del2.StockId=StockTable.StockId Inner Join Mas_Dept On Trs_Del1.Prs_Dept=Mas_Dept.DeptId WHERE Trs_Del2.OrdId=@OrdId and Prs_Dept= @DeptId AND FabId= @FabId AND ColId = @ColId AND CntId = @CntId AND Print_DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL And TrType=20 And (Mas_Dept.OutputType='F' Or Mas_Dept.DeptId=11) and  Isnull(ProcessType,'P')<>'R' 

 
 Update ST_ProgBalance_Fabric SET DcKgs=@DcKgs,DCMtr=@DcMtr,GRNKgs = @DcKgs,GRNMtr = @DcMtr WHERE OrdId=@OrdId and DeptId= @DeptId AND FabId= @FabId AND ColId = @ColId AND CntId = @CntId AND DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL  

  End  


