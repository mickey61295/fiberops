/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  25/Nov/2025            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in Dia Master
; Change Person  :  ASLAM          
; Last Change Date :  26/Nov/2025 11.10 AM            
; =============================================   */     
 CREATE TRIGGER [dbo].[TRG_YARN_BALANCE_DELYARN_DEL] ON [dbo].[Trs_Del3]  AFTER DELETE AS DECLARE @OrdId int,@StyleNo Varchar(20),@DeptID int,@ColId int,@CntId int,@DelKgs numeric (18,3),@Cnt int,@Id Int,@StockId Int,@SalDcKgs as Numeric(18,3) ,@pokgs as Numeric(18,3)  ,@DC_DeptID int

 SELECT @OrdId = OrdId FROM DELETED   
 SELECT @Id = Id FROM DELETED  
 SELECT @StyleNo = ''  
 SELECT @DeptId = Prs_Dept From Trs_Del1 Where Id=@Id  
 SELECT @ColId = Clr FROM DELETED  
 SELECT @CntId = Cnt FROM DELETED  
 
 SELECT @DelKgs = Prog FROM DELETED  
  
 SELECT @Cnt = COUNT(Ordid) from ST_ProgBalance_Yarn WHERE OrdId=@OrdId and DeptId= @DeptId AND  ColId = @ColId AND CountId = @CntId 
 


DECLARE LINE_CURSOR CURSOR FOR  select ID,Prog,Clr,Cnt from DELETED WHERE ID =@ID  OPEN LINE_CURSOR     
FETCH NEXT FROM LINE_CURSOR INTO  @Id,@DelKgs,@ColId,@CntID 

WHILE @@FETCH_STATUS = 0   
BEGIN 
/*Select @RecKgs1=isnull(Sum(RecKgs),0) From Trs_Grn2 Where Stockid=@StockId1 and Id = @ID*/

 
 
Update ST_ProgBalance_Yarn SET DcKgs= isnull(DcKgs,0)- @DelKgs from ST_ProgBalance_Yarn A , DELETED  WHERE A.ordid=deleted.ordid and A.DeptId=@DeptID AND A.ColId=@ColId  AND A.CountId=@CntId

 

 FETCH NEXT FROM LINE_CURSOR INTO @Id,@DelKgs,@ColId,@CntID 
END 
CLOSE LINE_CURSOR     
DEALLOCATE LINE_CURSOR      
SET NOCOUNT OFF  
 
 


 