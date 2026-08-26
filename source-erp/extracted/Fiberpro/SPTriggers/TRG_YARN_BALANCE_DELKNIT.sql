/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  25/Nov/2025            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in Dia Master
; Change Person  :  ASLAM          
; Last Change Date :  26/Nov/2025 11.00 AM            
; =============================================   */     

CREATE TRIGGER [dbo].[TRG_YARN_BALANCE_DELKNIT] ON [dbo].[Trs_Del3] AFTER INSERT,UPDATE AS DECLARE @OrdId int,@StyleNo Varchar(20),@DeptID int,@ColId int,@CntId int,@DelKgs numeric (18,3),@Cnt int,@Id Int,@StockId Int 

SELECT @OrdId = OrdId FROM INSERTED 
SELECT @Id = Id FROM INSERTED 
SELECT @StyleNo = '' 
SELECT @DeptId = Prs_Dept From Trs_Del1 Where Id=@Id 
SELECT @ColId = Clr FROM INSERTED 
SELECT @CntId = Cnt FROM INSERTED 
SELECT @DelKgs = Prog FROM INSERTED 
SELECT @Cnt = COUNT(OrdId) from ST_ProgBalance_Yarn WHERE OrdId=@OrdId and StyleNo=@StyleNo and DeptId= @DeptId AND ColId = @ColId AND CountId = @CntId 

IF @Cnt>0 
begin 
Select @DelKgs = Sum(Prog) From Trs_Del1 Inner Join Trs_Del3 On Trs_Del1.Id=Trs_Del3.Id Inner Join Mas_Dept On Trs_Del1.Prs_Dept=Mas_Dept.DeptId WHERE Trs_Del3.OrdId=@OrdId and Prs_Dept=@DeptId AND Clr=@ColId AND Cnt=@CntId And TrType=1 And (Mas_Dept.OutputType='Y' Or Mas_Dept.InputType='Y') 

 
Update ST_ProgBalance_Yarn SET DcKgs=@DelKgs WHERE OrdId=@OrdId and StyleNo=@StyleNo and DeptId=@DeptId AND ColId=@ColId AND CountId=@CntId 

end