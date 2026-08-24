
/*;=============================================
; Author		    :		DHARANI A.
; Create date		:		28/03/2014
; Create By		    :		DHARANI
; Description		:		StockRate Post
; Change Person		:		SUGANYA
; Last Change Date	:		01/03/2025 10:55
; =============================================	*/
CREATE trigger  [dbo].[Tgr_StockRatePost]  on [dbo].[StockRatePost] 
For Insert,Delete ,update
as
Declare 
@Ordid int,
@Prs int,
@sno int,
@InputType char(1),@FabToYarn_Slno int,@I_OrdrID int,@DeptSno int, @Knit_Slno Int

   DECLARE @FTY_RateFlg1 CHAR(1)
   DECLARE @YCns_Id Int
   DECLARE @TmpLooseFabId Int

Select @I_OrdrID = Ordid from INSERTED  WHERE ordid not in (select ordid from ordermas where jobno=0)

Select @FabToYarn_Slno = Sno from StockRatePost Where Ordid = @I_OrdrID and deptid = 15

Select @Knit_Slno = Sno from StockRatePost Where Ordid = @I_OrdrID and deptid = 4

print 'ASLAM-88'
print @i_OrdrID
print @FabToYarn_Slno 
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

					   /* ASDTEST */
					

					   Select @FTY_RateFlg1 = ISNULL(FabToYarnRate_ReqInKnit,'N') From Options1 
					   If @FTY_RateFlg1 = 'Y' And  exists(Select 1 from StockRatePost Inner Join Mas_Dept On StockRatePost.deptid = Mas_Dept.Deptid  where									    StockRatePost.deptid =15 and Mas_Dept.deptname='FABRIC TO YARN') 
						
						BEGIN
					    DECLARE Knitt_FTY CURSOR FOR
					   select distinct Fabid,cntid,colid ,case when isnull(billrate,0)=0 then isnull(procrate,0) else isnull(billrate,0) end as rate from stockratepost where                               ordid=@Ordid and deptid= @Prs
					   OPEN Knitt_FTY;
					   FETCH NEXT FROM Knitt_FTY
					   INTO @Fabid, @cntid,@colid,@rate
					   WHILE @@FETCH_STATUS = 0
					   BEGIN--Knitt_FTY loop starts
					   select @Prev_rate=0
					   Select @TmpLooseFabId = 0

						If @colid = 0 
						Begin

						Select @TmpLooseFabId = IsNull(LooseFab,0) from prog_clrcomb INNER JOIN prog_ycns ON prog_clrcomb.ID = prog_ycns.ID INNER														JOIN prog_cns on prog_cns.id=prog_clrcomb.id Where  prog_clrcomb.OrdId = @Ordid AND prog_clrcomb.LooseFab =@Fabid 
						
						IF  @TmpLooseFabId > 0 
						  
						 BEGIN 
						 
						 DECLARE Y_cons_Ord_FTY CURSOR FOR
					        SELECT Distinct 0 YClr, Ycount,Avg(consPer) As Per,  0 As Id FROM (
							SELECT 0 As YClr, YCount, SUM(consPer) As consPer, Id  FROM (
						 SELECT Distinct Prog_Ycns.YClr, prog_ycns.Ycount,(prog_ycns.consPer) As consPer, Prog_Ycns.ID FROM prog_clrcomb INNER JOIN prog_ycns ON prog_clrcomb.ID =                               prog_ycns.ID	INNER JOIN  prog_cns on prog_cns.id=prog_clrcomb.id WHERE prog_clrcomb.OrdId = @Ordid AND prog_clrcomb.LooseFab =@Fabid  )Z   GROUP BY                              Ycount, Id ) Y GROUP BY YCount
						 /*and  prog_ycns.YClr= @colid  AND                                          prog_clrcomb.Fincnt = @cntid*/
						 END
						 ELSE

						 BEGIN

						  DECLARE Y_cons_Ord_FTY CURSOR FOR
						  SELECT Distinct 0 YClr, Ycount,Avg(consPer) As Per, 0 As Id FROM (
						  SELECT 0 As YClr, YCount, SUM(consPer) As consPer, Id  FROM (
						  SELECT Distinct Prog_Ycns.YClr, prog_ycns.Ycount,(prog_ycns.consPer) As consPer, Prog_Ycns.ID FROM prog_clrcomb INNER JOIN prog_ycns ON prog_clrcomb.ID =                                 prog_ycns.ID   INNER JOIN  prog_cns on prog_cns.id=prog_clrcomb.id WHERE prog_clrcomb.OrdId = @Ordid AND prog_clrcomb.FabDesc =@Fabid									          AND  prog_clrcomb.Fincnt = @cntid  /* and  prog_ycns.YClr= @colid   */ )Z   GROUP BY Ycount, Id ) Y							          GROUP BY YCount

						 END 

						
						end
                        
						Else

						begin

						Select @TmpLooseFabId = IsNull(LooseFab,0) from prog_clrcomb INNER JOIN prog_ycns ON prog_clrcomb.ID = prog_ycns.ID INNER								                          JOIN  prog_cns on prog_cns.id=prog_clrcomb.id Where  prog_clrcomb.OrdId = @Ordid AND prog_clrcomb.LooseFab =@Fabid and  prog_ycns.YClr= @colid  AND                                prog_clrcomb.Fincnt = @cntid
						
						IF  @TmpLooseFabId > 0 

						BEGIN  

						 DECLARE Y_cons_Ord_FTY CURSOR FOR

						 SELECT Distinct prog_ycns.YClr, prog_ycns.Ycount,prog_ycns.consPer, Prog_Ycns.ID  FROM prog_clrcomb INNER JOIN prog_ycns ON prog_clrcomb.ID =									 prog_ycns.ID INNER JOIN  prog_cns on prog_cns.id=prog_clrcomb.id WHERE prog_clrcomb.OrdId = @Ordid AND prog_clrcomb.LooseFab = @Fabid 
						 AND prog_clrcomb.Fincol = @colid /*AND                                     prog_clrcomb.Fincnt = @Cntid*/

						END

						ELSE
						 
						BEGIN

						 DECLARE Y_cons_Ord_FTY CURSOR FOR

						SELECT Distinct prog_ycns.YClr, prog_ycns.Ycount,prog_ycns.consPer, Prog_Ycns.ID FROM prog_clrcomb INNER JOIN prog_ycns ON prog_clrcomb.ID = prog_ycns.ID                         INNER JOIN  prog_cns on prog_cns.id=prog_clrcomb.id WHERE prog_clrcomb.OrdId = @Ordid AND prog_clrcomb.FabDesc = @Fabid AND prog_clrcomb.Fincol =                                 @colid  AND  prog_clrcomb.Fincnt = @Cntid

						END
					
                        end
                        OPEN Y_cons_Ord_FTY
						FETCH NEXT FROM Y_cons_Ord_FTY
						INTO @YClr,@Ycnt,@Per,@YCns_Id
						WHILE @@FETCH_STATUS =0
						BEGIN--Y_cons_in Knitt_FTY Loop begins
							Select @Tblsno =@Sno-1
							While @Tblsno >= 1
							Begin --Prev_Rate Loop
							Select @TmpRate=0
							
							If @colid = 0 
							BEGIN
							select @TmpRate=isnull(cumbillrate,0)  from StockRatePost where  ordid= @Ordid and  sno= @Tblsno and  cntid = @YCnt And isnull(colid,0)= 0 
							END
							
							Else
							BEGIN
							select @TmpRate=isnull(cumbillrate,0)  from StockRatePost where  ordid= @Ordid and  sno= @Tblsno and  cntid = @YCnt  and isnull(colid,0)= @YClr   
							END   

							 If @TmpRate > 0 
							 BEgin
							 goto YCons_Ord_FTY
							 end 
							 select @Tblsno=@Tblsno-1
							end--Prev_Rate Loop
						    YCons_Ord_FTY: Select  @Prev_rate = @Prev_rate + (@TmpRate * (@Per/ 100)) 
						FETCH NEXT FROM Y_cons_Ord_FTY
						INTO @YClr,@Ycnt,@Per,@YCns_Id      
						END;--Y_cons_in Knitt_FTY Loop ends
		  				CLOSE 	Y_cons_Ord_FTY;
						DEALLOCATE Y_cons_Ord_FTY;
						
	                    Ord_insertion_FTY:  update StockRatePost set cumbillrate= isnull(@rate,0)+isnull(@Prev_Rate,0)  where ordid=@Ordid and deptid=@Prs and  fabid=@fabid and						Cntid=@cntid and isnull(colid,0)=@colid                            
					   FETCH NEXT FROM Knitt_FTY
					   INTO @Fabid, @cntid,@colid,@rate
					   END;--Knit loop Ends
					   CLOSE Knitt_FTY;
					   DEALLOCATE Knitt_FTY;
					   END
					   /*ASDTEST*/


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
					print 'fty'
					print @tblsno
						/* TEST */
					DECLARE @Prev_YRate Numeric(18,2)
					DECLARE @Prev_YRate1 Numeric(18,2)
					DECLARE @FTY_RateFlg CHAR(1) 

					while @TblSno >= 1
					Begin--Prev_rate Loop Begins
                        select @Prev_Rate=0

						/* TEST */
                      	select @Prev_YRate=0
						select @Prev_YRate1=0

						/* TEST */
						 Select @FTY_RateFlg = ISNULL(FabToYarnRate_ReqInKnit,'N') From Options1 
						 If @FTY_RateFlg = 'Y'
						
						/* AsdTEST */
						BEGIN
						select @Prev_Rate = isnull(sum(cumBillrate),0)  from StockRatePost where  ordid= @Ordid and sno= @TblSno and cntid= @cntid and colid=@colid and YF='F' And						fabid In (Select Distinct FabId From (select ISNULL(fabid,0) As FabId, ordid from StockRatePost where  ordid= 2028 and sno= 4 and cntid= 229 and colid=151						and YF='F' ) A Inner Join (Select Distinct OrdID, LooseFab From Prog_ClrComb)  B On A.ordid = B.OrdId And A.FabId = IsNull(B.LooseFab,0))
						END
						ELSE
						
						BEGIN
						select @Prev_Rate = isnull(sum(cumBillrate),0)  from StockRatePost where  ordid= @Ordid and sno= @TblSno and cntid= @cntid and colid=@colid and YF='F'
						END

						/* AsdTEST */
											 
						

					/*	BEGIN

						select @Prev_YRate = isnull(sum(cumBillrate),0)  from StockRatePost where  ordid= @Ordid  and sno= @Knit_Slno - 1 and cntid= @cntid and colid=0 and YF='Y'  						select @Prev_YRate1 = isnull(sum(cumBillrate),0)  from StockRatePost where  ordid= @Ordid  and sno= @Knit_Slno - 1 and cntid= @cntid and colid=@Colid and						YF='Y'					
						
						END  */

						If @Prev_Rate> 0 
						Begin
							goto Ord_insertionFAbToYARN;
						End 
					Select @TblSno=@TblSno-1
					End--Prev_rate Loop Ends
					/* TEST */
                    Ord_insertionFAbToYARN: update StockRatePost set cumBillrate= @rate+@Prev_Rate + ISNULL(@Prev_YRate,0) + ISNULL(@Prev_YRate1,0) where ordid=@Ordid and deptid=@Prs  and cntid=@cntid and colid=@colid 

                    FETCH NEXT FROM FabToYarn
				    INTO @cntid,@colid,@rate
                  END;--FAbtoYarn loop Begins
                  CLOSE FabToYarn;
                  DEALLOCATE FabToYarn;

				    /* ASDTEST */
					  

					   Select @FTY_RateFlg1 = ISNULL(FabToYarnRate_ReqInKnit,'N') From Options1 
					   If @FTY_RateFlg1 = 'Y' And  exists(Select 1 from StockRatePost Inner Join Mas_Dept On StockRatePost.deptid = Mas_Dept.Deptid  where									    StockRatePost.deptid =15 and Mas_Dept.deptname='FABRIC TO YARN') 
						
						BEGIN
					    DECLARE Knitt_FTY1 CURSOR FOR
					   select distinct Fabid,cntid,colid ,case when isnull(billrate,0)=0 then isnull(procrate,0) else isnull(billrate,0) end as rate from stockratepost INNER JOIN prog_clrcomb ON prog_clrcomb.FabDesc = StockRatePost.fabid And prog_clrcomb.FinCnt = StockRatePost.cntid And prog_clrcomb.FinCol = StockRatePost.colid  where                               stockratepost.ordid=@Ordid and deptid= 4  And ISNULL(LooseFab,0) > 0
					   OPEN Knitt_FTY1;
					   FETCH NEXT FROM Knitt_FTY1
					   INTO @Fabid, @cntid,@colid,@rate
					   WHILE @@FETCH_STATUS = 0
					   BEGIN--Knitt_FTY1 loop starts
					   
					   DECLARE @TmpFabId Int
					   SELECT @TmpFabId = ISNULL(FabDesc,0) FROM Prog_ClrComb Where FabDesc=@Fabid And prog_clrcomb.Fincnt = @cntid And ISNULL(LooseFab,0) > 0
					   IF @TmpFabId > 0 

					   select @Prev_rate=0
					   Select @TmpLooseFabId = 0

						If @colid = 0 
						Begin

						Select @TmpLooseFabId = IsNull(LooseFab,0) from prog_clrcomb INNER JOIN prog_ycns ON prog_clrcomb.ID = prog_ycns.ID INNER														JOIN prog_cns on prog_cns.id=prog_clrcomb.id Where  prog_clrcomb.OrdId = @Ordid AND prog_clrcomb.FabDesc =@Fabid And prog_clrcomb.Fincnt = @cntid
						
						IF  @TmpLooseFabId > 0 
						  
						 BEGIN 
						 
						 DECLARE YCons_Ord_Knitt_FTY CURSOR FOR
					        SELECT Distinct 0 YClr, Ycount,Avg(consPer) As Per,  0 As Id FROM (
							SELECT 0 As YClr, YCount, SUM(consPer) As consPer, Id  FROM (
						 SELECT Distinct Prog_Ycns.YClr, prog_ycns.Ycount,(prog_ycns.consPer) As consPer, Prog_Ycns.ID FROM prog_clrcomb INNER JOIN prog_ycns ON prog_clrcomb.ID =                          prog_ycns.ID	INNER JOIN  prog_cns on prog_cns.id=prog_clrcomb.id WHERE prog_clrcomb.OrdId = @Ordid AND prog_clrcomb.FabDesc =@Fabid  AND								      prog_clrcomb.Fincnt = @cntid )Z   GROUP BY                              Ycount, Id ) Y GROUP BY YCount
						 /*and  prog_ycns.YClr= @colid  */
						 END

						ELSE
						BEGIN 
						DECLARE YCons_Ord_Knitt_FTY CURSOR FOR
						  SELECT Distinct 0 YClr, 0 Ycount,0 Per,  0 As Id FROM prog_clrcomb

						
						 END

						end
                        
						Else

						Begin

						Select @TmpLooseFabId = IsNull(LooseFab,0) from prog_clrcomb INNER JOIN prog_ycns ON prog_clrcomb.ID = prog_ycns.ID INNER								                          JOIN  prog_cns on prog_cns.id=prog_clrcomb.id Where  prog_clrcomb.OrdId = @Ordid AND prog_clrcomb.FabDesc =@Fabid and  prog_clrcomb.FinCol= @colid  AND                                prog_clrcomb.Fincnt = @cntid
						
						IF  @TmpLooseFabId > 0 
						--PRINT 'ABC'
						
						BEGIN  

						 DECLARE YCons_Ord_Knitt_FTY CURSOR FOR

						 SELECT Distinct prog_ycns.YClr, prog_ycns.Ycount,prog_ycns.consPer, Prog_Ycns.ID  FROM prog_clrcomb INNER JOIN prog_ycns ON prog_clrcomb.ID =									 prog_ycns.ID INNER JOIN  prog_cns on prog_cns.id=prog_clrcomb.id WHERE prog_clrcomb.OrdId = @Ordid AND prog_clrcomb.FabDesc = @Fabid 
						 AND prog_clrcomb.Fincol = @colid AND                                     prog_clrcomb.Fincnt = @Cntid

						END

						ELSE

						BEGIN 

						 DECLARE YCons_Ord_Knitt_FTY CURSOR FOR

						SELECT Distinct 0 YClr, 0 Ycount,0 Per,  0 As Id FROM prog_clrcomb

						END
					
                        End
                        OPEN YCons_Ord_Knitt_FTY
						FETCH NEXT FROM YCons_Ord_Knitt_FTY
						INTO @YClr,@Ycnt,@Per,@YCns_Id
						WHILE @@FETCH_STATUS =0
						BEGIN--Y_cons_in Knitt_FTY1 Loop begins
							Select @Tblsno = @FabToYarn_Slno 
							--While @Tblsno >= 1
							--Begin --Prev_Rate Loop
							Select @TmpRate=0
							
							select @TmpRate=isnull(cumbillrate,0)  from StockRatePost where  ordid= @Ordid and  sno= @Tblsno and  cntid = @YCnt  and isnull(colid,0)= @YClr   

							 If @TmpRate > 0 
							 BEgin
							 goto YCons_Ord_FTY_Knitt
							end 
							-- select @Tblsno=@Tblsno-1
							--End--Prev_Rate Loop
						    YCons_Ord_FTY_Knitt: Select  @Prev_rate = @Prev_rate + (@TmpRate * (@Per/ 100)) 
						FETCH NEXT FROM YCons_Ord_Knitt_FTY
						INTO @YClr,@Ycnt,@Per,@YCns_Id      
						END;--Y_cons_in Knitt_FTY1 Loop ends
		  				CLOSE 	YCons_Ord_Knitt_FTY;
						DEALLOCATE YCons_Ord_Knitt_FTY;
						PRINT 'TESTASD'
	                    Ord_insertion_FTY_Knit:  update StockRatePost set cumbillrate= isnull(@rate,0)+isnull(@Prev_Rate,0)  where ordid=@Ordid and deptid=4 and  fabid=@fabid and						Cntid=@cntid and isnull(colid,0)=@colid  
						PRINT 'TESTASD'                          
					   FETCH NEXT FROM Knitt_FTY1
					   INTO @Fabid, @cntid,@colid,@rate
					   END;--Knit loop Ends
					   CLOSE Knitt_FTY1;
					   DEALLOCATE Knitt_FTY1;
					   END

					     /* ASDTEST */

				End--Fabtoyarn Entry Ends



			    else
			    Begin --FAbric Entry Begins 
				
				DECLARE Fabric_Dept CURSOR  FOR
				select distinct Fabid,colid,designid ,case when isnull(billrate,0)=0 then isnull(procrate,0) else isnull(billrate,0) end as rate ,cntid,sno from  stockratepost where                    ordid=@Ordid and deptid= @Prs
				OPEN Fabric_Dept;
				FETCH NEXT FROM Fabric_Dept
				INTO @Fabid,@Colid,@designid,@Rate,@cntid,@DeptSno
                WHILE @@FETCH_STATUS =0 
                BEGIN--Fab entry loop Begins except fabtoyarn
				   SElect @Tblsno =@Sno-1
				   print @tblsno
				   print 'xyz'
				   if @Tblsno=0 --poomani 07-Aug-2021 eagle ready fabric cumrate null transfer compacting rate 101 but actual 401 124/20 to 17/21 ord
				   begin
					print 'xyz11'
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
							print 'ABCD'
							/*print @tblsno
							print @tmpstr
							print @fabid
							print @cntId
							print @colId
							print @designid */
exec  sp_executeSql  @tmpstr,N'@Ordid int,@Tblsno int,@Fabid int,@cntid int,@colid int,@designid int,@Prev_Rate_Fab numeric(18,3) OUTPUT',@Ordid ,@Tblsno ,@Fabid ,@cntid ,@colid,@designid,@Prev_Rate_Fab OUTPUT
							
							PRINT rTRIM(@Prev_Rate_Fab ) + ' - S'
						    PRINT @PRS 
							/*
							IF @Tblsno +1 = @FabToYarn_Slno+1 
							begin
							PRINT 'ssss'
							 PRINT @PREV_RATE_FAB
								set @Prev_Rate_Fab = 0 
								PRINT 'SSS1'
								PRINT @PREV_RATE_FAB
							end  
							 */
                            If  @Prev_Rate_Fab > 0 
							BEGIN
								
							goto Ord_InsertFAbric;
							END
                            select @Tblsno=@TblSno-1
                   End--Prev_rate Loop Ends
				   end
 				  
				   
                   Ord_InsertFAbric:
				   print 'xxxx-tttt'
					print @deptSno
					print @fabtoyarn_slno
					/* Asd */
			/*	--if  exists(Select 1 from OrdSeq a (nolock) where  Prs=15 and Ordid = @Ordid)
				--BEGIN
				--   if @DeptSno <> @FabToYarn_Slno +1
				--   BEgin
				--   print 'done'
				--   update StockRatePost set cumbillrate= @rate+@Prev_rate_fab where ordid=@Ordid and deptid=@Prs and fabid=@fabid and cntid=@cntid  and  isnull(colid,0)=@colid and isnull(designid,0)=@designid  
				--   END
				--   ELSE
				--   BEGIN
				--		DECLARE @f_YcntID int,@F_YclrID int , @F_Perc numeric(19,2) 
				--		DECLARE @TRate1 Numeric(18,2)
				--		DECLARE @TRate2 Numeric(18,2)
				--		DECLARE Fabric_TO_YARN_DATA CURSOR  FOR
						    

				--			select distinct b.YCount,B.Yclr,b.ConsPer FROM Prog_ClrComb a INNER JOIN Prog_Ycns B ON A.ID = B.ID WHERE Ordid = @Ordid And FabDesc = @Fabid and FinCnt = @cntID and FinCol = @Colid							
				--			OPEN Fabric_TO_YARN_DATA;
				--			FETCH NEXT FROM Fabric_TO_YARN_DATA INTO @f_YcntID,@F_YclrID,@F_Perc
				--			set @trate1=0
				--			WHILE @@FETCH_STATUS =0 
				--			BEGIN
							    
				--				Select @TRate2 = (isnull(cumbillrate ,0) * @F_Perc/100)   from StockRatePost where  ordid= @ORdid and sno= @FabToYarn_Slno and	cntid=@f_YcntID and YF='Y'  and isnull(colid,0)= @F_YclrID  
				--				Select @TRate1 = isnull(@TRate1,0) + (isnull(cumbillrate ,0) * @F_Perc/100)   from StockRatePost where  ordid= @ORdid and sno= @FabToYarn_Slno and	cntid=@f_YcntID and YF='Y'  and isnull(colid,0)= @F_YclrID  

				--				print 'global'
				--				print @FabToYarn_Slno
				--				print @f_YcntID
				--				print @F_YclrID
				--				Print @TRate2
				--			FETCH NEXT FROM Fabric_TO_YARN_DATA INTO @f_YcntID,@F_YclrID,@F_Perc
				--			END;
				--			CLOSE Fabric_TO_YARN_DATA;
				--			DEALLOCATE Fabric_TO_YARN_DATA;
							
							
				--   update StockRatePost set cumbillrate= @Rate + @TRate1  where ordid=@Ordid and deptid=@Prs and fabid=@fabid and cntid=@cntid  and  isnull(colid,0)=@colid and isnull(designid,0)=@designid  
				--   END
				
				--END
				--ELSE
				
				--   BEGIN */
				    update StockRatePost set cumbillrate= @rate+@Prev_rate_fab where ordid=@Ordid and deptid=@Prs and fabid=@fabid and cntid=@cntid  and  isnull(colid,0)=@colid and isnull(designid,0)=@designid  
				 /* -- END */

                FETCH NEXT FROM Fabric_Dept
				INTO @Fabid,@Colid,@designid,@Rate,@cntid,@DeptSno
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










