 /*                  
;=============================================                  
; Author  :  Global Software's                  
; Create date  :  18/Oct/2019                  
; Create By  :  ASLAM                  
; Description  :  Stored Procedure for Accessories PRogram Balance 
; Change Person  :  ASLAM                
; Last Change Date :  25/Jun/2025 10.00 AM                  
; =============================================   */ 

CREATE Procedure Sp_AccTransaction(@Ordid as int,@styleno as varchar(20)='',@Atype int,@Ades int, @AClr int,@Asize int,@TransType Varchar(100),@transFlg Varchar(5),@Qty Numeric(18,3) ) as  
begin  
if @transFlg='+' and @TransType = 'NEW'   
BEGIN    
  if Exists(select 1 from ST_Acc_Prog_Balance (nolock) where Ordid=@Ordid and styleno =@styleno and AType=@AType And ADes =@Ades And Acol = @AClr And ASize=@asize)      
	Begin     
		update ST_Acc_Prog_Balance  set ReqQty = ISNULL(REQQTY,0) + @Qty  where ordid=@Ordid and styleno=@styleno and Atype=@Atype And				Ades=@Ades and Acol = @AClr And Asize = @Asize 
	End      
	Else     
		Begin  		
			insert into ST_Acc_Prog_Balance (Ordid,styleno,Atype,Ades,Acol,Asize,ReqQty) values					(@Ordid,@styleno,@Atype,@Ades,@AClr,@Asize,@Qty)      
		End    
END    
ELSE IF @transFlg='-' AND @TransType = 'NEW'   
BEGIN

if Exists(select 1 from ST_Acc_Prog_Balance (nolock) where Ordid=@Ordid and styleno =@styleno and AType=@AType And ADes =@Ades And Acol = @AClr And ASize=@asize)      
	Begin     
		if (select isnull(Sum(ReqQty),0) from ST_Acc_Prog_Balance (nolock) where Ordid=@Ordid and styleno =@styleno and AType=@AType And ADes =@Ades And Acol = @AClr And ASize=@asize) > 0
			BEGIN
		update ST_Acc_Prog_Balance  set ReqQty = ISNULL(REQQTY,0) - @Qty  where ordid=@Ordid and styleno=@styleno and Atype=@Atype And				Ades=@Ades and Acol = @AClr And Asize = @Asize 
			END
	End      
END

ELSE IF @transFlg='+' AND @TransType = 'PO'   
BEGIN
if Exists(select 1 from ST_Acc_Prog_Balance (nolock) where Ordid=@Ordid and styleno =@styleno and AType=@AType And ADes =@Ades And Acol = @AClr And ASize=@asize)      
	Begin     
		update ST_Acc_Prog_Balance  set POQty = ISNULL(POQty,0) + @Qty  where ordid=@Ordid and styleno=@styleno and Atype=@Atype And				Ades=@Ades and Acol = @AClr And Asize = @Asize 
	End      
ELSE
BEGIN
			insert into ST_Acc_Prog_Balance (Ordid,styleno,Atype,Ades,Acol,Asize,POQty) values 				(@Ordid,@styleno,@Atype,@Ades,@AClr,@Asize,@Qty)      

END

END
ELSE IF @transFlg='-' AND @TransType = 'PO'   
BEGIN
if Exists(select 1 from ST_Acc_Prog_Balance (nolock) where Ordid=@Ordid and styleno =@styleno and AType=@AType And ADes =@Ades And Acol = @AClr And ASize=@asize)      
	Begin     
		update ST_Acc_Prog_Balance  set POQty = ISNULL(POQty,0) - @Qty  where ordid=@Ordid and styleno=@styleno and Atype=@Atype And				Ades=@Ades and Acol = @AClr And Asize = @Asize 
	End      
ELSE
BEGIN
			insert into ST_Acc_Prog_Balance (Ordid,styleno,Atype,Ades,Acol,Asize,POQty) values 				(@Ordid,@styleno,@Atype,@Ades,@AClr,@Asize,@Qty)      

END

END


ELSE IF @transFlg='+' AND @TransType = 'GRN'   
BEGIN
if Exists(select 1 from ST_Acc_Prog_Balance (nolock) where Ordid=@Ordid and styleno =@styleno and AType=@AType And ADes =@Ades And Acol = @AClr And ASize=@asize)      
	Begin     
		update ST_Acc_Prog_Balance  set RECQty = ISNULL(RECQty,0) + @Qty  where ordid=@Ordid and styleno=@styleno and Atype=@Atype And				Ades=@Ades and Acol = @AClr And Asize = @Asize 
	End      
ELSE
BEGIN
			insert into ST_Acc_Prog_Balance (Ordid,styleno,Atype,Ades,Acol,Asize,RECQty) values 				(@Ordid,@styleno,@Atype,@Ades,@AClr,@Asize,@Qty)      

END

END
ELSE IF @transFlg='-' AND @TransType = 'GRN'   
BEGIN
if Exists(select 1 from ST_Acc_Prog_Balance (nolock) where Ordid=@Ordid and styleno =@styleno and AType=@AType And ADes =@Ades And Acol = @AClr And ASize=@asize)      
	Begin     
		update ST_Acc_Prog_Balance  set RECQty = ISNULL(RECQty,0) - @Qty  where ordid=@Ordid and styleno=@styleno and Atype=@Atype And				Ades=@Ades and Acol = @AClr And Asize = @Asize 
	End      
ELSE
BEGIN
			insert into ST_Acc_Prog_Balance (Ordid,styleno,Atype,Ades,Acol,Asize,RECQty) values 				(@Ordid,@styleno,@Atype,@Ades,@AClr,@Asize,@Qty)      

END

END

ELSE IF @transFlg='+' AND @TransType = 'RET'   
BEGIN
if Exists(select 1 from ST_Acc_Prog_Balance (nolock) where Ordid=@Ordid and styleno =@styleno and AType=@AType And ADes =@Ades And Acol = @AClr And ASize=@asize)      
	Begin     
		update ST_Acc_Prog_Balance  set RETQty = ISNULL(RETQty,0) + @Qty  where ordid=@Ordid and styleno=@styleno and Atype=@Atype And				Ades=@Ades and Acol = @AClr And Asize = @Asize 
	End      
ELSE
BEGIN
			insert into ST_Acc_Prog_Balance (Ordid,styleno,Atype,Ades,Acol,Asize,RETQty) values 				(@Ordid,@styleno,@Atype,@Ades,@AClr,@Asize,@Qty)      

END

END
ELSE IF @transFlg='-' AND @TransType = 'RET'   
BEGIN
if Exists(select 1 from ST_Acc_Prog_Balance (nolock) where Ordid=@Ordid and styleno =@styleno and AType=@AType And ADes =@Ades And Acol = @AClr And ASize=@asize)      
	Begin     
		update ST_Acc_Prog_Balance  set RETQty = ISNULL(RETQty,0) - @Qty  where ordid=@Ordid and styleno=@styleno and Atype=@Atype And				Ades=@Ades and Acol = @AClr And Asize = @Asize 
	End      
ELSE
BEGIN
			insert into ST_Acc_Prog_Balance (Ordid,styleno,Atype,Ades,Acol,Asize,RETQty) values 				(@Ordid,@styleno,@Atype,@Ades,@AClr,@Asize,@Qty)      

END
END
ELSE IF @transFlg='+' AND @TransType = 'DC'   
BEGIN
if Exists(select 1 from ST_Acc_Prog_Balance (nolock) where Ordid=@Ordid and styleno =@styleno and AType=@AType And ADes =@Ades And Acol = @AClr And ASize=@asize)      
	Begin     
		update ST_Acc_Prog_Balance  set RECQty = ISNULL(RECQty ,0) + @Qty  where ordid=@Ordid and styleno=@styleno and Atype=@Atype And				Ades=@Ades and Acol = @AClr And Asize = @Asize 
	End      
ELSE
BEGIN
			insert into ST_Acc_Prog_Balance (Ordid,styleno,Atype,Ades,Acol,Asize,RECQty) values 				(@Ordid,@styleno,@Atype,@Ades,@AClr,@Asize,@Qty)      

END

END
ELSE IF @transFlg='-' AND @TransType = 'DC'   
BEGIN
if Exists(select 1 from ST_Acc_Prog_Balance (nolock) where Ordid=@Ordid and styleno =@styleno and AType=@AType And ADes =@Ades And Acol = @AClr And ASize=@asize)      
	Begin     
		update ST_Acc_Prog_Balance  set RECQty = ISNULL(RECQty ,0) - @Qty  where ordid=@Ordid and styleno=@styleno and Atype=@Atype And				Ades=@Ades and Acol = @AClr And Asize = @Asize 
	End      
ELSE
BEGIN
			insert into ST_Acc_Prog_Balance (Ordid,styleno,Atype,Ades,Acol,Asize,RECQty) values 				(@Ordid,@styleno,@Atype,@Ades,@AClr,@Asize,@Qty)      

END

END
ELSE IF @transFlg='+' AND @TransType = 'PRSDC'   
BEGIN
if Exists(select 1 from ST_Acc_Prog_Balance (nolock) where Ordid=@Ordid and styleno =@styleno and AType=@AType And ADes =@Ades And Acol = @AClr And ASize=@asize)      
	Begin     
		update ST_Acc_Prog_Balance  set DELQty = ISNULL(DELQty ,0) + @Qty  where ordid=@Ordid and styleno=@styleno and Atype=@Atype And				Ades=@Ades and Acol = @AClr And Asize = @Asize 
	End      
ELSE
BEGIN
			insert into ST_Acc_Prog_Balance (Ordid,styleno,Atype,Ades,Acol,Asize,DelQty) values 				(@Ordid,@styleno,@Atype,@Ades,@AClr,@Asize,@Qty)      

END

END
ELSE IF @transFlg='-' AND @TransType = 'PRSDC'   
BEGIN
if Exists(select 1 from ST_Acc_Prog_Balance (nolock) where Ordid=@Ordid and styleno =@styleno and AType=@AType And ADes =@Ades And Acol = @AClr And ASize=@asize)      
	Begin     
		update ST_Acc_Prog_Balance  set DELQty = ISNULL(DELQty ,0) - @Qty  where ordid=@Ordid and styleno=@styleno and Atype=@Atype And				Ades=@Ades and Acol = @AClr And Asize = @Asize 
	End      
ELSE
BEGIN
			insert into ST_Acc_Prog_Balance (Ordid,styleno,Atype,Ades,Acol,Asize,DELQty) values 				(@Ordid,@styleno,@Atype,@Ades,@AClr,@Asize,@Qty)      

END
END
ELSE IF @transFlg='+' AND @TransType = 'ISSRET'   
BEGIN
if Exists(select 1 from ST_Acc_Prog_Balance (nolock) where Ordid=@Ordid and styleno =@styleno and AType=@AType And ADes =@Ades And Acol = @AClr And ASize=@asize)      
	Begin     
		update ST_Acc_Prog_Balance  set ProRetQty = ISNULL(ProRetQty,0) + @Qty  where ordid=@Ordid and styleno=@styleno and Atype=@Atype And				Ades=@Ades and Acol = @AClr And Asize = @Asize 
	End      
ELSE
BEGIN
			insert into ST_Acc_Prog_Balance (Ordid,styleno,Atype,Ades,Acol,Asize,ProRetQty) values 				(@Ordid,@styleno,@Atype,@Ades,@AClr,@Asize,@Qty)      

END

END
ELSE IF @transFlg='-' AND @TransType = 'ISSRET'   
BEGIN
if Exists(select 1 from ST_Acc_Prog_Balance (nolock) where Ordid=@Ordid and styleno =@styleno and AType=@AType And ADes =@Ades And Acol = @AClr And ASize=@asize)      
	Begin     
		update ST_Acc_Prog_Balance  set ProRetQty = ISNULL(ProRetQty,0) - @Qty  where ordid=@Ordid and styleno=@styleno and Atype=@Atype And				Ades=@Ades and Acol = @AClr And Asize = @Asize 
	End      
ELSE
BEGIN
			insert into ST_Acc_Prog_Balance (Ordid,styleno,Atype,Ades,Acol,Asize,ProRetQty) values 				(@Ordid,@styleno,@Atype,@Ades,@AClr,@Asize,@Qty)      

END
END
ELSE IF @transFlg='+' AND @TransType = 'TRANOUT'   
BEGIN
if Exists(select 1 from ST_Acc_Prog_Balance (nolock) where Ordid=@Ordid and styleno =@styleno and AType=@AType And ADes =@Ades And Acol = @AClr And ASize=@asize)      
	Begin     
		update ST_Acc_Prog_Balance  set TranOutQty = ISNULL(TranOutQty,0) + @Qty  where ordid=@Ordid and styleno=@styleno and Atype=@Atype And				Ades=@Ades and Acol = @AClr And Asize = @Asize 
	End      
ELSE
BEGIN
			insert into ST_Acc_Prog_Balance (Ordid,styleno,Atype,Ades,Acol,Asize,TranOutQty) values 				(@Ordid,@styleno,@Atype,@Ades,@AClr,@Asize,@Qty)      

END

END
ELSE IF @transFlg='-' AND @TransType = 'TRANOUT'   
BEGIN
if Exists(select 1 from ST_Acc_Prog_Balance (nolock) where Ordid=@Ordid and styleno =@styleno and AType=@AType And ADes =@Ades And Acol = @AClr And ASize=@asize)      
	Begin     
		update ST_Acc_Prog_Balance  set TranOutQty = ISNULL(TranOutQty,0) - @Qty  where ordid=@Ordid and styleno=@styleno and Atype=@Atype And				Ades=@Ades and Acol = @AClr And Asize = @Asize 
	End      
ELSE
BEGIN
			insert into ST_Acc_Prog_Balance (Ordid,styleno,Atype,Ades,Acol,Asize,TranOutQty) values 				(@Ordid,@styleno,@Atype,@Ades,@AClr,@Asize,@Qty)      

END
END

ELSE IF @transFlg='+' AND @TransType = 'TRANIN'   
BEGIN
if Exists(select 1 from ST_Acc_Prog_Balance (nolock) where Ordid=@Ordid and styleno =@styleno and AType=@AType And ADes =@Ades And Acol = @AClr And ASize=@asize)      
	Begin     
		update ST_Acc_Prog_Balance  set TranInQty = ISNULL(TranInQty,0) + @Qty  where ordid=@Ordid and styleno=@styleno and Atype=@Atype And				Ades=@Ades and Acol = @AClr And Asize = @Asize 
	End      
ELSE
BEGIN
			insert into ST_Acc_Prog_Balance (Ordid,styleno,Atype,Ades,Acol,Asize,TranInQty) values 				(@Ordid,@styleno,@Atype,@Ades,@AClr,@Asize,@Qty)      

END

END
ELSE IF @transFlg='-' AND @TransType = 'TRANIN'   
BEGIN
if Exists(select 1 from ST_Acc_Prog_Balance (nolock) where Ordid=@Ordid and styleno =@styleno and AType=@AType And ADes =@Ades And Acol = @AClr And ASize=@asize)      
	Begin     
		update ST_Acc_Prog_Balance  set TranInQty = ISNULL(TranInQty,0) - @Qty  where ordid=@Ordid and styleno=@styleno and Atype=@Atype And				Ades=@Ades and Acol = @AClr And Asize = @Asize 
	End      
ELSE
BEGIN
			insert into ST_Acc_Prog_Balance (Ordid,styleno,Atype,Ades,Acol,Asize,TranInQty) values 				(@Ordid,@styleno,@Atype,@Ades,@AClr,@Asize,@Qty)      

END
END
ELSE IF @transFlg='+' AND @TransType = 'PROREC'   
BEGIN
if Exists(select 1 from ST_Acc_Prog_Balance (nolock) where Ordid=@Ordid and styleno =@styleno and AType=@AType And ADes =@Ades And Acol = @AClr And ASize=@asize)      
	Begin     
		update ST_Acc_Prog_Balance  set ProRecQty = ISNULL(ProRecQty,0) + @Qty  where ordid=@Ordid and styleno=@styleno and Atype=@Atype And				Ades=@Ades and Acol = @AClr And Asize = @Asize 
	End      
ELSE
BEGIN
			insert into ST_Acc_Prog_Balance (Ordid,styleno,Atype,Ades,Acol,Asize,ProRecQty) values 				(@Ordid,@styleno,@Atype,@Ades,@AClr,@Asize,@Qty)      

END

END
ELSE IF @transFlg='-' AND @TransType = 'PROREC'   
BEGIN
if Exists(select 1 from ST_Acc_Prog_Balance (nolock) where Ordid=@Ordid and styleno =@styleno and AType=@AType And ADes =@Ades And Acol = @AClr And ASize=@asize)      
	Begin     
		update ST_Acc_Prog_Balance  set ProRecQty = ISNULL(ProRecQty,0) - @Qty  where ordid=@Ordid and styleno=@styleno and Atype=@Atype And				Ades=@Ades and Acol = @AClr And Asize = @Asize 
	End      
ELSE
BEGIN
			insert into ST_Acc_Prog_Balance (Ordid,styleno,Atype,Ades,Acol,Asize,ProRecQty) values 				(@Ordid,@styleno,@Atype,@Ades,@AClr,@Asize,@Qty)      

END
END
ELSE IF @transFlg='+' AND @TransType = 'OPN'   
BEGIN
if Exists(select 1 from ST_Acc_Prog_Balance (nolock) where Ordid=@Ordid and styleno =@styleno and AType=@AType And ADes =@Ades And Acol = @AClr And ASize=@asize)      
	Begin     
		update ST_Acc_Prog_Balance  set OpenQty = ISNULL(OpenQty,0) + @Qty  where ordid=@Ordid and styleno=@styleno and Atype=@Atype And				Ades=@Ades and Acol = @AClr And Asize = @Asize 
	End      
ELSE
BEGIN
			insert into ST_Acc_Prog_Balance (Ordid,styleno,Atype,Ades,Acol,Asize,OpenQty) values 				(@Ordid,@styleno,@Atype,@Ades,@AClr,@Asize,@Qty)      

END

END
ELSE IF @transFlg='-' AND @TransType = 'OPN'   
BEGIN
if Exists(select 1 from ST_Acc_Prog_Balance (nolock) where Ordid=@Ordid and styleno =@styleno and AType=@AType And ADes =@Ades And Acol = @AClr And ASize=@asize)      
	Begin     
		update ST_Acc_Prog_Balance  set OpenQty = ISNULL(OpenQty,0) - @Qty  where ordid=@Ordid and styleno=@styleno and Atype=@Atype And				Ades=@Ades and Acol = @AClr And Asize = @Asize 
	End      
ELSE
BEGIN
			insert into ST_Acc_Prog_Balance (Ordid,styleno,Atype,Ades,Acol,Asize,OpenQty) values 				(@Ordid,@styleno,@Atype,@Ades,@AClr,@Asize,@Qty)      

END
END
ELSE IF @transFlg='+' AND @TransType = 'SHORT'   
BEGIN
if Exists(select 1 from ST_Acc_Prog_Balance (nolock) where Ordid=@Ordid and styleno =@styleno and AType=@AType And ADes =@Ades And Acol = @AClr And ASize=@asize)      
	Begin     
		update ST_Acc_Prog_Balance  set ShortQty = ISNULL(ShortQty,0) + @Qty  where ordid=@Ordid and styleno=@styleno and Atype=@Atype And				Ades=@Ades and Acol = @AClr And Asize = @Asize 
	End      
ELSE
BEGIN
			insert into ST_Acc_Prog_Balance (Ordid,styleno,Atype,Ades,Acol,Asize,ShortQty) values 				(@Ordid,@styleno,@Atype,@Ades,@AClr,@Asize,@Qty)      

END

END
ELSE IF @transFlg='-' AND @TransType = 'SHORT'   
BEGIN
if Exists(select 1 from ST_Acc_Prog_Balance (nolock) where Ordid=@Ordid and styleno =@styleno and AType=@AType And ADes =@Ades And Acol = @AClr And ASize=@asize)      
	Begin     
		update ST_Acc_Prog_Balance  set ShortQty = ISNULL(ShortQty,0) - @Qty  where ordid=@Ordid and styleno=@styleno and Atype=@Atype And				Ades=@Ades and Acol = @AClr And Asize = @Asize 
	End      
ELSE
BEGIN
			insert into ST_Acc_Prog_Balance (Ordid,styleno,Atype,Ades,Acol,Asize,ShortQty) values 				(@Ordid,@styleno,@Atype,@Ades,@AClr,@Asize,@Qty)      

END
END

END

