/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for DC Update for commando
; Change Person  :  ASLAM          
; Last Change Date :  22/AUG/2025 10.00 AM            
; =============================================   */     

CREATE TRIGGER  TRG_FAB_BALANCE_DEL  ON  Trs_Del2 AFTER INSERT,UPDATE AS DECLARE @OrdId int,@StyleNo Varchar(20),@DeptID int,@FabId int ,@ColId int,@CntId int , @DesignId int, @FinDiaId int,@FinGSM numeric(18,2) , @LL varchar (12),@DcKgs numeric (18,3),@DcMtr numeric (18,3),@Cnt int,@Id Int,@StockId Int ,@DeptGrpCode int ,@SubPrsID INT  ,@ReProcessDCKgs Numeric(18,3), @ReProcessDCMtrs Numeric(18,3)  SELECT @OrdId = OrdId FROM INSERTED    SELECT @Id = Id FROM INSERTED   SELECT @StockId = StockId FROM INSERTED   SELECT @StyleNo = ''    SELECT @DeptId = Prs_Dept From Trs_Del1 Where Id=@Id    SELECT @FabId = FabId From StockTable Where StockId=@StockId /*SELECT @ColId = ColId From StockTable Where StockId=@StockId  */    SELECT @DeptGrpCode = isNull(DeptGrpCode,0) from Mas_Dept WHERE DeptId = @DeptID   IF @DeptId=8 OR @DeptGrpCode = 8  BEGIN  				SELECT @ColId=DyeColId From Trs_Del1 Where Id=@Id   END    Else   BEGIN    		SELECT @ColId = ColId From StockTable Where StockId=@StockId   END   SELECT @CntId = CntId From StockTable Where StockId=@StockId    if @DeptId=10   BEGIN   	SELECT @DesignId=DesignId From Trs_Del1 Where Id=@Id  SELECT @SubPrsID = IsNull(SubPrsID,0) From Trs_Del1 Where Id=@Id  SELECT @LL = LL From StockTable Where StockId=@StockId  END  else  SELECT @DesignId = Print_DesignId From StockTable Where StockId=@StockId  SELECT @FinDiaId = FinDiaId From StockTable Where StockId=@StockId  SELECT @FinGSM = FinGSM From StockTable Where StockId=@StockId  SELECT @LL = LL From StockTable Where StockId=@StockId  IF @DeptId=8 OR @DeptGrpCode = 8  BEGIN  SELECT @SubPrsID = IsNull(SubPrsID,0) From Trs_Del1 Where Id=@Id  END  ELSE  BEGIN   SELECT @SubPrsID = IsNull(SubPrsID,0) From Trs_Del1 Where Id=@Id  END  SELECT @DcKgs = Kg FROM INSERTED  SELECT @DcMtr = Mtr FROM INSERTED  SELECT @Cnt = COUNT(Ordid) from ST_ProgBalance_Fabric WHERE OrdId=@OrdId and DeptId= @DeptId AND FabId= @FabId AND  ColId = @ColId AND CntId = @CntId AND DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL   and SubPrsID =@SubPrsID  IF @DeptId=8 OR @DeptGrpCode = 8   	BEGIN  		If @Cnt >0 begin   Select @DcKgs = Sum(Kg) From Trs_Del1 Inner Join Trs_Del2 On Trs_Del1.Id=Trs_Del2.Id Inner Join StockTable On Trs_Del2.StockId=StockTable.StockId Inner Join Mas_Dept On Trs_Del1.Prs_Dept=Mas_Dept.DeptId WHERE Trs_Del2.OrdId=@OrdId and Prs_Dept= @DeptId AND FabId= @FabId AND Trs_Del1.DyeColId = @ColId AND CntId = @CntId AND Print_DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL And TrType=1 And (Mas_Dept.OutputType='F' Or Mas_Dept.DeptId=11) And (Mas_Dept.ProgFrm_Issue='Y' Or Mas_Dept.DeptId=11) and  Isnull(ProcessType,'P')<>'R'  and Trs_Del1.SubPrsID = @SubPrsID  Select @DcMtr = Sum(Mtr) From Trs_Del1 Inner Join Trs_Del2 On Trs_Del1.Id=Trs_Del2.Id Inner Join StockTable On Trs_Del2.StockId=StockTable.StockId Inner Join Mas_Dept On Trs_Del1.Prs_Dept=Mas_Dept.DeptId WHERE Trs_Del2.OrdId=@OrdId and Prs_Dept= @DeptId AND FabId= @FabId AND Trs_Del1.DyeColId = @ColId AND CntId = @CntId AND Print_DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL And TrType=1 And (Mas_Dept.OutputType='F' Or Mas_Dept.DeptId=11) And (Mas_Dept.ProgFrm_Issue='Y' Or Mas_Dept.DeptId=11)   and Trs_Del1.SubPrsID = @SubPrsID  Select @ReProcessDCKgs = Sum(Kg) From Trs_Del1 Inner Join Trs_Del2 On Trs_Del1.Id=Trs_Del2.Id Inner Join StockTable On Trs_Del2.StockId=StockTable.StockId Inner Join Mas_Dept On Trs_Del1.Prs_Dept=Mas_Dept.DeptId WHERE Trs_Del2.OrdId=@OrdId and Prs_Dept= @DeptId AND FabId= @FabId AND Trs_Del1.DyeColId = @ColId AND CntId = @CntId AND Print_DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL And TrType=1 And (Mas_Dept.OutputType='F' Or Mas_Dept.DeptId=11)  and  Isnull(ProcessType,'P')='R'  and Trs_Del1.SubPrsID = @SubPrsID  Select @ReProcessDCMtrs = Sum(Mtr) From Trs_Del1 Inner Join Trs_Del2 On Trs_Del1.Id=Trs_Del2.Id Inner Join StockTable On Trs_Del2.StockId=StockTable.StockId Inner Join Mas_Dept On Trs_Del1.Prs_Dept=Mas_Dept.DeptId WHERE Trs_Del2.OrdId=@OrdId and Prs_Dept= @DeptId AND FabId= @FabId AND Trs_Del1.DyeColId = @ColId AND CntId = @CntId AND Print_DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL And TrType=1 And (Mas_Dept.OutputType='F' Or Mas_Dept.DeptId=11)  and  Isnull(ProcessType,'P')='R'  and Trs_Del1.SubPrsID = @SubPrsID  

Update ST_ProgBalance_Fabric SET ReProcessDCKgs = @ReProcessDCKgs,ReProcessDCMtr = @ReProcessDCMtrs WHERE OrdId=@OrdId and DeptId= @DeptId AND FabId= @FabId AND ColId = @ColId AND CntId = @CntId AND DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL  and SubPrsID = @SubPrsID  

If (Select ProgFrm_Issue From Mas_Dept Where DeptId=@DeptId)='Y' Or @DeptId=11  
Begin    
Update ST_ProgBalance_Fabric SET DcKgs=@DcKgs,DCMtr=@DcMtr,ReProcessDCKgs = @ReProcessDCKgs,ReProcessDCMtr = @ReProcessDCMtrs WHERE OrdId=@OrdId and DeptId= @DeptId AND FabId= @FabId AND ColId = @ColId AND CntId = @CntId AND DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL  and SubPrsID = @SubPrsID  
End   
End  
End  
Else 	
IF @Cnt >0  	
begin  	
IF @DeptId=10  		
BEGIN  			
IF @Cnt >0   
begin  
Select @DcKgs = Sum(Kg) From Trs_Del1 Inner Join Trs_Del2 On Trs_Del1.Id=Trs_Del2.Id Inner Join StockTable On Trs_Del2.StockId=StockTable.StockId Inner Join Mas_Dept On Trs_Del1.Prs_Dept=Mas_Dept.DeptId  WHERE Trs_Del2.OrdId=@OrdId and Prs_Dept= @DeptId AND FabId= @FabId  AND CntId = @CntId 
And ColID = @ColId 
AND Trs_Del1.DesignId = @DesignId AND FinDiaID = @FinDiaId AND FinGsm = @FinGSM AND ll = @LL And TrType=1 And (Mas_Dept.OutputType='F' Or Mas_Dept.DeptId=11) And (Mas_Dept.ProgFrm_Issue='Y' Or Mas_Dept.DeptId=11)  and  Isnull(ProcessType,'P')<>'R'   And Trs_Del1.SubPrsID = Isnull(@SubPrsID,0) 	/*print @deptid  print @Fabid Print @CntID  Print @DesignId  print @FinDiaid  print @SubPrsID Print @fingsm Print @LL  print @DcKgs */ 

Select @DcMtr = Sum(Mtr) From Trs_Del1 Inner Join Trs_Del2 On Trs_Del1.Id=Trs_Del2.Id Inner Join StockTable On Trs_Del2.StockId=StockTable.StockId Inner Join Mas_Dept On Trs_Del1.Prs_Dept=Mas_Dept.DeptId WHERE Trs_Del2.OrdId=@OrdId and Prs_Dept= @DeptId AND FabId= @FabId AND CntId = @CntId And ColID = @ColId  AND Trs_Del1.DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL And TrType=1 And (Mas_Dept.OutputType='F' Or Mas_Dept.DeptId=11) And (Mas_Dept.ProgFrm_Issue='Y' Or Mas_Dept.DeptId=11)  And Trs_Del1.SubPrsID = Isnull(@SubPrsID,0) 		and  Isnull(ProcessType,'P')<>'R'    

Select @ReProcessDCKgs = Sum(Kg) From Trs_Del1 Inner Join Trs_Del2 On Trs_Del1.Id=Trs_Del2.Id Inner Join StockTable On Trs_Del2.StockId=StockTable.StockId Inner Join Mas_Dept On Trs_Del1.Prs_Dept=Mas_Dept.DeptId  WHERE Trs_Del2.OrdId=@OrdId and Prs_Dept= @DeptId AND FabId= @FabId  AND CntId = @CntId And ColID = @ColId  AND Trs_Del1.DesignId = @DesignId AND FinDiaID = @FinDiaId AND FinGsm = @FinGSM AND ll = @LL And TrType=1  and  Isnull(ProcessType,'P')='R'   And Trs_Del1.SubPrsID = Isnull(@SubPrsID,0) 

		Select @ReProcessDCMtrs = Sum(Mtr) From Trs_Del1 Inner Join Trs_Del2 On Trs_Del1.Id=Trs_Del2.Id Inner Join StockTable On Trs_Del2.StockId=StockTable.StockId Inner Join Mas_Dept On Trs_Del1.Prs_Dept=Mas_Dept.DeptId WHERE Trs_Del2.OrdId=@OrdId and Prs_Dept= @DeptId AND FabId= @FabId AND CntId = @CntId And ColID = @ColId  AND Trs_Del1.DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL And TrType=1 And (Mas_Dept.OutputType='F' Or Mas_Dept.DeptId=11)   And Trs_Del1.SubPrsID = Isnull(@SubPrsID,0) 		and  Isnull(ProcessType,'P')='R'  	 
		
		If (Select ProgFrm_Issue From Mas_Dept Where DeptId=@DeptId)='Y' Or @DeptId=11  
		Begin  
		Update ST_ProgBalance_Fabric SET DcKgs=@DcKgs,DCMtr=@DcMtr,ReProcessDCKgs = @ReProcessDCKgs,ReProcessDCMtr = @ReProcessDCMtrs WHERE OrdId=@OrdId and DeptId= @DeptId AND FabId= @FabId AND ColId = @ColId AND CntId = @CntId AND DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL  and SubPrsID = @SubPrsID   
		End 
		End  
		End  
		
		else 	
		Select @DcKgs = Sum(Kg) From Trs_Del1 Inner Join Trs_Del2 On Trs_Del1.Id=Trs_Del2.Id Inner Join StockTable On Trs_Del2.StockId=StockTable.StockId Inner Join Mas_Dept On Trs_Del1.Prs_Dept=Mas_Dept.DeptId WHERE Trs_Del2.OrdId=@OrdId and Prs_Dept= @DeptId AND FabId= @FabId AND ColId = @ColId AND CntId = @CntId AND Print_DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL And TrType=1 And (Mas_Dept.OutputType='F' Or Mas_Dept.DeptId=11) And (Mas_Dept.ProgFrm_Issue='Y' Or Mas_Dept.DeptId=11) and  Isnull(ProcessType,'P')<>'R'  And Trs_Del1.SubPrsID = Isnull(@SubPrsID,0) 	
		
		Select @DcMtr = Sum(Mtr) From Trs_Del1 Inner Join Trs_Del2 On Trs_Del1.Id=Trs_Del2.Id Inner Join StockTable On Trs_Del2.StockId=StockTable.StockId Inner Join Mas_Dept On Trs_Del1.Prs_Dept=Mas_Dept.DeptId WHERE Trs_Del2.OrdId=@OrdId and Prs_Dept= @DeptId AND FabId= @FabId AND ColId = @ColId AND CntId = @CntId AND Print_DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL And TrType=1 And (Mas_Dept.OutputType='F' Or Mas_Dept.DeptId=11) And (Mas_Dept.ProgFrm_Issue='Y' Or Mas_Dept.DeptId=11)  And Trs_Del1.SubPrsID = Isnull(@SubPrsID,0)  and  Isnull(ProcessType,'P')<>'R'    
		
		Select @ReProcessDCKgs = Sum(Kg) From Trs_Del1 Inner Join Trs_Del2 On Trs_Del1.Id=Trs_Del2.Id Inner Join StockTable On Trs_Del2.StockId=StockTable.StockId Inner Join Mas_Dept On Trs_Del1.Prs_Dept=Mas_Dept.DeptId WHERE Trs_Del2.OrdId=@OrdId and Prs_Dept= @DeptId AND FabId= @FabId AND ColId = @ColId AND CntId = @CntId AND Print_DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL And TrType=1 And (Mas_Dept.OutputType='F' Or Mas_Dept.DeptId=11)  and  Isnull(ProcessType,'P')='R'  And Trs_Del1.SubPrsID = Isnull(@SubPrsID,0) 			
		
		Select @ReProcessDCMtrs = Sum(Mtr) From Trs_Del1 Inner Join Trs_Del2 On Trs_Del1.Id=Trs_Del2.Id Inner Join StockTable On Trs_Del2.StockId=StockTable.StockId Inner Join Mas_Dept On Trs_Del1.Prs_Dept=Mas_Dept.DeptId WHERE Trs_Del2.OrdId=@OrdId and Prs_Dept= @DeptId AND FabId= @FabId AND ColId = @ColId AND CntId = @CntId AND Print_DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL And TrType=1 And (Mas_Dept.OutputType='F' Or Mas_Dept.DeptId=11)  And Trs_Del1.SubPrsID = Isnull(@SubPrsID,0)  and  Isnull(ProcessType,'P')='R'   
		
		If (Select ProgFrm_Issue From Mas_Dept Where DeptId=@DeptId)='Y' Or @DeptId=11   
		Begin   
		
		Update ST_ProgBalance_Fabric SET DcKgs=@DcKgs,DCMtr=@DcMtr,ReProcessDCKgs = @ReProcessDCKgs,ReProcessDCMtr = @ReProcessDCMtrs  WHERE OrdId=@OrdId and DeptId= @DeptId AND FabId= @FabId AND ColId = @ColId AND CntId = @CntId AND DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL  and SubPrsID =@SubPrsID 		
		End  
		
		End  
