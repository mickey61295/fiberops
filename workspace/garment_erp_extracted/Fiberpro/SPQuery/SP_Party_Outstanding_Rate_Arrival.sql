/*
;=============================================
; Author			:		DHARANI A.
; Create date		:		08/04/2014
; Create By			:		DHARANI A.
; Description		:		Party out standing Rate Arrival
; Change Person		:		DHARANI A.
; Last Change Date	:		08/04/2014
; =============================================	*/

create procedure SP_Party_Outstanding_Rate_Arrival(@Guid varchar(256),@deptid int )
as
Begin
   Declare
   @InputType char(1),
   @ordid int,
   @Partyid int,
   @dcid int,
   @RecMethod char(1),
   @Clrid int

   Select @InputType =Inputtype from MAs_dept where deptid =@Deptid
   Select @RecMethod =RecMethod  from MAs_dept where deptid =@Deptid
    If @RecMethod= 'D'
    Begin
	Declare OrdLoop CURSOR For
	select distinct isnull(ordid,0) as ordid  ,isnull(Dcolor,'') as Dcolor,pid,dcid  from TempPartyBalAbs_all where deptid= @deptid and                       TempPartyBalAbs_all.guid=@guid
	end
	else
	Begin
	Declare OrdLoop CURSOR For
	select distinct isnull(ordid,0) as ordid,0 as Dcolor ,pid,0 as dcid   from TempPartyBalAbs_all where deptid=@deptid and TempPartyBalAbs_all.guid=@guid
	end
	Open OrdLoop;
	FETCH NEXT FROM OrdLoop
    INTO @ordid,@clrid,@Partyid,@dcid;    
	WHILE @@FETCH_STATUS = 0
	Begin--OrdLoop Starts
	Declare  @TotDckgs numeric(18,3)
	If @InputType= 'Y' 
	Begin
	-- print ('DeptId :' + rtrim(@deptid) +'/'+ @RecMethod)
	   Declare
	   @Cntid int,
	   @Colid int,
	   @Dckgs numeric(18,3),
	   @BudRate numeric(18,3),
	   @Amt numeric(18,3),
	   @fabid int ,
	   @print_designid int;
	   If @RecMethod= 'D' 
	  
		   Begin
		  
		   Declare YarnLoop Cursor for
		   select x.cntid, x.colid,isnull(sum(Dckgs-Retkgs),0) as Dckgs,isnull(avg(budrate),0) as budrate,isnull(sum(Dckgs-Retkgs)*avg(budrate),0) as Amt from ( select DelDtl.ordid,stk.dept, stk.cntid,stk.colid,sum(kg) as DcKgs,0 as RetKgs  from trs_del1 Del inner join trs_del2 DelDtl(nolock) on Del.id=Deldtl.id inner join stocktable stk(nolock) on DelDtl.stockid=stk.stockid    where trtype=1 and DelDtl.ordid= @Ordid and Prs_dept= @deptid  and party=@Partyid and DelDtl.id= @dcid group by  DelDtl.ordid,stk.dept,stk.cntid,stk.colid union all  select grnDtl.ordid,stk.dept, stk.cntid,stk.colid,0 as DcKgs, sum(Reckgs) as RetKgs from trs_grn1 grn inner join trs_grn2 grnDtl(nolock) on grn.id=grnDtl.id inner join stocktable stk(nolock) on grnDtl.stockid=stk.stockid where grntype='Process Return' and grnDtl.ordid= @Ordid  and grn.dept= @deptid and suppid=@Partyid and grn.dcid=@dcid group by grnDtl.ordid,stk.dept, stk.cntid,stk.colid ) x left outer join stockratepost stkrate(nolock) on  x.ordid=stkrate.ordid and x.dept = stkrate.deptid   and x.cntid = stkrate.cntid  and x.colid = isnull(stkrate.colid,0)  group by x.cntid, x.colid 
	  
		 

		   end
	   else
		   Begin
		   Declare YarnLoop Cursor for
		   select x.cntid, x.colid,isnull(sum(Dckgs-Retkgs),0) as Dckgs,isnull(avg(budrate),0) as budrate,isnull(sum(Dckgs-Retkgs)*avg(budrate),0) as Amt from ( select DelDtl.ordid,stk.dept, stk.cntid,stk.colid,sum(kg) as DcKgs,0 as RetKgs  from trs_del1 Del inner join trs_del2 DelDtl(nolock) on Del.id=Deldtl.id inner join stocktable stk(nolock) on DelDtl.stockid=stk.stockid    where trtype=1 and DelDtl.ordid=  @Ordid and Prs_dept=  @Deptid and party= @Partyid group by  DelDtl.ordid,stk.dept,stk.cntid,stk.colid union all  select grnDtl.ordid,stk.dept, stk.cntid,stk.colid,0 as DcKgs, sum(Reckgs) as RetKgs from trs_grn1 grn inner join trs_grn2 grnDtl(nolock) on grn.id=grnDtl.id inner join stocktable stk(nolock) on grnDtl.stockid=stk.stockid where grntype='Process Return' and grnDtl.ordid= @Ordid and grn.dept= @Deptid and suppid= @Partyid group by grnDtl.ordid,stk.dept, stk.cntid,stk.colid ) x left outer join stockratepost stkrate(nolock) on  x.ordid=stkrate.ordid and x.dept = stkrate.deptid   and x.cntid = stkrate.cntid  and x.colid = isnull(stkrate.colid,0)  group by x.cntid, x.colid 
 		   End

		   Open YarnLoop;
	       FETCH NEXT FROM YarnLoop
           INTO @Cntid, @Colid,@Dckgs, @BudRate ,@Amt ; 
	       If @RecMethod= 'D' 
		   Begin
		   select   @TotDckgs= isnull(Dckgs,0)-isnull(Retkgs,0) from TempPartyBalAbs_all  where ordid= @Ordid and deptid=@Deptid   and pid= @Partyid  and dcid= @dcid  and guid=@guid 
		   End
		   else
		   Begin
		   select @TotDckgs= isnull(Dckgs,0)-isnull(Retkgs,0) from TempPartyBalAbs_all  where ordid= @Ordid and deptid= @Deptid  and pid= @Partyid and guid=@guid
		   end
	    print (@TotDckgs)
        Declare  
	   @TotDcamt numeric (18,3),
	   @NetRate  numeric (18,3);
	   set  @TotDcamt =0
	   set  @NetRate=0
	   WHILE @@FETCH_STATUS = 0
	   Begin--Yarn Loop Begins
	     set @TotDcamt = isnull(@TotDcamt,0) + isnull(@Amt,0)
		 set  @NetRate=0
		 If @TotDckgs > 0 
		   Begin
		   set  @NetRate=0
           select  @NetRate = isnull(@TotDcamt,0) / isnull(@TotDckgs,0)
		   end
		   print ('TotDcamt :'+ rtrim(isnull(@TotDcamt,0)))
		   print('TotDckgs :'+ rtrim(isnull(@TotDckgs,0)))

		   print ('NetRate :' +  rtrim(@NetRate))
		   If  @RecMethod= 'D' 
			  Begin
			  update TempPartyBalAbs_all set Budrate  =@NetRate where ordid= @Ordid and deptid=@Deptid  and pid=@Partyid  and dcid=@dcid and guid=@guid
			  end
		   Else
			  Begin
			  update TempPartyBalAbs_all set Budrate =@NetRate  where ordid= @Ordid and deptid=@Deptid  and pid= @Partyid  and guid=@guid
			  end
                          
	   FETCH NEXT FROM YarnLoop
       INTO @Cntid, @Colid,@Dckgs, @BudRate ,@Amt ;  
	   end --Yarn Loop Ends
	   CLOSE YarnLoop;
	   DEALLOCATE YarnLoop;

	 end
	 else
	 Begin
	 set @Amt=0
	 set @BudRate=0
	   If @RecMethod= 'D' 
			Begin
			Declare FabricLoop Cursor for
			select x.cntid, x.colid,x.fabid,x.print_designid,sum(kgs) as Dckgs,isnull(avg(budrate),0) as budrate,isnull(sum(kgs)*avg(budrate),0) as Amt from ( select DelDtl.ordid,stk.dept, stk.cntid,stk.colid,stk.fabid,stk.print_designid,sum(kg) as Kgs from trs_del1 Del inner join trs_del2 DelDtl(nolock) on Del.id=Deldtl.id inner join stocktable stk(nolock) on DelDtl.stockid=stk.stockid    where trtype=1 and DelDtl.ordid=  @Ordid and Prs_dept= @Deptid  and party= @Partyid and DelDtl.id= @dcid group by  DelDtl.ordid,stk.dept,stk.cntid,stk.colid,stk.fabid,stk.print_designid union all select grnDtl.ordid,stk.dept, stk.cntid,stk.colid,stk.fabid,stk.print_designid,sum(Reckgs) as Kgs from trs_grn1 grn inner join trs_grn2 grnDtl(nolock) on grn.id=grnDtl.id inner join stocktable stk(nolock) on grnDtl.stockid=stk.stockid where grntype='Process Return' and grnDtl.ordid= @Ordid and grn.dept= @Deptid  and suppid= @Partyid and grn.dcid= @dcid group by grnDtl.ordid,stk.dept, stk.cntid,stk.colid,stk.fabid,stk.print_designid) x left outer join stockratepost stkrate(nolock) on  x.ordid=stkrate.ordid and x.dept = stkrate.deptid   and x.cntid = stkrate.cntid  and x.colid = stkrate.colid and x.fabid=isnull(stkrate.fabid,0) and x.print_designid =  isnull(stkrate.designid,0)  group by x.cntid, x.colid,x.fabid,x.print_designid
			
			--print ('TOtal DcKgs :'+ rtrim(@TotDckgs)+ '/'+ @RecMethod)

			End
       else
	        Begin
			Declare FabricLoop Cursor for
			select x.cntid, x.colid,x.fabid,x.print_designid,isnull(sum(kgs),0) as Dckgs,isnull(avg(budrate),0) as budrate ,isnull(sum(kgs)*avg(budrate),0) as Amt from ( select DelDtl.ordid,stk.dept, stk.cntid,stk.colid,stk.fabid,stk.print_designid,sum(kg) as Kgs from trs_del1 Del inner join trs_del2 DelDtl(nolock) on Del.id=Deldtl.id inner join stocktable stk(nolock) on DelDtl.stockid=stk.stockid    where trtype=1 and DelDtl.ordid= @Ordid and Prs_dept= @Deptid and party= @Partyid group by  DelDtl.ordid,stk.dept,stk.cntid,stk.colid,stk.fabid,stk.print_designid union all select grnDtl.ordid,stk.dept, stk.cntid,stk.colid,stk.fabid,stk.print_designid,sum(Reckgs) as Kgs from trs_grn1 grn inner join trs_grn2 grnDtl(nolock) on grn.id=grnDtl.id inner join stocktable stk(nolock) on grnDtl.stockid=stk.stockid where grntype='Process Return' and grnDtl.ordid= @Ordid  and grn.dept=@Deptid and suppid= @Partyid group by grnDtl.ordid,stk.dept, stk.cntid,stk.colid,stk.fabid,stk.print_designid) x left outer join stockratepost stkrate(nolock) on  x.ordid=stkrate.ordid and x.dept = stkrate.deptid   and x.cntid = stkrate.cntid  and x.colid = stkrate.colid  and x.fabid=isnull(stkrate.fabid,0) and x.print_designid =  isnull(stkrate.designid,0) group by x.cntid, x.colid,x.fabid,x.print_designid
			End
       Open FabricLoop;
	   FETCH NEXT FROM FabricLoop
       INTO @Cntid, @Colid,@fabid,@print_designid,@Dckgs, @BudRate ,@Amt ;  
	   set @TotDckgs=0
	    If @RecMethod= 'D' 
		Begin
		select @TotDckgs = isnull(Dckgs,0)-isnull(Retkgs,0) from TempPartyBalAbs_all  where ordid= @Ordid and deptid=@Deptid  and pid= @Partyid and dcid=@dcid and guid=@guid
		end
		else
		Begin
		select @TotDckgs = isnull(Dckgs,0)-isnull(Retkgs,0) from TempPartyBalAbs_all  where ordid=  @Ordid and deptid=@deptid   and pid= @Partyid and guid=@guid
		end
		print ('TOtal DcKgs :'+ rtrim(isnull(@TotDckgs,0))+ '/'+ @RecMethod)
	   set @TotDcamt=0
	   set @NetRate=0
	   While @@FETCH_STATUS =0 
		   Begin--Fabric  Loop starts
				select @TotDcamt = isnull(@TotDcamt,0) + isnull(@Amt,0)
				If @TotDckgs > 0 
				Begin
				select @NetRate = isnull(@TotDcamt,0) / isnull(@TotDckgs,0)
				End
				If @RecMethod= 'D' 
				Begin
				update TempPartyBalAbs_all set Budrate  =@NetRate  where ordid= @Ordid and deptid=@Deptid  and pid=@Partyid and dcid=@dcid and guid=@guid
				end
				Else
				Begin
				update TempPartyBalAbs_all set Budrate  = @NetRate where ordid= @ordid  and deptid= @deptid and pid= @Partyid and guid=@guid
				end
		   FETCH NEXT FROM FabricLoop
		   INTO @Cntid, @Colid,@fabid,@print_designid,@Dckgs, @BudRate ,@Amt ;                  
		   End--Fabric  Loop ends
	   CLOSE FabricLoop;
	   DEALLOCATE FabricLoop;  
	 end
	 
	FETCH NEXT FROM OrdLoop
    INTO @ordid,@Clrid,@Partyid,@dcid;  
	end--OrdLoop Ends
	CLOSE OrdLoop;
	DEALLOCATE OrdLoop;                         
 

End

