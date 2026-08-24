 /*                  
;=============================================                  
; Author  :  Global Software's                  
; Create date  :  18/Oct/2019                  
; Create By  :  ASLAM                  
; Description  :  Stored Procedure for Production Details 
; Change Person  :  ASLAM                
; Last Change Date :  23/Oct/2024 11.00 AM                  
; =============================================   */ 
CREATE PROCEDURE SP_ST_Production_Data(@Coycode int,@Ordid as int,@styleno as varchar(20)='',@PartID int,@ColID int,@SizeId int,@StageId int,@Qty int,@TransType Varchar(100),@transFlg Varchar(5),@PartyId int) as  
begin  
if @TransType = 'PRDN'   
BEGIN    
  if Exists(select 1 from ST_Production_Data (nolock) where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId )      
	Begin  
	if @transFlg ='+'
		Begin   
			update ST_Production_Data  set ProdQty = ISNULL(ProdQty,0) + @Qty  where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId 
		End
	Else if @transFlg ='-'
		Begin
			update ST_Production_Data  set ProdQty = ISNULL(ProdQty,0) - @Qty  where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId 
		End
	End      
 Else     
 	Begin  		
	 	insert into ST_Production_Data (Coycode,Ordid , styleno , PartID , ColID, SizeID , StageID , ProdQty ) VALUES	(@Coycode, @Ordid , @styleno , @PartID , @ColId , @SizeID , @StageID , @Qty)       
		End    
END
ELSE if @TransType = 'DC'   
BEGIN    
  if Exists(select 1 from ST_Production_Data (nolock) where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId and PArtyID = @PartyId)      
	Begin  
		if @transFlg ='+'
		Begin   
			update ST_Production_Data  set DCQty = ISNULL(DCQty,0) + @Qty  where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId and PArtyID = @PartyId
		End
		Else if @transFlg ='-'
		Begin
			update ST_Production_Data  set DCQty = ISNULL(DCQty,0) - @Qty  where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId and PArtyID = @PartyId

		
			update ST_Production_Data  set OrderQty = 0 ,OrderWithExsQty =0 where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId and PArtyID = @PartyId And IsNull(ProdQty,0) =0 And IsNull(DCQty,0) =0 AND IsNull(GRNQty,0) =0 AND isnull(RejQty,0) = 0
		
			/*
			if exists(select count(1) from ST_Production_Data (nolock) where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId and PArtyID = @PartyId and IsNull(ProdQty,0) =0 And IsNull(DCQty,0) =0 AND IsNull(GRNQty,0) =0 AND isnull(RejQty,0) = 0 )
			Begin
				delete from ST_Production_Data   where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId and PArtyID = @PartyId
			End */

		End
	End      
	Else     
		Begin  		
			insert into ST_Production_Data (Coycode,Ordid , styleno , PartID , ColID, SizeID , StageID , ProdQty,DCQty ,PartyID) VALUES	(@Coycode, @Ordid , @styleno , @PartID , @ColId , @SizeID , @StageID ,0, @Qty,@PartyId)       
		End    
END    
ELSE if @TransType = 'GRN'   
BEGIN    
  if Exists(select 1 from ST_Production_Data (nolock) where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId and PArtyID = @PartyId )      
	Begin  
		if @transFlg ='+'
		Begin   
			update ST_Production_Data  set GRNQty = ISNULL(GRNQty,0) + @Qty  where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId and PArtyID = @PartyId
		End
		Else if @transFlg ='-'
		Begin
			update ST_Production_Data  set GRNQty = ISNULL(GRNQty,0) - @Qty  where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId and PArtyID = @PartyId
		End
	End      
	Else     
		Begin  		

			insert into ST_Production_Data (Coycode,Ordid , styleno , PartID , ColID, SizeID , StageID , ProdQty,DCQty,GRNQty,PartyID ) VALUES	(@Coycode, @Ordid , @styleno , @PartID , @ColId , @SizeID , @StageID ,0, 0,@Qty,@PartyId)       
		End    
END   
ELSE if @TransType = 'REJ'   
BEGIN    
  if Exists(select 1 from ST_Production_Data (nolock) where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId and PArtyID = @PartyId)      
	Begin  
		if @transFlg ='+'
		Begin   
			update ST_Production_Data  set RejQty = ISNULL(RejQty,0) + @Qty  where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId and PArtyID = @PartyId
		End
		Else if @transFlg ='-'
		Begin
			update ST_Production_Data  set RejQty = ISNULL(RejQty,0) - @Qty  where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId and PArtyID = @PartyId
		End
	End      
	Else     
		Begin  		
		insert into ST_Production_Data (Coycode,Ordid , styleno , PartID , ColID, SizeID , StageID , ProdQty,DCQty,GRNQty,RejQty,PartyID ) VALUES	(@Coycode, @Ordid , @styleno , @PartID , @ColId , @SizeID , @StageID ,0, 0,0,@Qty,@PartyId)       
		End    
END
ELSE if @TransType = 'REWRK'   
BEGIN    
  if Exists(select 1 from ST_Production_Data (nolock) where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId )      
	Begin  
		if @transFlg ='+'
		Begin   
			update ST_Production_Data  set ReworkQty = ISNULL(ReworkQty,0) + @Qty  where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId 
		End
		Else if @transFlg ='-'
		Begin
			update ST_Production_Data  set ReworkQty = ISNULL(ReworkQty,0) - @Qty  where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId 
		End
	End      
	Else     
		Begin  		
			insert into ST_Production_Data (Coycode,Ordid , styleno , PartID , ColID, SizeID , StageID , ProdQty,DCQty,GRNQty,RejQty,ReworkQty ) VALUES	(@Coycode, @Ordid , @styleno , @PartID , @ColId , @SizeID , @StageID ,0, 0,0,0,@Qty)       
		End    
END   
END