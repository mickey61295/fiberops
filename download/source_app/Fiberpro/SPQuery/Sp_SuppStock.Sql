/*;=============================================   

; Author           :  Global Software's    

; Create date      :  25/06/2021    

; Create By        :  Karthick.M  

; Description      :  Acc.Supplier_Stock  

; Change Person    :  ASLAM

; Last Change Date :  25/06/2021 10.15 AM 

; =============================================  */  

CREATE Procedure Sp_SuppStock(@Ordid as int,@stockid as int,@styleno as varchar(20)='',@Godid int , @Type as  varchar(5),  

@Rls as int=0,@Kgs as numeric(18,3)=0,@Mtrs as numeric(18,2)=0,@DeptId as Int,@Flg  as Int ) as  begin  

Declare @AType int,@ADes int,@SizeId int , @ColId int 



SELECT @AType = AType From StockTable where StockID = @StockID

SELECT @ADes = Ades From StockTable where StockID = @StockID

SELECT @SizeId = Siz From StockTable where StockID = @StockID

SELECT @ColId = ColID From StockTable where StockID = @StockID



if @type='+'    

BEGIN    

if Exists(select 1 from SupplierStock (nolock) where AType=@Atype And ADes = @Ades And Siz = @SizeId And ColID =@ColID and SuppGodid=@Godid)   

Begin   

	update SupplierStock set Bg=Bg+@Rls, Qty=Qty+ @Kgs,Mtr=Mtr+@Mtrs where AType=@Atype And ADes = @Ades And Siz = @SizeId And ColID =@ColID and	    SuppGodid=@Godid  

End 	

Else  

Begin  

insert into SupplierStock (AType,Ades,Siz,ColId,SuppGodid,Bg,Qty,Mtr) values (@AType,@ADes,@SizeId,@Colid	,@Godid,@Rls,@Kgs,@Mtrs)	

End  

END   

Else If @type='-'  and @DeptId<>11  	

Begin    		

if Exists(select 1 from SupplierStock (nolock) where AType=@Atype And ADes = @Ades And Siz = @SizeId And ColID =@ColID and SuppGodid=@Godid)      	Begin  			

update SupplierStock set Bg=Bg-@Rls, Qty=Qty-@Kgs,Mtr=Mtr-@Mtrs where AType=@Atype And ADes = @Ades And Siz = @SizeId And ColID =@ColID and SuppGodid=@Godid    	

End       	

Else      	

Begin  			

insert into SupplierStock (AType,Ades,Siz,ColId,SuppGodid,Bg,Qty,Mtr) values (@AType,@ADes,@SizeId,@Colid,@Godid,-@Rls,-@Kgs,-@Mtrs)    	

End    	

End 	

End
