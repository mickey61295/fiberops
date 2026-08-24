 /*                  
;=============================================                  
; Author  :  Global Software's                  
; Create date  :  18/Oct/2019                  
; Create By  :  ASLAM                  
; Description  :  Stored Procedure for Accessories Party Balance 
; Change Person  :  ASLAM                
; Last Change Date :  04/Dec/2019 10.00 AM                  
; =============================================   */ 
CREATE PROCEDURE Sp_Acc_PartyBalance(@Ordid as int,@styleno as varchar(20)='',@TransType Varchar(100),@transFlg Varchar(5),@Qty Numeric(18,3),@deptid int,@PartyID int,@TransNo varchar(50),@TransDate DateTime, @ItemDesc varchar(500),@UOM varchar(10),@Acc_ID int) as  
begin  
if @TransType = 'PO'   
BEGIN    
  if Exists(select 1 from ST_Acc_PartyBal_Abs (nolock) where Ordid=@Ordid and styleno =@styleno and  DeptID =@DeptID and PartyID =@PartyID and po_dc_no = @TRANsno and Acc_ID= @Acc_ID)      
	Begin  
		if @transFlg ='+'
		Begin   
			update ST_Acc_PartyBal_Abs  set PO_DC_Qty = ISNULL(PO_DC_Qty,0) + @Qty  where ordid=@Ordid and styleno=@styleno and DeptID =@deptID and PartyID = @PartyID and po_dc_no =	@TRANsno and Acc_ID = @Acc_ID 
		End
		Else if @transFlg ='-'
		Begin
			update ST_Acc_PartyBal_Abs  set PO_DC_Qty = ISNULL(PO_DC_Qty,0) - @Qty  where ordid=@Ordid and styleno=@styleno and DeptID =@deptID and PartyID = @PartyID and po_dc_no =	@TRANsno And Acc_ID = @Acc_ID
		End
	End      
	Else     
		Begin  		
			insert into ST_Acc_PartyBal_Abs (Ordid , styleno , Deptid , PartyID , PO_Dc_NO , PO_Dc_Date , PO_DC_ItemDesc , PO_DC_Qty , DCUOM,Acc_Id,poflg) VALUES	(@Ordid , @styleno , @deptID ,             @PartyId , @TransNo , @TransDate , @ItemDesc , @Qty , @UOM,
@Acc_ID,1)      
		End    
END    
ELSE if @TransType = 'GRN'   
BEGIN    
  if Exists(select 1 from ST_Acc_PartyBal_Abs (nolock) where Ordid=@Ordid and styleno =@styleno and  DeptID =@DeptID and PartyID =@PartyID and po_dc_no = @TRANsno and Acc_ID= @Acc_ID)      
	Begin  
		if @transFlg ='+'
		Begin   
			update ST_Acc_PartyBal_Abs  set GrnQty = ISNULL(GrnQty,0) + @Qty,GRN_ItemDesc = @ItemDesc  where ordid=@Ordid and styleno=@styleno and DeptID =@deptID and PartyID = @PartyID and po_dc_no =@TransNo and Acc_ID= @Acc_ID
		End
		Else if @transFlg ='-'
		Begin
		update ST_Acc_PartyBal_Abs  set GrnQty = ISNULL(GrnQty,0) - @Qty  where ordid=@Ordid and styleno=@styleno and DeptID =@deptID and PartyID = @PartyID and po_dc_no =	@TRANsno and Acc_ID= @Acc_ID
		End
	End      
	Else     
		Begin  		
			insert into ST_Acc_PartyBal_Abs (Ordid , styleno , Deptid , PartyID , GRN_ItemDesc , GrnQty , GRNUOM,Acc_ID) VALUES	(@Ordid , @styleno , @deptID , @PartyId , @ItemDesc ,				@Qty , @UOM,@Acc_ID)      
		End    
END    
ELSE if @TransType = 'DC'   
BEGIN    
  if Exists(select 1 from ST_Acc_PartyBal_Abs (nolock) where Ordid=@Ordid and styleno =@styleno and  DeptID =@DeptID and PartyID =@PartyID and po_dc_no = @TRANsno)      
	Begin  
		if @transFlg ='+'
		Begin   
			update ST_Acc_PartyBal_Abs  set PO_DC_Qty = ISNULL(PO_DC_Qty,0) + @Qty,PO_DC_ItemDesc = @ItemDesc  where ordid=@Ordid and styleno=@styleno and DeptID =@deptID and PartyID = @PartyID and po_dc_no =@TransNo 
		End
		Else if @transFlg ='-'
		Begin
			update ST_Acc_PartyBal_Abs  set PO_DC_Qty = ISNULL(PO_DC_Qty,0) - @Qty,PO_DC_ItemDesc = @ItemDesc  where ordid=@Ordid and styleno=@styleno and DeptID =@deptID and PartyID = @PartyID  and po_dc_no =	@TRANsno
		End
	End      
	Else     
		Begin  		
			insert into ST_Acc_PartyBal_Abs (Ordid , styleno , Deptid , PartyID , PO_Dc_NO , PO_Dc_Date , PO_DC_ItemDesc , PO_DC_Qty , DCUOM,Acc_ID) VALUES	(@Ordid , @styleno , @deptID ,             @PartyId , @TransNo , @TransDate , @ItemDesc , @Qty , @UOM,@Acc_ID)     
		End    
END    
END