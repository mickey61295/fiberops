 /*                  
;=============================================                  
; Author  :  Global Software's                  
; Create date  :  18/Oct/2019                  
; Create By  :  ASLAM                  
; Description  :  Stored Procedure for Accessories Party Balance 
; Change Person  :  ASLAM                
; Last Change Date :  05/Dec/2019 10.00 AM                  
; =============================================   */ 
CREATE PROCEDURE Sp_POBalnce(@Ordid as int,@styleno as varchar(20)='',@TransType Varchar(100),@transFlg Varchar(5),@Qty Numeric(18,3),@deptid int,@PartyID int,@TransNo varchar(50),@TransDate DateTime, @ItemDesc varchar(500),@UOM varchar(10),@bgrl int,@mtr
 numeric(10,2)) as  
DECLARE @JobNo Int,@IoFinyear Char(2),@BuyOrdNo Varchar(30)
SELECT @styleno =''
SELECT @JobNo = JobNo From OrderMas Where OrdId=@OrdId 
SELECT @IoFinyear = Finyear From OrderMas Where OrdId=@OrdId 
SELECT @BuyOrdNo = BuyOrdNo From OrderMas Where OrdId=@OrdId 
begin  
if @TransType = 'PO'   
BEGIN    
  if Exists(select 1 from ST_PartyBalance_Abs (nolock) where Ordid=@Ordid and styleno =@styleno and  DeptID =@DeptID and PartyID =@PartyID and dcno = @TRANsno )      
	Begin  
		if @transFlg ='+'
		Begin   
			update ST_PartyBalance_Abs  set DCQty = ISNULL(dcQty,0) + @Qty , DcBgRl = ISNULL(DcBgRl,0) + @bgrl, DcMtr = isnull(DcMtr,0) + @mtr where Ordid=@Ordid and styleno =@styleno and  DeptID =@DeptID and PartyID =@PartyID and dcno = @TRANsno 
		End
		Else if @transFlg ='-'
		Begin
			update ST_PartyBalance_Abs  set DCQty = ISNULL(dcQty,0) - @Qty ,DcBgRl = ISNULL(DcBgRl,0) - @bgrl, DcMtr = isnull(DcMtr,0) - @mtr where ordid=@Ordid and styleno=@styleno and DeptID =@deptID and PartyID = @PartyID and dcno =	@TRANsno 
		End
	End      
	Else     
		Begin  		
			insert into ST_PartyBalance_Abs (Ordid , styleno ,jobno,iofinyear,BuyordNo, Deptid ,DcNo , DcDate , PartyId, dcitemDesc,DcQty , DCUOM,DcBgRl,DcMtr) VALUES	(@Ordid , @styleno ,@jobno,@IoFinyear,@BuyOrdNo, @deptID , @TransNo , @TransDate , @PartyId ,@ItemDesc , @Qty , @UOM,@bgrl,@mtr)      
		End    
END    
ELSE if @TransType = 'GRN'   
BEGIN    
  if Exists(select 1 from ST_PartyBalance_Abs (nolock) where Ordid=@Ordid and styleno =@styleno and  DeptID =@DeptID and PartyID =@PartyID and dcno = @TRANsno )      
	Begin  
		if @transFlg ='+'
		Begin   
			update ST_PartyBalance_Abs  set GrnQty = ISNULL(GrnQty,0) + @Qty,GrnBgRl= ISNULL(GrnBgRl,0)- @bgrl,GrnMtr = ISNULL(GrnMtr,0) - @mtr, GrnItemDesc = @ItemDesc  where ordid=@Ordid and styleno=@styleno and DeptID =@deptID and PartyID = @PartyID and dcno =@TransNo 
		End
		Else if @transFlg ='-'
		Begin
		update ST_PartyBalance_Abs  set GrnQty = ISNULL(GrnQty,0) - @Qty ,GrnBgRl= ISNULL(GrnBgRl,0)- @bgrl,GrnMtr = ISNULL(GrnMtr,0) - @mtr where ordid=@Ordid and styleno=@styleno and DeptID =@deptID and PartyID = @PartyID and dcno =	@TRANsno 
		End
	End      
	Else     
		Begin  		
			insert into ST_PartyBalance_Abs (Ordid , styleno , JobNo,IoFinyear,BuyOrdNo, Deptid , PartyID , GrnItemDesc , GrnQty , GRNUOM,GrnBgRl,GrnMtr) VALUES	(@Ordid , @styleno,@JobNo,@IoFinyear,@BuyOrdNo , @deptID , @PartyId , @ItemDesc ,@Qty , @UOM,@bgrl,@mtr)      
		End    
END    
END
