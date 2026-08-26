 /*                  

;=============================================                  

; Author  :  Global Software's                  

; Create date  :  29/Jul/2021                  

; Create By  :  ASLAM                  

; Description  :  Stored Procedure for Supplier Production Details 

; Change Person  :  ASLAM                

; Last Change Date :  29/Jul/2021 10.00 AM                  

; =============================================   */ 

CREATE PROCEDURE SP_ST_Supp_Production_Data(@Coycode int,@Ordid as int,@styleno as varchar(20)='',@PartID int,@ColID int,@SizeId int,@StageId int,@Qty int,@TransType Varchar(100),@transFlg Varchar(5)) as  

begin  

if @TransType = 'PRDN'   

BEGIN    

  if Exists(select 1 from ST_Supp_Production_Data (nolock) where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId )      

	Begin  

		if @transFlg ='+'

		Begin   

			update ST_Supp_Production_Data  set ProdQty = ISNULL(ProdQty,0) + @Qty  where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId 

		End

		Else if @transFlg ='-'

		Begin

			update ST_Supp_Production_Data  set ProdQty = ISNULL(ProdQty,0) - @Qty  where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId 

		End

	End      

	Else     

		Begin  		

			insert into ST_Supp_Production_Data (Coycode,Ordid , styleno , PartID , ColID, SizeID , StageID , ProdQty ) VALUES	(@Coycode, @Ordid , @styleno , @PartID , @ColId , @SizeID , @StageID , @Qty)       

		End    

END

ELSE if @TransType = 'DC'   

BEGIN    

  if Exists(select 1 from ST_Supp_Production_Data (nolock) where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId )      

	Begin  

		if @transFlg ='+'

		Begin   

			update ST_Supp_Production_Data  set DCQty = ISNULL(DCQty,0) + @Qty  where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId 

		End

		Else if @transFlg ='-'

		Begin

			update ST_Supp_Production_Data  set DCQty = ISNULL(DCQty,0) - @Qty  where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId 

		End

	End      

	Else     

		Begin  		

			insert into ST_Supp_Production_Data (Coycode,Ordid , styleno , PartID , ColID, SizeID , StageID , ProdQty,DCQty ) VALUES	(@Coycode, @Ordid , @styleno , @PartID , @ColId , @SizeID , @StageID ,0, @Qty)       

		End    

END    

ELSE if @TransType = 'GRN'   

BEGIN    

  if Exists(select 1 from ST_Supp_Production_Data (nolock) where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId )      

	Begin  

		if @transFlg ='+'

		Begin   

			update ST_Supp_Production_Data  set GRNQty = ISNULL(GRNQty,0) + @Qty  where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId 

		End

		Else if @transFlg ='-'

		Begin

			update ST_Supp_Production_Data  set GRNQty = ISNULL(GRNQty,0) - @Qty  where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId 

		End

	End      

	Else     

		Begin  		

			insert into ST_Supp_Production_Data (Coycode,Ordid , styleno , PartID , ColID, SizeID , StageID , ProdQty,DCQty,GRNQty ) VALUES	(@Coycode, @Ordid , @styleno , @PartID , @ColId , @SizeID , @StageID ,0, 0,@Qty)       

		End    

END   

ELSE if @TransType = 'REJ'   

BEGIN    

  if Exists(select 1 from ST_Supp_Production_Data (nolock) where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId )      

	Begin  

		if @transFlg ='+'

		Begin   

			update ST_Supp_Production_Data  set RejQty = ISNULL(RejQty,0) + @Qty  where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId 

		End

		Else if @transFlg ='-'

		Begin

			update ST_Supp_Production_Data  set RejQty = ISNULL(RejQty,0) - @Qty  where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId 

		End

	End      

	Else     

		Begin  		

			insert into ST_Supp_Production_Data (Coycode,Ordid , styleno , PartID , ColID, SizeID , StageID , ProdQty,DCQty,GRNQty,RejQty ) VALUES	(@Coycode, @Ordid , @styleno , @PartID , @ColId , @SizeID , @StageID ,0, 0,0,@Qty)       

		End    

END

ELSE if @TransType = 'REWRK'   

BEGIN    

  if Exists(select 1 from ST_Supp_Production_Data (nolock) where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId )      

	Begin  

		if @transFlg ='+'

		Begin   

			update ST_Supp_Production_Data  set ReworkQty = ISNULL(ReworkQty,0) + @Qty  where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId 

		End

		Else if @transFlg ='-'

		Begin

			update ST_Supp_Production_Data  set ReworkQty = ISNULL(ReworkQty,0) - @Qty  where Coycode = @Coycode and Ordid=@Ordid and styleno =@styleno and PartID =@PartId and ColId = @ColID and SizeID = @SizeId and StageId = @StageId 

		End

	End      

	Else     

		Begin  		

			insert into ST_Supp_Production_Data (Coycode,Ordid , styleno , PartID , ColID, SizeID , StageID , ProdQty,DCQty,GRNQty,RejQty,ReworkQty ) VALUES	(@Coycode, @Ordid , @styleno , @PartID , @ColId , @SizeID , @StageID ,0, 0,0,0,@Qty)       

		End    

END   

   

END