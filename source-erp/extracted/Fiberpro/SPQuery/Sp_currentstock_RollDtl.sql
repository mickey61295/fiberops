/*;=============================================   
; Author           :  Global Software's    
; Create date      :  22/11/2023    
; Create By        :  ASLAM 
; Description      :  SP FOR ROLLWISE STOCK
; Change Person    :  ASLAM
; Last Change Date : 23/11/2023 11.17 AM 
; =============================================  */  

CREATE PROCEDURE Sp_currentstock_RollDtl(@Ordid as int,@stockid as int,@styleno as varchar(20)='',@RollID int, @Type as  varchar(5),  @Rls as int=0,@Kgs as numeric(18,3)=0,@Mtrs as numeric(18,2)=0,@deptId int,@Flg  as Int,@delflg char(1),@FromStockId int = 0 , @RejRls as int
  =0, @RejKgs Numeric(18,3) =0, @RejMtrs As Numeric(18,2) =0, @RewrkRls as int =0 ,@RewrkKgs as Numeric(18,3) =0 , @RewrkMtrs as Numeric(18,2) =0 ) as  
  
begin  
SET @Rls  =1
	if @type='+'  and @DeptId <> -7  
	BEGIN  
	if Exists(select 1 from CurrentStock_RollDtl (nolock) where Ordid=@Ordid and stockid=@Stockid and styleno =@styleno and RollID=@RollID) 	
		Begin 	
			update CurrentStock_RollDtl set RollKgs=isnull(Rollkgs,0)+ @Kgs,RollMtrs=isNull(RollMtrs,0)+@Mtrs where ordid=@Ordid and stockid=@stockid and styleno=@styleno and		RollID=@RollID
		End 
		Else 	
		Begin		
			insert into CurrentStock_RollDtl (Ordid,stockid,styleno,RollId,RollKgs,RollMtrs) values (@Ordid,@stockid,@styleno,@RollID,@Kgs,@Mtrs)        	
		End     
	END  
	else if @Type= '+' and @DeptID = -7 and  @FromStockId >0   	
	BEGIN     
		if Exists(select 1 from CurrentStock_RollDtl (nolock) where Ordid=@Ordid and stockid=@Stockid and styleno =@styleno and Rollid=@Rollid and Frm_StockID=@FromStockId)      	
			Begin   
				update CurrentStock_RollDtl set RollKgs=RollKgs+ @Kgs,RollMtrs=RollMtrs+@Mtrs  where ordid=@Ordid and stockid=@stockid and styleno=@styleno and		Rollid=@RollID    and Frm_StockID =@FromStockId  			
			End         		
			Else       			
			Begin  		  				
				insert into CurrentStock_RollDtl (Ordid,stockid,styleno,RollId,RollKgs,RollMtrs,Frm_StockID) values (@Ordid,@stockid,@styleno,@RollID,@Kgs,@Mtrs,@FromStockId)        			
			End     	
	END  
	else if @Type= '+' and @DeptID = -7 and  @FromStockId =0   
	BEGIN      		
		if Exists(select 1 from CurrentStock_RollDtl (nolock) where Ordid=@Ordid and stockid=@Stockid and styleno =@styleno and Rollid=@Rollid )  
			Begin  				
				update CurrentStock_RollDtl set  RollKgs=RollKgs + @Kgs,RollMtrs=RollMtrs+@Mtrs  where ordid=@Ordid and stockid=@stockid and  styleno=@styleno and		Rollid=@Rollid    		
			End        	
		Else       			
		Begin  				
			insert into CurrentStock_RollDtl (Ordid,stockid,styleno,RollID,RollKgs,RollMtrs) values (@Ordid,@stockid,@styleno,@Rollid,@Kgs,@Mtrs)        				End     	
	END  
	else if @type='-' and @DeptId=11 and @Flg=0    	
	Begin  	
 		if Exists(select 1 from CurrentStock_RollDtl (nolock) where Ordid=@Ordid and stockid=@Stockid and styleno =@styleno and Rollid=@Rollid)       	
			Begin         				
				if @delflg ='N' 
				BEGIN
				update CurrentStock_RollDtl set RollKgs=RollKgs-@Kgs,RollMtrs=RollMtrs-@Mtrs  where ordid=@Ordid and stockid=@stockid  and rollid=@Rollid and	Styleno=@styleno  	
				END
				Else
				BEGIN
				  DELETE FROM CurrentStock_RollDtl WHERE ordid=@Ordid and stockid=@stockid  and rollid=@Rollid and	Styleno=@styleno
				END

			End       	
		Else      			
			Begin  							
				insert into CurrentStock_RollDtl (Ordid,stockid,styleno,rollid,rollKgs,rollMtrs) values (@Ordid,@stockid,@styleno,@Rollid,-@Kgs,-@Mtrs)       				End 	
	End    	
	else If  @type='-' and @DeptId=11 and @Flg<>0 	
		Begin     	
			if Exists(select 1 from CurrentStock_RollDtl (nolock) where Ordid=@Ordid and stockid=@Stockid and styleno =@styleno and rollid=@rollid)      	
				Begin  			
					update CurrentStock_RollDtl set RollKgs=RollKgs-@Kgs,RollMtrs=RollMtrs-@Mtrs where ordid=@Ordid and stockid=@stockid  and RollID=@Rollid and styleno=@styleno     	
				End      
			Else      	
				Begin  			
					insert into CurrentStock_RollDtl (Ordid,stockid,styleno,rollid,rollKgs,rollMtrs) values (@Ordid,@stockid,@styleno,@rollid,-@Kgs,-@Mtrs)    					
				End    	
		End 	
	Else If @type='-' and @DeptId<>11  	and @DeptId <>-7 	
	Begin    		
		if Exists (select 1 from CurrentStock_RollDtl (nolock) where Ordid=@Ordid and stockid=@Stockid and styleno =@styleno and rollid=@rollid)      	
			Begin  
				if @delflg ='N'		
				BEGIN
				update CurrentStock_RollDtl set RollKgs=RollKgs-@Kgs,RollMtrs=RollMtrs-@Mtrs where ordid=@Ordid and stockid=@stockid  and Rollid=@Rollid and		styleno=@styleno 
				END
				ELSE
				BEGIN
					DELETE FROM   CurrentStock_RollDtl WHERE ordid=@Ordid and stockid=@stockid  and Rollid=@Rollid and styleno=@styleno
				END
			End   
    	Else      	
		Begin  			
			insert into CurrentStock_RollDtl (Ordid,stockid,styleno,rollid,rollKgs,rollMtrs) values (@Ordid,@stockid,@styleno,@rollid,-@Kgs,-@Mtrs)    	
		End    	
	End  
	else if @type = '-' and @DeptId <>11 and @DeptId = -7 and @FromStockId >0  	
		begin   
			if Exists(select 1 from CurrentStock_RollDtl (nolock) where Ordid=@Ordid and stockid=@Stockid and styleno =@styleno and Rollid=@Rollid and	Frm_StockID =@FromStockId )      	
			Begin  			
				if @delflg ='N'
				BEGIN
						update CurrentStock_RollDtl set RollKgs=RollKgs-@Kgs,RollMtrs=RollMtrs-@Mtrs  where ordid=@Ordid and stockid=@stockid  and Rollid=@RollID and styleno=@styleno and Frm_StockID =	 @FromStockId 		
				END 
				ELSE 
				BEGIN
						DELETE FROM CurrentStock_RollDtl where ordid=@Ordid and stockid=@stockid  and Rollid=@RollID and styleno=@styleno and Frm_StockID =	 @FromStockId
				END

			End       	
		Else      	
			Begin  			
				insert into CurrentStock_RollDtl (Ordid,stockid,styleno,Rollid,RollKgs,RollMtrs,Frm_StockId) values (@Ordid,@stockid,@styleno,@Rollid,-@Kgs,-@Mtrs,@FromStockId)    	
			End  
	end   
	else if @type = '-' and @DeptId <>11 and @DeptId = -7 and @FromStockId =0  
		begin    
			if Exists(select 1 from CurrentStock_RollDtl (nolock) where Ordid=@Ordid and stockid=@Stockid and styleno =@styleno and Rollid=@Rollid )  
				Begin  
				if @delflg ='N'
				BEGIN
					 update CurrentStock_RollDtl set RollKgs=RollKgs-@Kgs,RollMtrs=RollMtrs-@Mtrs where ordid=@Ordid and stockid=@stockid  and Rollid=@Rollid and styleno=@styleno 
				END
				ELSE
					BEGIN
						DELETE FROM CurrentStock_RollDtl where ordid=@Ordid and stockid=@stockid  and Rollid=@Rollid and styleno=@styleno			
					END
				End       
			Else      	
				Begin  							
					insert into CurrentStock_RollDtl (Ordid,stockid,styleno,RollId,RollKgs,RollMtrs) values (@Ordid,@stockid,@styleno,@Rollid,-@Kgs,-@Mtrs)    					End  	
		end   	
End 