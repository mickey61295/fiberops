/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  25/Nov/2025            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in Dia Master
; Change Person  :  ASLAM          
; Last Change Date :  26/Nov/2025 10.00 AM            
; =============================================   */     
 
CREATE TRIGGER [dbo].[TRG_YARN_BALANCE_DEL] ON [dbo].[Trs_Del2] AFTER INSERT,UPDATE AS DECLARE @OrdId int,@StyleNo Varchar(20),@DeptID int,@ColId int,@CntId int,@DelKgs numeric (18,3),@SalDcKgs numeric(18,3),@Cnt int,@Id Int,@StockId Int ,@deptID_1 int ,@TrsType int   
SELECT @OrdId = OrdId FROM INSERTED     
SELECT @Id = Id FROM INSERTED    
SELECT @StockId = StockId FROM INSERTED    
SELECT @StyleNo = ''    
SELECT @DeptId = Prs_Dept From Trs_Del1 Where ID=@Id    
SELECT @DeptId = Prs_Dept From Trs_Del1 Where ID=@Id    
SELECT @ColId = ColId From StockTable Where StockId=@StockId   
SELECT @CntId = CntID From StockTable Where StockId=@StockId     
SELECT @deptID_1 = Dept from StockTable Where StockID = @StockId    
SELECT @TrsType = TrType From Trs_Del1 Where ID=@Id    
SELECT @DelKgs = Kg FROM INSERTED        
SELECT @Cnt = COUNT(OrdId) from ST_ProgBalance_Yarn WHERE OrdId=@OrdId and StyleNo=@StyleNo and DeptId= @DeptId AND ColId = @ColId AND CountId = @CntId    
IF @Cnt>0     
begin     
Select @SalDcKgs = isnull(Sum(Kg),0) From Trs_Del1 Inner Join Trs_Del2 On Trs_Del1.Id=Trs_Del2.Id Inner Join StockTable On Trs_Del2.StockId=StockTable.StockId Inner Join Mas_Dept On Trs_Del1.Prs_Dept=Mas_Dept.DeptId WHERE Trs_Del2.OrdId=@OrdId and Prs_Dept=@DeptId AND ColId=@ColId AND CntId=@CntId And TrType= 2 and trs_del1.YF='Y'     
END      

BEGIN  

Select @DelKgs = isnull(Sum(Kg),0) From Trs_Del1 Inner Join Trs_Del2 On Trs_Del1.Id=Trs_Del2.Id Inner Join StockTable On Trs_Del2.StockId=StockTable.StockId Inner Join Mas_Dept On Trs_Del1.Prs_Dept=Mas_Dept.DeptId WHERE Trs_Del2.OrdId=@OrdId and Prs_Dept=@DeptId AND ColId=@ColId AND CntId=@CntId And TrType=1 And (Mas_Dept.OutputType='Y' Or Mas_Dept.InputType='Y')     
END   
if @DelKgs >0 OR @SalDcKgs >0 
Update ST_ProgBalance_Yarn SET DcKgs= @DelKgs+@SalDcKgs WHERE OrdId=@OrdId and StyleNo=@StyleNo and DeptId=@DeptId AND ColId=@ColId AND CountId=@CntId and isnull(pokgs,0)=0