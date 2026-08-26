/*
;=============================================
; Author		    :		DHARANI A.
; Create date		:		28/03/2014
; Create By		    :		DHARANI
; Description		:		StockRate Post
; Change Person		:		POOMANI
; Last Change Date	:		09/08/2021 09:00
; =============================================	*/
CREATE trigger  [dbo].[Tgr_StockRatePost]  on [dbo].[StockRatePost] 
For Insert,Delete ,update
as
Declare 
@Ordid int,
@Prs int,
@sno int,
@InputType char(1)

 --if (Select count(*) from inserted)>0   -- or  (Select count(*) from updated)>0  
   Begin 
      Declare StkReports CURSOR For
	  select distinct Ordid from Inserted where ordid not in (select ordid from ordermas where jobno=0)
	  Open StkReports;

	  FETCH NEXT FROM StkReports
   INTO @ordid;                                                  
   WHILE @@FETCH_STATUS = 0
   BEGIN--Ord Loop Begins
   Declare   @Cnt int ,@ordertype varchar(10)

   select @ordertype = isnull(ordertype,'Order') from ordermas where ordid = @ordid
   select @Cnt=Count(*) from ordseq where ordid=@Ordid

   if @Cnt = 0 or @ordertype ='Sample'
   Begin--Sample entry Begins
      Declare S_Dept CURSOR for
	  select distinct deptid as Prs,sno from stockratepost where ordid= @Ordid order by sno 
	  Open S_dept;
	  FETCH NEXT From S_dept
	  INTO @Prs,@Sno
	  WHILE @@FETCH_STATUS =0 
	  BEGIN --Sample Entry loop Begins
      DECLARE
	  @Colid int ,
	  @Cntid int,
	  @Fabid int,
	  @Rate numeric(18,3),
	  @designid int,
      @Prev_Rate numeric(18,3),
	  @Tblsno int 
	  select @InputType =InputType   from MAs_dept where deptid= @Prs
		  if @InputType ='Y'
		 
		   Begin--Sampl
		 
			   if @Prs =1 
				   begin
					update stockratepost   set cumbillrate= isnull(Billrate,0)  where ordid= @Ordid  and deptid=@Prs and isnull(billrate,0)>0
					update stockratepost   set cumbillrate= isnull(procrate,0)  where ordid= @Ordid and deptid=@Prs and isnull(billrate,0)=0
				   end
			   else if @Prs=2 
				   Begin--Y/d starts
					   DECLARE Y_Dyeing CURSOR FOR
					   select cntid, colid,case when isnull(billrate,0)=0 then isnull(procrate,0) else isnull(billrate,0) end as rate from StockRatePost where ordid=                       @Ordid and deptid=@Prs 
					   OPEN Y_Dyeing;
					   FETCH NEXT From Y_Dyeing
					   INTO @cntid,@Colid,@Rate
					   WHILE @@FETCH_STATUS = 0
					   BEGIN--Y/D loop starts
					   DECLARE 
							@Y_Rate numeric(18,3)
							SELECT @Y_Rate= case when isnull(cumbillrate,0)=0 then isnull(procrate,0) else isnull(cumbillrate,0) END   FROM StockRatePost WHERE                                                StockRatePost.OrdId = @Ordid and  StockRatePost.deptid=1   AND StockRatePost.cntid =@Cntid
							update StockRatePost set cumbillrate= @Y_Rate+ @Rate where ordid=@Ordid and deptid=@Prs and cntid=@cntid and colid=@colid
							 FETCH NEXT From Y_Dyeing
					         INTO @cntid,@Colid,@Rate
					   END;--Y/D loop ends
					   CLOSE Y_Dyeing;
					   DEALLOCATE Y_Dyeing;
				   end--Y/d ends
			   else if @Prs=4 or exists(Select 1 from MAs_dept (nolock) where deptid =@Prs and deptgrpcode =4 )
				   Begin--Knit entry Starts
					   DECLARE Knitt CURSOR FOR
					   select distinct Fabid,cntid,colid ,case when isnull(billrate,0)=0 then isnull(procrate,0) else isnull(billrate,0) end as rate from stockratepost     where   ordid=@Ordid and deptid= @Prs
					   OPEN Knitt;
					   FETCH NEXT FROM Knitt
					   INTO @Fabid, @cntid,@colid,@rate
					   WHILE @@FETCH_STATUS = 0
					   BEGIN--Knitt loop starts
					   DECLARE
					   @YClr int,
					   @YCnt int,
					   @Per numeric(6,2)
						   Select @Tblsno =@Sno-1
							while @TblSno >= 1
							Begin--Prev_rate Loop Begins
                             select @Prev_Rate=0
							 SELECT  @Prev_Rate= isnull(cumbillrate,0) FROM stockratepost  WHERE stockratepost.OrdId =@Ordid and sno= @TblSno AND cntid =  @cntid  AND isnull(colid,0) = @Colid 
								If @Prev_Rate > 0 
								Begin
								   goto insertion;
								End 
							Select @TblSno=@TblSno-1
							End--Prev_rate Loop Ends
							/** Mixed Count**/
							 If @Prev_Rate = 0 
							 DECLARE
							 @TmpRate numeric(18,3)
							 Begin--Mixed Count Entry Begins
							   DECLARE Y_Cons CURSOR for
							   select distinct Pro_YrnCns.cntid, Pro_YrnCns.ColId,Pro_YrnCns.Per  from Pro_YrnCns inner join Pro_Reqknitt on Pro_YrnCns.consid=Pro_Reqknitt.consid                                  and Pro_YrnCns.Massgridslno =Pro_Reqknitt.slno  where Pro_Reqknitt.ordid= @Ordid and Pro_Reqknitt.deptid= @Prs and  Pro_Reqknitt.cntid= @Cntid and                                   Pro_Reqknitt.colid= @Colid
							   OPEN Y_Cons;
							   FETCH NEXT FROM Y_Cons
							   INTO @Ycnt,@Yclr,@Per
							   WHILE @@FETCH_STATUS =0 
							   BEGIN--Y_cons Loop Begins
									Select @Tblsno =@Sno-1
									while @TblSno >= 1
									Begin--Prev_rate Loop Begins
                                     select @TmpRate=0
									 SELECT @TmpRate= isnull(cumbillrate,0) FROM stockratepost  WHERE stockratepost.OrdId =@Ordid AND sno= @TblSno AND cntid =  @Ycnt and  isnull(colid,0) = @Yclr 
										If @TmpRate> 0 
										Begin
										   goto insertion1;
										End 
									Select @TblSno=@TblSno-1
									End--Prev_rate Loop Ends
								insertion1:	select @Prev_Rate = @Prev_Rate + (@TmpRate * @per/ 100)
								 FETCH NEXT FROM Y_Cons
							   INTO @Ycnt,@Yclr,@Per
							   END;--Y_cons Loop Ends
							   CLOSE Y_Cons;
							   DEALLOCATE Y_Cons;
							 end--Mixed Count Entry Ends
	                         insertion: update StockRatePost set cumbillrate= isnull(@rate,0)+isnull(@Prev_Rate,0)  where ordid=@Ordid and deptid=@Prs and  fabid=@fabid and Cntid=@cntid and isnull(colid,0)=@colid  
					   FETCH NEXT FROM Knitt
					   INTO @Fabid, @cntid,@colid,@rate
					   END;--Knit loop Ends
					   CLOSE Knitt;
					   DEALLOCATE Knitt;
				   end --Knit entry Ends
			   else
			   Begin--Other than Y,Y/D,Knit Dept Entry in Inputtype= Y Starts 
               Declare Oth_YDept CURSOR FOR
			   select cntid,colid ,case when isnull(billrate,0)=0 then isnull(procrate,0) else isnull(billrate,0) end as rate from stockratepost where ordid= @Ordid and deptid= @Prs
			   OPEN Oth_YDept;
			   FETCH NEXT FROM Oth_YDept
			   INTO @cntid,@colid,@Rate
			   WHILE @@FETCH_STATUS =0 
			   BEGIN 
				    Select @Tblsno =@Sno-1
					while @TblSno >= 1
					Begin--Prev_rate Loop Begins
                        select @Prev_Rate=0
						SELECT @Prev_Rate = isnull(cumbillrate,0) FROM stockratepost  WHERE stockratepost.OrdId =@Ordid AND sno= @TblSno AND  cntid =  @cntid and  isnull(colid,0) = @colid  and YF='Y' 
						If @Prev_Rate> 0 
						Begin
							goto insertion2;
						End 
					Select @TblSno=@TblSno-1
					End--Prev_rate Loop Ends
					insertion2:  update StockRatePost set cumbillrate= isnull(@rate,0)+ isnull(@Prev_Rate,0)  where ordid=@Ordid and deptid=@Prs and cntid=@cntid  and isnull(colid,0)=@colid 
               FETCH NEXT FROM Oth_YDept
			   INTO @cntid,@colid,@Rate
			   END;
			   CLOSE Oth_YDept;
               DEALLOCATE Oth_YDept;
			   end --Other than Y,Y/D,Knit Dept Entry in Inputtype= Y Ends
		  end--In type 'Y' ends
		  else 
		  begin--else loop Begins
		   If @InputType ='F'  
		   Begin --In type 'F' Begins
		 		       if  exists(Select 1 from MAs_dept (nolock) where deptid =@Prs and deptname='FABRIC TO YARN')
				BEGIN--Fabtoyarn Entry Begins
				DECLARE FabToYarn CURSOR FOR
				select cntid,colid,case when isnull(billrate,0)=0 then isnull(procrate,0) else isnull(billrate,0) end as rate from stockratepost where ordid=@Ordid and deptid=15
				OPEN FabToYarn;
				FETCH NEXT FROM FabToYarn
				INTO @cntid,@colid,@rate
                WHILE @@FETCH_STATUS =0 
                BEGIN--FAbtoYarn loop Begins
				  Select @Tblsno =@Sno-1
					while @TblSno >= 1
					Begin--Prev_rate Loop Begins
                        select @Prev_Rate=0
						select @Prev_Rate = isnull(sum(cumBillrate),0)  from StockRatePost where  ordid= @Ordid  and sno= @TblSno and cntid= @cntid and colid=@colid and YF='F'  
						If @Prev_Rate> 0 
						Begin
							goto insertionFAbToYARN;
						End 
					Select @TblSno=@TblSno-1
					End--Prev_rate Loop Ends
                    insertionFAbToYARN: update StockRatePost set cumBillrate= isnull(@rate,0)+isnull(@Prev_Rate,0) where ordid=@Ordid and deptid=@Prs and  cntid=@cntid and colid=@colid  
                    FETCH NEXT FROM FabToYarn
				    INTO @cntid,@colid,@rate
                  END;--FAbtoYarn loop Begins
                  CLOSE FabToYarn;
                  DEALLOCATE FabToYarn;
				end--Fabtoyarn Entry Ends
			   else
			    Begin --FAbric Entry Begins 
				DECLARE Fabric_Dept CURSOR  FOR
				select distinct Fabid,colid,designid ,case when isnull(billrate,0)=0 then isnull(procrate,0) else isnull(billrate,0) end as rate ,cntid from  stockratepost where                    ordid=@Ordid and deptid= @Prs
				OPEN Fabric_Dept;
				FETCH NEXT FROM Fabric_Dept
				INTO @Fabid,@Colid,@designid,@Rate,@cntid
                WHILE @@FETCH_STATUS =0 
                BEGIN--Fab entry loop Begins except fabtoyarn
				   SElect @Tblsno =@Sno-1
				   While @Tblsno >= 1
				   Begin--Prev_rate Loop Begins
				   Declare
				     @tmpstr NVarchar(1000) ,
					 @Prev_Rate_Fab numeric(18,3);
					 set @tmpstr=+N'select @Prev_Rate_Fab = isnull(sum(cumbillrate),0)  from StockRatePost where  ordid= @Ordid and sno= @Tblsno and Fabid=@Fabid and cntid=@cntid and YF=''F'''
                     If exists(select 1  from StockRatePost where  ordid= @Ordid and sno = @TblSno  and Fabid=@Fabid and cntid=@cntid and isnull(colid,0)=@colid and YF='F')
 							BEGIN
							select @tmpstr = @tmpstr +N' and isnull(colid,0)= @colid'
							END
                            else
							BEGIN
							select @tmpstr = @tmpstr +N' and isnull(colid,0)= 0'
							END
                            If exists(select 1  from StockRatePost where  ordid= @Ordid and sno = @TblSno  and Fabid=@Fabid and cntid=@cntid and YF='F' and isnull(designid,0)=@designid) 
 							BEGIN
                            select @tmpstr = @tmpstr +N' and isnull(designid,0)= @designid'
							END
							else
							BEGIN
							select @tmpstr = @tmpstr +N' and isnull(designid,0)= 0'
							END
exec  sp_executeSql  @tmpstr,N'@Ordid int,@Tblsno int,@Fabid int,@cntid int,@colid int,@designid int,@Prev_Rate_Fab numeric(18,3) OUTPUT',@Ordid ,@Tblsno ,@Fabid ,@cntid ,@colid,@designid,@Prev_Rate_Fab OUTPUT
                            If  @Prev_Rate_Fab > 0 
							BEGIN
							goto InsertFAbric;
							END
                            select @Tblsno=@TblSno-1
                   End--Prev_rate Loop Ends
                   InsertFAbric:update StockRatePost set cumbillrate= isnull(@rate,0)+isnull(@Prev_rate_fab,0) where ordid=@Ordid and deptid=@Prs and                     fabid=@fabid and cntid=@cntid   and isnull(colid,0)=@colid  and isnull(designid,0)=@designid 
                FETCH NEXT FROM Fabric_Dept
				INTO @Fabid,@Colid,@designid,@Rate,@cntid
                END;--Fab entry loop Begins except fabtoyarn
                CLOSE Fabric_Dept;
                DEALLOCATE Fabric_Dept;
			    End  --FAbric Entry ends
		   end --In type 'F' ends
		   End --Else loopEnds
      FETCH NEXT From S_dept
	  INTO @Prs,@Sno
	  END ;--Sample Entry loop ends
	  CLOSE S_Dept;
      DEALLOCATE S_Dept;
   end--Sample entry ends

   else
   Begin-- Order entry ends
   /* Prog componenet Entry  Orders*/
   print 'aslam'
      Declare O_Dept CURSOR for
	  select distinct deptid as Prs,sno from stockratepost where ordid= @Ordid order by sno 
	  Open O_dept;
	  FETCH NEXT From O_dept
	  INTO @Prs,@Sno
	  WHILE @@FETCH_STATUS =0 
	  BEGIN --Order Entry loop Begins
       --@Colid int ,
	  --@Cntid int,
	  --@Fabid int,
	  --@Rate numeric(18,3),
	 -- @designid int,
--@Prev_Rate numeric(18,3),
	 -- @Tblsno int 
		  select @InputType =InputType   from MAs_dept where deptid= @Prs
		  if @InputType ='Y'
		  Begin--Sampl
			   if @Prs =1 
				   begin
					update stockratepost   set cumbillrate= isnull(Billrate,0)  where ordid= @Ordid  and deptid=@Prs and isnull(billrate,0)>0
					update stockratepost   set cumbillrate= isnull(procrate,0)  where ordid= @Ordid and deptid=@Prs and isnull(billrate,0)=0
				   end
			   else if @Prs=2 
				   Begin--Y/d starts
                       DECLARE Y_Dyeing CURSOR FOR
					   select cntid, colid,case when isnull(billrate,0)=0 then isnull(procrate,0) else isnull(billrate,0) end as rate from StockRatePost where  ordid=                       @Ordid and deptid=@Prs 
					   OPEN Y_Dyeing;
					   FETCH NEXT From Y_Dyeing
					   INTO @cntid,@Colid,@Rate
					   WHILE @@FETCH_STATUS = 0
					   BEGIN--Y/D loop starts
					    -- DECLARE 
						--	@Y_Rate numeric(18,3)
						DECLARE Yd_Cons CURSOR FOR
						SELECT Top 1 prog_ycns.YClr, prog_ycns.Ycount,prog_ycns.consPer FROM prog_clrcomb INNER JOIN prog_ycns ON prog_clrcomb.ID = prog_ycns.ID INNER JOIN prog_cns                         on prog_cns.id=prog_clrcomb.id WHERE prog_clrcomb.OrdId = @Ordid AND
 Prog_ycns.Ycount =@Cntid and prog_ycns.YClr = @colid 
						OPEN Yd_Cons
						FETCH NEXT FROM Yd_Cons
						INTO @Yclr,@Ycnt,@Per
						select @Prev_Rate =0
						WHILE @@FETCH_STATUS =0
					    BEGIN--Yd Cons Loop Begins
						SELECT @Y_Rate= case when isnull(cumbillrate,0)=0 then isnull(procrate,0) else isnull(cumbillrate,0) END   FROM StockRatePost WHERE StockRatePost.OrdId                              = @Ordid AND StockRatePost.deptid=1 and  StockRatePost.cntid =@Ycnt
						select @Prev_Rate  = @Prev_Rate  + (@Y_Rate * @Per / 100)
						FETCH NEXT FROM Yd_Cons
						INTO @Yclr,@Ycnt,@Per
						END;--Yd Cons Loop Ends
						CLOSE 	Yd_Cons;
						DEALLOCATE Yd_Cons;
							 update StockRatePost set cumbillrate= isnull(@Prev_Rate,0) + isnull(@Rate,0) where ordid=@Ordid and deptid=@Prs and cntid=@cntid and colid=@colid
							 FETCH NEXT From Y_Dyeing
					         INTO @cntid,@Colid,@Rate
					   END;--Y/D loop ends
					   CLOSE Y_Dyeing;
					   DEALLOCATE Y_Dyeing;
				   end--Y/d ends
              
			   else if @Prs=-4 
			       BEGIN
				       DECLARE YTwist CURSOR FOR
				       select isnull(cntid,0) as cntid, colid,case when isnull(billrate,0)=0 then Isnull(procrate,0) else isnull(billrate,0) end as rate from                                 stockratepost where deptid= @Prs and ordid= @ordid
					   OPEN YTwist
					   FETCH NEXT FROM YTwist 
					   INTO @cntid,@colid,@rate
					   select @Prev_rate=0
					   WHILE @@FETCH_STATUS = 0
					   BEGIN --YTwist loop starts
					      DECLARE YTwist_Cnt CURSOR FOR
					      select cntid,colid,wgtper from Prog_YTwist_MAs a inner join Prog_YTwist_Dtl b on a.id=b.id  where ordid= @Ordid and TwistCntId= @cntid
						  OPEN YTwist_Cnt
					      FETCH NEXT FROM YTwist_Cnt 
					      INTO @Ycnt,@YClr,@Per
						  WHILE @@FETCH_STATUS = 0
						  BEGIN -- YTwist_Cnt Loop starts
							   Select @Tblsno =@Sno-1
							   While @Tblsno >= 1 
							   BEGIN--Previous Rate Loop Starts
									Select @TmpRate=0
									select @TmpRate=isnull(cumbillrate,0)  from StockRatePost where sno=@Tblsno and  cntid = @Ycnt and isnull(colid,0)= @YClr and  ordid= @Ordid
									 If @TmpRate > 0 
									 Begin
									 goto YTwist_Ord
									 end 
									 select @Tblsno=@Tblsno-1
								END;--Previous Rate Loop Starts
								YTwist_Ord: Select  @Prev_rate = @Prev_rate + (@TmpRate * (@Per/ 100)) 
						  FETCH NEXT FROM YTwist_Cnt 
					      INTO @Ycnt,@YClr,@Per
						  END; -- YTwist_Cnt Loop ends
						  CLOSE YTwist_Cnt
						  DEALLOCATE YTwist_Cnt
                       FETCH NEXT FROM YTwist 
					   INTO @cntid,@colid,@rate
					   END;--YTwist loop ends
					   CLOSE YTwist
					   DEALLOCATE YTwist
				   END
				   	  
			   else if @Prs=4 or exists(Select 1 from MAs_dept (nolock) where deptid =@Prs and deptgrpcode =4 )
				   Begin--Knit entry Starts
				    
					   DECLARE Knitt CURSOR FOR
					   select distinct Fabid,cntid,colid ,case when isnull(billrate,0)=0 then isnull(procrate,0) else isnull(billrate,0) end as rate from stockratepost where                               ordid=@Ordid and deptid= @Prs
					   OPEN Knitt;
					   FETCH NEXT FROM Knitt
					   INTO @Fabid, @cntid,@colid,@rate
					   WHILE @@FETCH_STATUS = 0
					   BEGIN--Knitt loop starts
					   select @Prev_rate=0
						If @colid = 0 
						Begin
						 DECLARE Y_cons_Ord CURSOR FOR
						 SELECT Distinct prog_ycns.YClr, prog_ycns.Ycount,prog_ycns.consPer FROM prog_clrcomb INNER JOIN prog_ycns ON prog_clrcomb.ID = prog_ycns.ID INNER JOIN                               prog_cns on prog_cns.id=prog_clrcomb.id WHERE prog_clrcomb.OrdId = @Ordid AND prog_clrcomb.FabDesc =@Fabid and  prog_ycns.YClr= @colid  AND                                          prog_clrcomb.Fincnt = @cntid
						end
                        Else
						begin
						DECLARE Y_cons_Ord CURSOR FOR
						 SELECT Distinct prog_ycns.YClr, prog_ycns.Ycount,prog_ycns.consPer FROM prog_clrcomb INNER JOIN prog_ycns ON prog_clrcomb.ID = prog_ycns.ID INNER JOIN                               prog_cns on prog_cns.id=prog_clrcomb.id WHERE prog_clrcomb.OrdId = @Ordid AND prog_clrcomb.FabDesc = @Fabid AND prog_clrcomb.Fincol = @colid AND                                     prog_clrcomb.Fincnt = @Cntid
                        end
                        OPEN Y_cons_Ord
						FETCH NEXT FROM Y_cons_Ord
						INTO @YClr,@Ycnt,@Per
						WHILE @@FETCH_STATUS =0
						BEGIN--Y_cons_in Knitt Loop begins
							Select @Tblsno =@Sno-1
							While @Tblsno >= 1
							Begin --Prev_Rate Loop
							Select @TmpRate=0
							select @TmpRate=isnull(cumbillrate,0)  from StockRatePost where  ordid= @Ordid and  sno= @Tblsno and  cntid = @YCnt  and isnull(colid,0)= @YClr   
							 If @TmpRate > 0 
							 BEgin
							 goto YCons_Ord
							 end 
							 select @Tblsno=@Tblsno-1
							end--Prev_Rate Loop
						    YCons_Ord: Select  @Prev_rate = @Prev_rate + (@TmpRate * (@Per/ 100)) 
						FETCH NEXT FROM Y_cons_Ord
						INTO @YClr,@Ycnt,@Per        
						END;--Y_cons_in Knitt Loop ends
		  				CLOSE 	Y_cons_Ord;
						DEALLOCATE Y_cons_Ord;
						
	                    Ord_insertion:  update StockRatePost set cumbillrate= isnull(@rate,0)+isnull(@Prev_Rate,0)  where ordid=@Ordid and deptid=@Prs and  fabid=@fabid and Cntid=@cntid and isnull(colid,0)=@colid                            
					   FETCH NEXT FROM Knitt
					   INTO @Fabid, @cntid,@colid,@rate
					   END;--Knit loop Ends
					   CLOSE Knitt;
					   DEALLOCATE Knitt;
			   end --Knit entry Ends
			   else
			   Begin--Other than Y,Y/D,Knit Dept Entry in Inputtype= Y Starts 
               Declare Oth_YDept CURSOR FOR
			   select cntid,colid ,case when isnull(billrate,0)=0 then isnull(procrate,0) else isnull(billrate,0) end as rate from stockratepost where ordid= @Ordid and deptid= @Prs
			   OPEN Oth_YDept;
			   FETCH NEXT FROM Oth_YDept
			   INTO @cntid,@colid,@Rate
			   WHILE @@FETCH_STATUS =0 
			   BEGIN 
 			        Select @Tblsno =@Sno-1
					while @TblSno >= 1
					Begin--Prev_rate Loop Begins
                        select @Prev_Rate=0
						SELECT @Prev_Rate = isnull(cumbillrate,0) FROM stockratepost  WHERE stockratepost.OrdId =@Ordid AND sno= @TblSno  and cntid =  @cntid and   isnull(colid,0) =                        @colid AND  YF='Y'
						If @Prev_Rate> 0 
						Begin
							goto Ord_insertion2;
						End 
					Select @TblSno=@TblSno-1
					End--Prev_rate Loop Ends
					
					Ord_insertion2:  update StockRatePost set cumbillrate= isnull(@rate,0)+ isnull(@Prev_Rate,0)  where ordid=@Ordid and deptid=@Prs and cntid=@cntid   and isnull(colid,0)=@colid 
               FETCH NEXT FROM Oth_YDept
			   INTO @cntid,@colid,@Rate
			   END;
			   CLOSE Oth_YDept;
               DEALLOCATE Oth_YDept;
			   end --Other than Y,Y/D,Knit Dept Entry in Inputtype= Y Ends
		  end--In type 'Y' ends
		  else 
		  begin--else loop Begins
		   If @InputType ='F'  
		   Begin --In type 'F' Begins
		  
		       if  exists(Select 1 from MAs_dept (nolock) where deptid =@Prs and deptname='FABRIC TO YARN')
				BEGIN--Fabtoyarn Entry Begins
				DECLARE FabToYarn CURSOR FOR
				select cntid,colid,case when isnull(billrate,0)=0 then isnull(procrate,0) else isnull(billrate,0) end as rate from stockratepost where ordid=@Ordid and deptid=15
				OPEN FabToYarn;
				FETCH NEXT FROM FabToYarn
				INTO @cntid,@colid,@rate
                WHILE @@FETCH_STATUS =0 
                BEGIN--FAbtoYarn loop Begins
				    Select @Tblsno =@Sno-1
					while @TblSno >= 1
					Begin--Prev_rate Loop Begins
                        select @Prev_Rate=0
						select @Prev_Rate = isnull(sum(cumBillrate),0)  from StockRatePost where  ordid= @Ordid and sno= @TblSno and cntid= @cntid and colid=@colid and YF='F' 
						If @Prev_Rate> 0 
						Begin
							goto Ord_insertionFAbToYARN;
						End 
					Select @TblSno=@TblSno-1
					End--Prev_rate Loop Ends
                    Ord_insertionFAbToYARN: update StockRatePost set cumBillrate= @rate+@Prev_Rate where ordid=@Ordid and deptid=@Prs  and cntid=@cntid and colid=@colid 
                    FETCH NEXT FROM FabToYarn
				    INTO @cntid,@colid,@rate
                  END;--FAbtoYarn loop Begins
                  CLOSE FabToYarn;
                  DEALLOCATE FabToYarn;
				end--Fabtoyarn Entry Ends
			    else
			    Begin --FAbric Entry Begins 
				
				DECLARE Fabric_Dept CURSOR  FOR
				select distinct Fabid,colid,designid ,case when isnull(billrate,0)=0 then isnull(procrate,0) else isnull(billrate,0) end as rate ,cntid from  stockratepost where                    ordid=@Ordid and deptid= @Prs
				OPEN Fabric_Dept;
				FETCH NEXT FROM Fabric_Dept
				INTO @Fabid,@Colid,@designid,@Rate,@cntid
                WHILE @@FETCH_STATUS =0 
                BEGIN--Fab entry loop Begins except fabtoyarn
				   SElect @Tblsno =@Sno-1
				   if @Tblsno=0 --poomani 07-Aug-2021 eagle ready fabric cumrate null transfer compacting rate 101 but actual 401 124/20 to 17/21 ord
				   begin
				     select @tmpstr =''
					select @Prev_Rate_Fab =0
                    set @tmpstr=+N'select @Prev_Rate_Fab = isnull(sum(cumbillrate),0)  from StockRatePost where  ordid= @Ordid and sno= @Tblsno and Fabid=@Fabid and cntid=@cntid and YF=''F'' '
                            If exists(select 1  from StockRatePost where  ordid= @Ordid and sno = @TblSno  and Fabid=@Fabid and cntid=@cntid and isnull(colid,0)=@colid and YF='F')
 							BEGIN
							
							select @tmpstr = @tmpstr +N' and isnull(colid,0)= @colid'
							END
                            else
							BEGIN
							
							select @tmpstr = @tmpstr +N' and isnull(colid,0)= 0'
							END
                            If exists(select 1  from StockRatePost where  ordid= @Ordid and sno = @TblSno  and Fabid=@Fabid and cntid=@cntid and YF='F' and isnull(designid,0)=@designid ) 
 							BEGIN
							
                            select @tmpstr = @tmpstr +N' and isnull(designid,0)= @designid'
							END
							else
							BEGIN
							
							select @tmpstr = @tmpstr +N' and isnull(designid,0)= 0'
							END
exec  sp_executeSql  @tmpstr,N'@Ordid int,@Tblsno int,@Fabid int,@cntid int,@colid int,@designid int,@Prev_Rate_Fab numeric(18,3) OUTPUT',@Ordid ,@Tblsno ,@Fabid ,@cntid ,@colid,@designid,@Prev_Rate_Fab OUTPUT
                            If  @Prev_Rate_Fab > 0 
							BEGIN
								 
							goto Ord_InsertFAbric;
							END
                            select @Tblsno=@TblSno-1
				   end
				   else
				   begin
				    While @Tblsno >= 1
				   begin--Prev_rate Loop Begins
				  
				    select @tmpstr =''
					select @Prev_Rate_Fab =0
                    set @tmpstr=+N'select @Prev_Rate_Fab = isnull(sum(cumbillrate),0)  from StockRatePost where  ordid= @Ordid and sno= @Tblsno and Fabid=@Fabid and cntid=@cntid and YF=''F'' '
                            If exists(select 1  from StockRatePost where  ordid= @Ordid and sno = @TblSno  and Fabid=@Fabid and cntid=@cntid and isnull(colid,0)=@colid and YF='F')
 							BEGIN
							
							select @tmpstr = @tmpstr +N' and isnull(colid,0)= @colid'
							END
                            else
							BEGIN
							
							select @tmpstr = @tmpstr +N' and isnull(colid,0)= 0'
							END
                            If exists(select 1  from StockRatePost where  ordid= @Ordid and sno = @TblSno  and Fabid=@Fabid and cntid=@cntid and YF='F' and isnull(designid,0)=@designid ) 
 							BEGIN
							
                            select @tmpstr = @tmpstr +N' and isnull(designid,0)= @designid'
							END
							else
							BEGIN
							
							select @tmpstr = @tmpstr +N' and isnull(designid,0)= 0'
							END
exec  sp_executeSql  @tmpstr,N'@Ordid int,@Tblsno int,@Fabid int,@cntid int,@colid int,@designid int,@Prev_Rate_Fab numeric(18,3) OUTPUT',@Ordid ,@Tblsno ,@Fabid ,@cntid ,@colid,@designid,@Prev_Rate_Fab OUTPUT
                            If  @Prev_Rate_Fab > 0 
							BEGIN
								
							goto Ord_InsertFAbric;
							END
                            select @Tblsno=@TblSno-1
                   End--Prev_rate Loop Ends
				   end
 				  
				   
                   Ord_InsertFAbric:update StockRatePost set cumbillrate= @rate+@Prev_rate_fab where ordid=@Ordid and deptid=@Prs and fabid=@fabid and cntid=@cntid  and  isnull(colid,0)=@colid and isnull(designid,0)=@designid  
                FETCH NEXT FROM Fabric_Dept
				INTO @Fabid,@Colid,@designid,@Rate,@cntid
                END;--Fab entry loop Begins except fabtoyarn
                CLOSE Fabric_Dept;
                DEALLOCATE Fabric_Dept;
			    End  --FAbric Entry ends
		   end --In type 'F' ends
		   End --Else loopEnds
      FETCH NEXT From O_dept
	  INTO @Prs,@Sno
	  END ;--Order Entry loop ends
	  CLOSE O_Dept;
      DEALLOCATE O_Dept;
   end--Order entry ends
   FETCH NEXT FROM StkReports
   INTO @ordid;
   END;--Ord Loop ends
   CLOSE StkReports;
   DEALLOCATE StkReports;
   
   End
