 /*
;=============================================            
; Author  :  Global Software's            
; Create date  :  25/NOV/2025            
; Create By  :  ASLAM            
; Description  :  Trigger for ST_PRogbalance_Yarn
; Change Person  :  ASLAM          
; Last Change Date :  26/NOV/2025 10.00 AM            
; =============================================   */     

CREATE TRIGGER [dbo].[TRG_YARN_BALANCE_GRN_DEL] ON [dbo].[Trs_GRN2] AFTER DELETE AS DECLARE @OrdId int,@StyleNo Varchar(20),@DeptID int,@ColId int,@CntId int,@RecKgs numeric (18,3),@Cnt int,@Id Int,@StockId Int,@StockId1 Int,@RecKgs1 numeric (18,3) 
SELECT @OrdId = OrdId FROM DELETED 
SELECT @Id = Id FROM DELETED 
SELECT @StockId = StockId FROM DELETED  
SELECT @StyleNo = ''  
SELECT @DeptId = Dept From Trs_Grn1 Where Id=@Id  
SELECT @ColId = ColId From StockTable Where StockId=@StockId    
SELECT @CntId = CntID From StockTable Where StockId=@StockId  
SELECT @RecKgs = RecKgs FROM DELETED 
SELECT @Cnt = COUNT(OrdId) from ST_ProgBalance_Yarn WHERE OrdId=@OrdId and StyleNo=@StyleNo and DeptId= @DeptId AND ColId = @ColId AND CountId = @CntId   

IF @Cnt>0  
begin  
Select @RecKgs = Sum(RecKgs) From Trs_Grn1 Inner Join Trs_Grn2 On Trs_Grn1.Id=Trs_Grn2.Id Inner Join StockTable On Trs_Grn2.StockId=StockTable.StockId WHERE Trs_Grn2.OrdId=@OrdId and Trs_Grn1.Dept=@DeptId AND ColId=@ColId AND CntId=@CntId And GrnType In ('Purchase','Process') 

begin  

DECLARE LINE_CURSOR CURSOR FOR  select ID,RecKgs,StockID from DELETED WHERE ID =@ID  OPEN LINE_CURSOR     
FETCH NEXT FROM LINE_CURSOR INTO  @Id,@RecKgs1,@StockID1 

WHILE @@FETCH_STATUS = 0   
BEGIN 
/*Select @RecKgs1=isnull(Sum(RecKgs),0) From Trs_Grn2 Where Stockid=@StockId1 and Id = @ID*/
SELECT @ColId = ColId From StockTable Where StockId=@StockId1     
SELECT @CntId = CntID From StockTable Where StockId=@StockId1  
 
 
 
Update ST_ProgBalance_Yarn SET GrnKgs= isnull(grnkgs,0)- @RecKgs1 from ST_ProgBalance_Yarn A , DELETED , StockTable B WHERE A.ordid=deleted.ordid and A.DeptId=@DeptID AND A.ColId=B.ColID  AND A.CountId=b.CntID and b.stockid=deleted.stockid   and A.ColId =@ColId And A.CountId = @CntId 

Update ST_ProgBalance_Yarn SET ReqBalanceKgs=IsNull(ReqKgs,0) - (isnull(grnkgs,0)+ Isnull(TransinKgs,0) - isnull(delRetKgs,0) - IsNull(transOutKgs,0))  from ST_ProgBalance_Yarn A , DELETED , StockTable B  

WHERE A.ordid = deleted.ordid and A.DeptId=@DeptID AND A.ColId=B.ColID  AND A.CountId=b.CntID and b.stockid=deleted.stockid  FETCH NEXT FROM LINE_CURSOR INTO @Id,@RecKgs1,@StockID1  
END 
CLOSE LINE_CURSOR     
DEALLOCATE LINE_CURSOR      
SET NOCOUNT OFF  
END 
END 
 