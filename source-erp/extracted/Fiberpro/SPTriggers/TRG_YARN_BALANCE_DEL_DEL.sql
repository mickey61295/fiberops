
/*;=============================================
; Author		    :		DHARANI A.
; Create date		:		28/03/2014
; Create By		    :		DHARANI
; Description		:		StockRate Post
; Change Person		:		ASLAM
; Last Change Date	:		26/11/2025 10:55
; =============================================	*/

CREATE TRIGGER [dbo].[TRG_YARN_BALANCE_DEL_DEL] ON [dbo].[Trs_Del2]  AFTER DELETE AS DECLARE @OrdId int,@StyleNo Varchar(20),@DeptID int,@ColId int,@CntId int,@DelKgs numeric (18,3),@Cnt int,@Id Int,@StockId Int,@SalDcKgs as Numeric(18,3) ,@pokgs as Numeric(18,3)  

SELECT @OrdId = OrdId FROM DELETED   
SELECT @Id = Id FROM DELETED   
SELECT @StockId = StockId FROM DELETED   
SELECT @StyleNo = ''   
/*SELECT @DeptId = Dept From StockTable Where StockId=@StockId   */
SELECT @DeptID = Prs_Dept FROM Trs_Del1 Where Id = @ID
SELECT @ColId = ColId From StockTable Where StockId=@StockId   
SELECT @CntId = CntID From StockTable Where StockId=@StockId   
SELECT @DelKgs = Kg FROM DELETED   
SELECT @Cnt = COUNT(OrdId) from ST_ProgBalance_Yarn WHERE OrdId=@OrdId and StyleNo=@StyleNo and DeptId= @DeptId AND ColId = @ColId AND CountId = @CntId      
IF @Cnt>0  
begin    
Select @SalDcKgs = isnull(Sum(Kg),0) From Trs_Del1 Inner Join Trs_Del2 On Trs_Del1.Id=Trs_Del2.Id Inner Join StockTable On Trs_Del2.StockId=StockTable.StockId Inner Join Mas_Dept On Trs_Del1.Prs_Dept=Mas_Dept.DeptId WHERE Trs_Del2.OrdId=@OrdId and Prs_Dept=@DeptId AND ColId=@ColId AND CntId=@CntId And TrType= 2 and trs_del1.YF='Y'   

Select @DelKgs = isnull(Sum(Kg),0) From Trs_Del1 Inner Join Trs_Del2 On Trs_Del1.Id=Trs_Del2.Id Inner Join StockTable On Trs_Del2.StockId=StockTable.StockId Inner Join Mas_Dept On Trs_Del1.Prs_Dept=Mas_Dept.DeptId WHERE Trs_Del2.OrdId=@OrdId and Prs_Dept=@DeptId AND ColId=@ColId AND CntId=@CntId And TrType=1    

select @pokgs =  isnull(sum(pokgs),0) From ST_ProgBalance_Yarn WHERE OrdId=@OrdId and StyleNo=@StyleNo and DeptId=@DeptId AND ColId=@ColId AND CountId=@CntId 

if @pokgs >0   
Update ST_ProgBalance_Yarn SET DcKgs=@SalDcKgs WHERE OrdId=@OrdId and StyleNo=@StyleNo and DeptId=@DeptId AND ColId=@ColId AND CountId=@CntId  
else  
Update ST_ProgBalance_Yarn SET DcKgs=@DelKgs + @SalDcKgs WHERE OrdId=@OrdId and StyleNo=@StyleNo and DeptId=@DeptId AND ColId=@ColId AND CountId=@CntId   
end







