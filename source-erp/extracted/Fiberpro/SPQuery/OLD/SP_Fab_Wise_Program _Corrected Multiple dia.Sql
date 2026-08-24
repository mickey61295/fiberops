
/*
;=============================================
; Author		:		Global Software's
; Create date		:		13/12/2013
; Create By		:		Radhakrishnan.R
; Description		:		Fabric Wise Program  ( SRG Excel Format )
; Change Person		:		ASLAM 
; Last Change Date	:		13/10/2014 02.10 PM
; =============================================	
select Ordid,styleno from ordermas where jobno='434'
select * from	TmpProg where row=15
select * from	TmpFabPro 

 exec sp_rename tmpprog,tmpprog_rk
 
 alter table TmpProg add Guid nvarchar(256)
 alter table TmpFabPro add Guid nvarchar(256)
 
 
SP_Fab_Wise_Program 'a7eb5204-ccc5-4ec0-a13a-d5041263e102',1026,'BG4002'
  SELECT Distinct DeptName,Sl FROM Vue_OrderProcess where Styleno = '180457' and OrdID = 937 Order By sl desc
 select * from	TmpProg 
select * from	TmpFabPro 


505
SP_Fab_Wise_Program '0ada618d-410f-413e-8405-3c40224f34a3',1201,'STYLE  001'

489
SP_Fab_Wise_Program '0b729785-6c13-4d3b-867e-7925b41b0b1d',1164,'503200'



503
SP_Fab_Wise_Program '0db2f038-b254-4f71-84b8-b09876244946',1194,'512477R'

493
SP_Fab_Wise_Program '92571701-4a59-4e5d-8e80-bbe728f3fd92',1170,'180469 DP3'


 Select distinct Ordid ,Sum(OrderQty) from AssQty where Ordid in (1164,1170,1194)  group by Ordid
select Ordid,Sum(Qty) from (Select distinct Ordid ,Sum(OrderQty) as Qty from AssQty where Ordid in (1164,1170,1194)  group by Ordid,colid)x group  by Ordid


drop proc SP_Fab_Wise_Program_old
*/

--Create Procedure SP_Fab_Wise_Program(@Guid nvarchar(256),@OrdID int, @StyleNo char(20))

CREATE Procedure SP_Fab_Wise_Program(@Guid nvarchar(256),@OrdID int, @StyleNo char(100))
as
begin--B0

Set Nocount on 
SET ANSI_NULLS ON
SET QUOTED_IDENTIFIER ON
		declare @Sno int				,
				@MaxSno int				,
				@OrdQty int				,
				@Head varchar(50)		,
				@Desc varchar(50)		,
				@Value Varchar(50)		,
				@Process Varchar(500)	,
	         	@ClrCombID int			,
				@StyleNo1 varchar(50)	,
				@CompDescr varchar(50)	,
				@compID int				,
				@CompGrdSlno int		,
				@DeptName varchar(50)	,
				@Per int				,
				@Wgt numeric(18,5)		,
				@Wgt_tmp numeric(18,5)	,
				@pcswgt  numeric(18,5)	,
				@pcswgt_p numeric(18,5)	,
				@Row int				,
				@Qty int				,
				@OrderQty	int			,
				@QtyTmp int				,
				@FabID	int				,
				@Fabdesc varchar(50)	,
				@Yclr	int				,
				@Fclr	int				,
				@ColorDesc varchar(50)	,
				@Count int				,
				@Sl	int					,
				@PartSlno int			,
				@EntryOption int        ,
				@TblView Varchar(100)   ,
				@OrderPartDtlCount  int ;
				
				
				Select @EntryOption = IsNull(EntryOption,1) From OrderMas where Ordid=@Ordid 
				Select @OrderPartDtlCount = Count(*) from order_PartDtl where Ordid=@Ordid 
				
				----if @EntryOption = 1 
				----	Begin
				----		SELECT @TblView = 'AssQty'
				----	End
				----Else
				----	BEgin
				----		SELECT @TblView = 'AssQty_Multiple'
				----	End 
		delete 	from	tmpprog where	Guid=@Guid;
		delete  from	TmpFabPro  where Guid=@Guid;
		
		
		
        
		/*Quantity*/
        			 select @OrderQty=  Sum(Qty) from (
			 Select distinct Sum(OrderQty) as Qty from AssQty 
			 Where Styleno In (Select IDStr From fnSplitter_Str(@Styleno)) and Ordid=@Ordid
			 group by colid
			 )x
print 'as' + Rtrim(@OrderQty)
        /* Table Finish Dia */
         select  @Head = 'Table Dia';
         Select @Row = 5;
         print 'test1'
        ;with   cte(ClrCombID,Styleno,CompDescr,compID,Slno) as  
        (
        SELECT A.ClrCombID,A.Styleno,B.CompDescr,A.compID, CompGrdSlno as slno
        FROM Prog_ClrComb A
        INNER JOIN Mas_Component B (nolock) ON A.compID = B.CompID  
        WHERE A.Styleno In (Select IDStr From fnSplitter_Str(@Styleno)) and  A.OrdID = @OrdID 
        GROUP BY A.ClrCombID,A.Styleno,B.CompDescr,A.compID,A.CompGrdSlno 
        )
        
       
        Insert into  tmpprog (Styleno   ,Row,CompDescr		,Head , Value      ,OrdID  ,Slno	,GUID)
        SELECT   A.Styleno,@Row  ,A.CompDescr +'->' + IsNull(E.PartName,'') + '~'+ IsNull(D.Dia,'')   ,@Head, IsNull(D.Dia,''),@OrdID ,A.Slno,@Guid 
        FROM cte A
        INNER JOIN Prog_ClrComb B	(nolock)	
			ON	B.ClrCombID	= A.ClrCombID 	and B.Styleno	= A.Styleno 
			and B.OrdID		= @OrdID		and	B.compID	= A.compID and a.slno = B.CompGrdSlno
        LEFT OUTER JOIN Prog_Cns		C	(nolock)	ON B.ID			= C.ID 
        LEFT OUTER JOIN Mas_Dia		D	(nolock)	ON C.fdia		= D.DiaID
        LEFT OUTER JOIN Mas_Part E ON B.PartID = E.PartID
		GROUP BY   A.Styleno,A.Slno,A.CompDescr, IsNull(D.Dia,''),IsNull(E.PartName,'')

print 'test2'
        /*Kniting Dia*/
        
         Select @Head = 'Kniting Dia';
          Select @Row = 6;
         ;with   cte(ClrCombID,Styleno,CompDescr,compID,Slno) as  
        (
        SELECT A.ClrCombID,A.Styleno,B.CompDescr,A.compID, A.CompGrdSlno
        FROM Prog_ClrComb A
        INNER JOIN Mas_Component B (nolock) ON A.compID = B.CompID  
        WHERE A.Styleno In (Select IDStr From fnSplitter_Str(@Styleno)) and  A.OrdID = @OrdID 
        GROUP BY A.ClrCombID,A.Styleno,B.CompDescr,A.compID ,A.CompGrdSlno 
        )
       

		Insert into tmpprog (Styleno,Row, CompDescr, Head, Value,OrdID,Slno,GUID) 
        SELECT  A.Styleno,@Row,A.CompDescr + '->' + IsNull(E.PartName,'') + '~'+ IsNull(K.Dia,'')  ,@Head, D.Dia,@OrdID ,A.Slno,@Guid 
        FROM cte A
        INNER JOIN Prog_ClrComb	B	ON	B.ClrCombID = A.ClrCombID	and		B.Styleno = A.Styleno
		 							and B.OrdID		= @OrdID		and		B.compID  = A.compID
		 							and a.slno = b.compGrdSlno
        LEFT OUTER JOIN Prog_Cns		C	ON B.ID = C.ID 
        LEFT OUTER JOIN Mas_Dia		D	ON C.kdia = D.DiaID
        LEFT OUTER JOIN Mas_Dia		K	ON C.fdia = K.DiaID
        LEFT OUTER JOIN Mas_Part E ON B.PartID = E.PartID
        
        GROUP BY  A.Styleno,A.Slno,A.CompDescr, D.Dia,IsNull(K.Dia,''),IsNull(E.PartName,'')
                
		--SELECT @Count = distinct count(distinct Prog_Cns.pcswgt) 
		--FROM Prog_ClrComb 
		--INNER JOIN Prog_Prsloss ON Prog_ClrComb.ID = Prog_Prsloss.ID 
		--INNER JOIN Prog_Cns ON Prog_ClrComb.ID = Prog_Cns.ID 
		--INNER JOIN Mas_Dept ON Prog_Prsloss.Prs = Mas_Dept.DeptID 
		--INNER JOIN AssQty ON AssQty.OrdID = Prog_ClrComb.OrdID and AssQty.SizeId = Prog_Cns.SizID 
		--WHERE ISnull(Prog_Prsloss.Loss_Per,0)	>	0			and		Prog_ClrComb.Component_Block	=	'N' 
		--and		Prog_ClrComb.ClrCombID			=	ClrCombID	and		Prog_ClrComb.Styleno			=	Styleno
		--and		Mas_Dept.inputType in('Y','F')					and		Prog_ClrComb.OrdID				= @OrdID
		--and		Prog_ClrComb.compID				= compID
		--group by  Prog_Cns.pcswgt
  
  
		/* PCS Wgt */
		
		Select @Head = 'PCS Wgt(Avg)';
		Select @Row = 7;
         ;with   cte(Styleno,CompDescr,compID,Slno,ClrCombID) as  
        (
        SELECT A.Styleno,B.CompDescr ,A.compID, A.CompGrdSlno as slno,A.ClrCombID
        FROM Prog_ClrComb A
        INNER JOIN Mas_Component B (nolock) ON A.compID = B.CompID  
        WHERE A.Styleno In (Select IDStr From fnSplitter_Str(@Styleno)) and  A.OrdID = @OrdID 
        GROUP BY A.Styleno,B.CompDescr,A.compID,A.ClrCombID ,A.CompGrdSlno
        )
        
        --convert(decimal(10,3),Avg(C.pcswgt/1000))
        Insert into tmpprog (Styleno,Row, CompDescr, Head, Value,OrdID,Slno,GUID)
           --print 'asl-pcswt' ;
		SELECT  A.Styleno,@Row,A.CompDescr +'->' + IsNull(E.PartName,'') + '~'+ IsNull(K.Dia,'')   ,@Head,CONVERT(decimal(10, 5),case when B.WtUom >0 then AVG(C.pcswgt)*B.WtUom else AVG(C.pcswgt/1000) end)
		,@OrdID ,A.Slno,@Guid 
		From cte A
		INNER JOIN Prog_ClrComb	B	ON B.Styleno = A.Styleno  and  B.OrdID = @OrdID and B.compID  = A.compID and b.ClrCombID =A.ClrCombid and a.Slno = B.CompGrdSlno 
		LEFT OUTER JOIN Prog_Cns		C	ON B.ID			= C.ID 
		LEFT OUTER JOIN Mas_Dia		K	ON IsNull(C.fdia,0) = K.DiaID
		LEFT OUTER JOIN Mas_Part E ON B.PartID = E.PartID
		Group by  A.Styleno,A.CompDescr ,A.Slno,B.WtUom,IsNull(K.Dia,''),IsNull(E.PartName,'')
		--,C.pcswgt
    
       
        /*Process Loss%*/
		Select @Head = 'Pro. Loss %';
		Select @Row = 8;
         ;with   cte(Styleno,CompDescr,compID,Slno,ClrCombID) as  
        (
        SELECT A.Styleno,B.CompDescr,A.compID,A.CompGrdSlno as Slno,A.ClrCombID
        FROM Prog_ClrComb A
        INNER JOIN Mas_Component B (nolock) ON A.compID = B.CompID  
        WHERE A.Styleno In (Select IDStr From fnSplitter_Str(@Styleno)) and  A.OrdID = @OrdID 
        GROUP BY A.Styleno,B.CompDescr,A.compID,A.ClrCombID ,A.CompGrdSlno
        )
		 Insert into tmpprog (Styleno,Row, CompDescr , Head, Value,OrdID,Slno,GUID)
        SELECT  A.Styleno,@Row,A.CompDescr + '->'+IsNull(E.PartName,'')+ '~'+ IsNull(K.Dia,'') ,@Head, ISnull(SUM(distinct C.Loss_Per),0),@OrdID ,A.Slno,@Guid 
        from cte A
        INNER JOIN Prog_ClrComb B	ON  B.Styleno	=	A.Styleno	and B.OrdID		=	@OrdID		and	B.compID  = A.compID
        And B.clrCombID = A.ClrCombID and a.Slno = B.CompGrdSlno
        INNER JOIN Prog_Prsloss C	ON	B.ID = C.ID 
        INNER JOIN Mas_Dept		D	ON	C.Prs = D.DeptID and D.inputType  in('Y','F') 
        LEFT OUTER JOIN Prog_Cns		P	ON B.ID			= P.ID 
        LEFT OUTER JOIN Mas_Dia		K	ON P.fdia = K.DiaID
        LEFT OUTER JOIN Mas_Part E ON B.PartID = E.PartID
        Group by  A.Styleno,A.CompDescr ,A.Slno,IsNull(K.Dia,''),IsNull(E.PartName,'')     
	
		DECLARE ClrComb CURSOR FOR
			SELECT A.Styleno,B.CompDescr + '->' + IsNull(E.PartName,'')+ '~' + IsNull(K.Dia,'') ,A.compID, A.CompGrdSlno--,A.ClrCombID
			FROM Prog_ClrComb A
			INNER JOIN Mas_Component B (nolock) ON A.compID = B.CompID  
			
			LEFT OUTER JOIN Prog_Cns		P	ON A.ID	= P.ID 
	        LEFT OUTER JOIN Mas_Dia		K	ON P.Fdia = K.DiaID
		    LEFT OUTER JOIN Mas_Part E ON A.PartID = E.PartID
		        
			WHERE A.Styleno In (Select IDStr From fnSplitter_Str(@Styleno)) and  A.OrdID = @OrdID 
			GROUP BY A.Styleno,B.CompDescr,A.compID,IsNull(K.Dia,''),IsNull(E.PartName,''),A.CompGrdSlno -- ,A.ClrCombId ,A.CompGrdSlno
        OPEN ClrComb;
		FETCH NEXT FROM ClrComb
		INTO @Styleno1,@CompDescr,@compID,@CompGrdSlno; --,@ClrCombId
 		WHILE @@FETCH_STATUS = 0
		BEGIN
		
			print 'aslam66' +  @CompDescr;
		
			/* Count */
			Select @Row = 4;
			select @sl = 1;
			
			DECLARE O_Count CURSOR FOR
				SELECT C.StyleNo,@CompDescr ,'Counts - '  as Head, 
				-- + '~' + K.Dia 
				---+ ' ' + rtrim(convert(decimal(10,0),SUM(D.ConsPer))) + '%' 
				B.CountName as Value, C.OrdID
				,c.compGrdSlno as Sno --C.CompGrdSlno
				From Prog_ClrComb		C	(nolock)	 
				INNER JOIN Prog_Ycns		D	(nolock)	ON C.ID = D.ID 
				INNER JOIN Mas_Count		B	(nolock)	on B.CountID = D.YCount --and C.FinCnt = B.CountID
				INNER JOIN Mas_Component	E	(nolock)	ON C.compID = E.CompID 
				
				INNER JOIN Prog_Cns		P	ON C.ID	= P.ID  -- changed on 11-oct-14
		        INNER JOIN Mas_Dia		K	ON P.Fdia = K.DiaID 
		        INNER JOIN Mas_Part		L	ON ISNull(C.PartID,0) = L.PartID 
		        
				where C.compID  = @compID  and C.Styleno In (Select IDStr From fnSplitter_Str(@Styleno))   
				--and E.CompDescr
				and  C.OrdID =@OrdID --And C.ClrCombID = @ClrCombID
				and Rtrim(E.CompDescr + +'->'+IsNull(L.PartName,'')+'~' + IsNull(K.Dia,'')) = Rtrim(@CompDescr)  
				GROUP BY  C.StyleNo, C.OrdID,B.CountName, E.CompDescr,D.ConsPer ,C.CompGrdSlno --,k.dia

			OPEN O_Count;
			FETCH NEXT FROM O_Count
			INTO @StyleNo1,@CompDescr,@Head,@value,@OrdID,@Sno;
			WHILE @@FETCH_STATUS = 0
			BEGIN
				print @value;
				insert into TmpProg (Styleno,Row, CompDescr, Head, Value,OrdID,Slno,Guid)
				Values(@StyleNo1,@Row, @CompDescr, @Head + rtrim(@sl), @Value,@OrdID,@Sno,@Guid)
				select @sl = @sl +1;
				FETCH NEXT FROM O_Count
				INTO @StyleNo1,@CompDescr,@Head,@value,@OrdID,@Sno;
			END;
			select @sl =0;
			CLOSE O_Count;
			DEALLOCATE O_Count;
			
			/*Process Seq*/
			print 'aaaa' + @compDescr
			if @EntryOption=1 OR @OrderPartDtlCount = 0 
				BEGIN
					DECLARE Seq CURSOR FOR
					SELECT Distinct FabID,Fabdesc
					FROM	Vue_OrderProcess 
					where Styleno In (Select IDStr From fnSplitter_Str(@Styleno)) and OrdID = @OrdID  and compID  = @compID
					OPEN Seq;
					FETCH NEXT FROM Seq
					INTO @FabID,@Fabdesc;
 					WHILE @@FETCH_STATUS = 0
						BEGIN
							Select @process = '';
							select @Head = @FabDesc;
							DECLARE Seq_Dept CURSOR FOR
								Select Distinct Deptname,Sl,IsNUll(PartSlno,0) FROM Vue_OrderProcess
								where Styleno In (Select IDStr From fnSplitter_Str(@Styleno)) 
								and OrdID = @OrdID  and compID  = @compID and fabID = @Fabid --and CompDescr=@CompDescr
								order by sl ,isnull(PartSlno,0)
							OPEN Seq_Dept;
							FETCH NEXT FROM Seq_Dept
							INTO @Deptname,@Sl,@PartSlno;
 							WHILE @@FETCH_STATUS = 0
								BEGIN
									if (@Process='')
									begin
										Select @Process =  @Deptname;
									end
								else
									begin
									Select @Process = @Process + ' + ' + @Deptname;
									end
									
									FETCH NEXT FROM Seq_Dept
									INTO @Deptname,@Sl,@PartSlno
								END;
								CLOSE Seq_Dept;
								DEALLOCATE Seq_Dept;
								
							Insert into tmpfabpro (Styleno,OrdID,Row, CompDescr, Head,Process,Guid,PartSlno) 
							Values(@StyleNo1,@OrdID,1, @CompDescr, @Head,@Process,@Guid,@PartSlno)
							FETCH NEXT FROM Seq
							INTO @FabID,@Fabdesc;
						END;
						CLOSE Seq;
						DEALLOCATE Seq;
				END
			ELSE
				BEGIN
					DECLARE Seq CURSOR FOR
			SELECT Distinct FabID,Fabdesc
			FROM	Vue_OrderProcess 
			where Styleno In (Select IDStr From fnSplitter_Str(@Styleno)) and OrdID = @OrdID  and compID  = @compID
			OPEN Seq;
			FETCH NEXT FROM Seq
			INTO @FabID,@Fabdesc;
 			WHILE @@FETCH_STATUS = 0
				BEGIN
					Select @process = '';
					select @Head = @FabDesc;
					DECLARE Seq_Dept CURSOR FOR
						Select Distinct Deptname,Sl,IsNUll(PartSlno,0) FROM Vue_OrderProcess
						where Styleno In (Select IDStr From fnSplitter_Str(@Styleno)) 
						and OrdID = @OrdID  and compID  = @compID and fabID = @Fabid and CompDescr=@CompDescr
						order by sl ,isnull(PartSlno,0)
					OPEN Seq_Dept;
					FETCH NEXT FROM Seq_Dept
					INTO @Deptname,@Sl,@PartSlno;
 					WHILE @@FETCH_STATUS = 0
						BEGIN
							if (@Process='')
							begin
								Select @Process =  @Deptname;
							end
						else
							begin
							Select @Process = @Process + ' + ' + @Deptname;
							end
							
							FETCH NEXT FROM Seq_Dept
							INTO @Deptname,@Sl,@PartSlno
						END;
						CLOSE Seq_Dept;
						DEALLOCATE Seq_Dept;
						
					Insert into tmpfabpro (Styleno,OrdID,Row, CompDescr, Head,Process,Guid,PartSlno) 
					Values(@StyleNo1,@OrdID,1, @CompDescr, @Head,@Process,@Guid,@PartSlno)
					FETCH NEXT FROM Seq
					INTO @FabID,@Fabdesc;
				END;
				CLOSE Seq;
				DEALLOCATE Seq;

				END 
			
			
			/*Process Loss%*/
			Select @Head = 'Loss Wgt'
			Select @Row = 9
			select @wgt =0;
			DECLARE Dept CURSOR FOR
				SELECT  distinct DeptName,Sl FROM Vue_OrderProcess 
				where Styleno In (Select IDStr From fnSplitter_Str(@Styleno)) and OrdID = @OrdID 
				Order By sl desc
			OPEN Dept;
			FETCH NEXT FROM Dept
			INTO @DeptName,@Sl;
 			WHILE @@FETCH_STATUS = 0
				BEGIN
					
					
					IF @EntryOption =1 or @OrderPartDtlCount=0
						Begin
						DECLARE PCS_Wgt CURSOR FOR
							SELECT  case when B.WtUom >0 then D.pcswgt*B.WtUom else D.pcswgt/1000 end as pcswgt
							,ISnull(C.Loss_Per,0) AS Per,Sum(Orderqty) as Qty
							FROM Prog_ClrComb B	
							INNER JOIN Prog_Prsloss C	(nolock)	ON B.ID		= C.ID		and ISnull(C.Loss_Per,0)>0
							INNER JOIN Prog_Cns		D	(nolock)	ON B.ID		= D.ID 
							INNER JOIN Mas_Dept		E	(nolock)	ON C.Prs	= E.DeptID  and		E.DeptName = @DeptName  
							and E.inputType in('Y','F') 
							INNER JOIN AssQty		F	(nolock)	ON F.OrdID	= B.OrdID	and		F.SizeId = D.SizID 
							WHERE B.Styleno In (Select IDStr From fnSplitter_Str(@Styleno)) and B.OrdID = @OrdID 
							and B.compID  = @compID --And B.ClrCombID = @ClrCombID
							Group by  D.pcswgt,C.Loss_Per,B.WtUom
						End 
					ELSe
						begin
						DECLARE PCS_Wgt CURSOR FOR
								SELECT  case when B.WtUom >0 then D.pcswgt*B.WtUom else D.pcswgt/1000 end as pcswgt
							,ISnull(C.Loss_Per,0) AS Per,Sum(Orderqty) as Qty
							FROM Prog_ClrComb B	
							INNER JOIN Prog_Prsloss C	(nolock)	ON B.ID		= C.ID		and ISnull(C.Loss_Per,0)>0
							INNER JOIN Prog_Cns		D	(nolock)	ON B.ID		= D.ID 
							INNER JOIN Mas_Dept		E	(nolock)	ON C.Prs	= E.DeptID  and		E.DeptName = @DeptName  
							and E.inputType in('Y','F') 
							INNER JOIN AssQty_Multiple		F	(nolock)	ON F.OrdID	= B.OrdID	and		F.SizeId = D.SizID 
							and F.PartID = IsNull(B.PartId,0)
							WHERE B.Styleno In (Select IDStr From fnSplitter_Str(@Styleno)) and B.OrdID = @OrdID 
							and B.compID  = @compID --And B.ClrCombID = @ClrCombID
							Group by  D.pcswgt,C.Loss_Per,B.WtUom
						end 
						
					OPEN PCS_Wgt;
					FETCH NEXT FROM PCS_Wgt
					INTO @pcswgt,@Per,@Qty;
 					WHILE @@FETCH_STATUS = 0
						BEGIN
							
							select @Wgt_tmp = ((@pcswgt / (100 - @Per) * 100) - @pcswgt);
							select @wgt = @wgt + @Wgt_tmp;
							
							FETCH NEXT FROM PCS_Wgt
							INTO @pcswgt,@Per,@Qty;
						END;
						CLOSE PCS_Wgt;
						DEALLOCATE PCS_Wgt;
					FETCH NEXT FROM Dept
					INTO @DeptName,@Sl;
				END;
				CLOSE Dept;
				DEALLOCATE Dept;
				insert into TmpProg (Styleno,Row, CompDescr, Head, Value,OrdID,Slno,Guid) 
				Values(@StyleNo1 ,@Row,@CompDescr,@Head,convert(decimal(10,5), @wgt),@OrdID,@CompGrdSlno,@GUID)

			select @wgt =0;
			/*Final Wgt*/
			select @Head = 'Final PCS Wgt';
			Select @Row = 9
			select @wgt =0;
			declare @wgt1 numeric(18,4),
					@wgt2 numeric(18,4),
					@ClrQty int,
					@ClrQty1 int,
					@Cwgt numeric(18,4) ,
					@CQty int ;
			select @wgt1 =0;
			select @wgt2 =0;
			select @wgt=0;
		select @ClrQty=0;
		select @ClrQty1=0;
			DECLARE Dept CURSOR FOR
				SELECT  distinct DeptName,Sl FROM Vue_OrderProcess 
				where Styleno In (Select IDStr From fnSplitter_Str(@Styleno)) and OrdID = @OrdID Order By sl desc
			OPEN Dept;
			FETCH NEXT FROM Dept
			INTO @DeptName,@Sl;
 			WHILE @@FETCH_STATUS = 0
				BEGIN
				--print ' - wgt- ';
				select @CQty=0;
				select @Cwgt=0;
				select @Count = 0;
				select @pcswgt_p=0;
				Print 'aslam sher' + Rtrim(@CompDescr)
				IF @EntryOption =1 or @OrderPartDtlCount =0
					Begin 
						DECLARE PCS_Wgt CURSOR FOR
						--CONVERT(decimal(10, 5),case when B.WtUom >0 then AVG(C.pcswgt)*B.WtUom else AVG(C.pcswgt/1000) end)
						SELECT  case when B.WtUom >0 then D.pcswgt*B.WtUom else D.pcswgt/1000 end as pcswgt
						, ISnull(C.Loss_Per,0) AS Per,Sum(OrderQty) as Qtytmp,Sum(OrderQty) as ClrQty1
						FROM Prog_ClrComb B	
						INNER JOIN Prog_Prsloss C	(nolock)	ON B.ID		= C.ID		--and ISnull(C.Loss_Per,0)>0
						INNER JOIN Prog_Cns		D	(nolock)	ON B.ID		= D.ID 
						INNER JOIN Mas_Dept		E	(nolock)	ON C.Prs	= E.DeptID  and		E.DeptName = @DeptName  
						and E.inputType in('Y','F') 
						INNER JOIN AssQty		F	(nolock)	ON F.OrdID	= B.OrdID	and		F.SizeId = D.SizID  
						and F.ColId =B.ClrCombID
						
						LEFT OUTER JOIN Mas_Dia K ON D.FDia = K.DiaID 
						
						INNER JOIN Mas_Component	P (nolock)	ON B.compID = P.CompID 
						
						LEFT OUTER JOIN Mas_Part X ON B.PartID = X.PartID
						 
						WHERE  B.Styleno In (Select IDStr From fnSplitter_Str(@Styleno)) 
						and B.OrdID = @OrdID and B.compID  = @compID and CompGrdSlno =@CompGrdSlno
						and Rtrim(P.CompDescr + '->'+IsNull(X.PartName,'')+'~' + IsNull(K.Dia,'')) = Rtrim(@CompDescr)
						--and b.clrCombid = @ClrCombID
						Group by  D.pcswgt,C.Loss_Per,B.WtUom,IsNull(K.Dia,''),IsNull(X.PartName,'')
					END
				ELSe
					Begin
						DECLARE PCS_Wgt CURSOR FOR
						--CONVERT(decimal(10, 5),case when B.WtUom >0 then AVG(C.pcswgt)*B.WtUom else AVG(C.pcswgt/1000) end)
						SELECT  case when B.WtUom >0 then D.pcswgt*B.WtUom else D.pcswgt/1000 end as pcswgt
						, ISnull(C.Loss_Per,0) AS Per,Sum(OrderQty) as Qtytmp,Sum(OrderQty) as ClrQty1
						FROM Prog_ClrComb B	
						INNER JOIN Prog_Prsloss C	(nolock)	ON B.ID		= C.ID		--and ISnull(C.Loss_Per,0)>0
						INNER JOIN Prog_Cns		D	(nolock)	ON B.ID		= D.ID 
						INNER JOIN Mas_Dept		E	(nolock)	ON C.Prs	= E.DeptID  and		E.DeptName = @DeptName  
						and E.inputType in('Y','F') 
						INNER JOIN AssQty_Multiple	F	(nolock)	ON F.OrdID	= B.OrdID	and		F.SizeId = D.SizID  
						and F.ColId =B.ClrCombID And F.PartID = IsNull(B.PartId,0)
						
						LEFT OUTER JOIN Mas_Dia K ON D.FDia = K.DiaID 
						
						INNER JOIN Mas_Component	P (nolock)	ON B.compID = P.CompID 
						
						LEFT OUTER JOIN Mas_Part X ON B.PartID = X.PartID
						 
						WHERE  B.Styleno In (Select IDStr From fnSplitter_Str(@Styleno)) 
						and B.OrdID = @OrdID and B.compID  = @compID and CompGrdSlno =@CompGrdSlno
						and Rtrim(P.CompDescr + '->'+IsNull(X.PartName,'')+'~' + IsNull(K.Dia,'')) = Rtrim(@CompDescr)
						--and b.clrCombid = @ClrCombID
						Group by  D.pcswgt,C.Loss_Per,B.WtUom,IsNull(K.Dia,''),IsNull(X.PartName,'')
					END 		
					OPEN PCS_Wgt;
					FETCH NEXT FROM PCS_Wgt
					INTO @pcswgt,@Per,@Qtytmp,@ClrQty1;
 					WHILE @@FETCH_STATUS = 0
						BEGIN
						print 'PWgt chk ->' + Rtrim(isnull(@ClrCombID,0))
						
						select @Count = @Count +1;
							if (@per<>0)
								begin
									Select @wgt2 = (@pcswgt / (100 - @per) * 100)
									--print 'Wgt' + Rtrim(@Wgt) + '' + Rtrim(@Wgt2)
									Select @wgt = @wgt + @wgt2
									Select @wgt1 = @wgt1 + (@wgt2 * @Qtytmp)
									select @CQty = @CQty + @ClrQty1; -- @Qtytmp;
								end
							else
								begin
									Select @pcswgt_p = @pcswgt_p + (@pcswgt*@Qtytmp);
									/*Select @wgt = @wgt + @pcswgt_p*/ --Aslam
							--		Select @wgt1 = @wgt1 + (@pcswgt * @Qtytmp)
									select @CQty =  @CQty + @ClrQty1; --@Qtytmp;
									--print 'aslam'
								end
								
							--	print 'PWgt' + rtrim(@pcswgt);
					
							FETCH NEXT FROM PCS_Wgt
							INTO @pcswgt,@Per,@Qtytmp,@ClrQty1;
						END;
						print 'asl  ' + rtrim(@Wgt)
						print 'Dept  ' + rtrim(@DeptName)
						print 'Dept Qty ' + rtrim(@CQty)
						if (@CQty>0)
							begin
								select @ClrQty=@CQty;
							end
						/*if (@pcswgt_p>0)
							begin
								select @wgt=@pcswgt;
							end*/
						--print 'Wgt ' +rtrim(@wgt);
						CLOSE PCS_Wgt;
						DEALLOCATE PCS_Wgt;
					--if (@wgt1 = 0) 
					--	begin		
					--	print ' E   Qty ' + rtrim(@ClrQty);
					--			DECLARE PCS_Wgt CURSOR FOR
					--				SELECT  D.pcswgt/1000 as pcswgt, ISnull(C.Loss_Per,0) AS Per,Sum(OrderQty) as Qtytmp
					--				FROM Prog_ClrComb B	
					--				INNER JOIN Prog_Prsloss C	(nolock)	ON B.ID		= C.ID		--and ISnull(C.Loss_Per,0)>0
					--				INNER JOIN Prog_Cns		D	(nolock)	ON B.ID		= D.ID 
					--				INNER JOIN Mas_Dept		E	(nolock)	ON C.Prs	= E.DeptID  and		E.DeptName = @DeptName  
					--				and E.inputType in('Y','F') 
					--				INNER JOIN AssQty		F	(nolock)	ON F.OrdID	= B.OrdID	and		F.SizeId = D.SizID  and F.ColId =B.ClrCombID
					--				WHERE B.Component_Block = 'N' and B.ClrCombID = @ClrCombID	and B.Styleno = @Styleno 
					--				and B.OrdID = @OrdID and B.compID  = @compID
					--				Group by  D.pcswgt,C.Loss_Per
					--			OPEN PCS_Wgt;
					--			FETCH NEXT FROM PCS_Wgt
					--			INTO @pcswgt,@Per,@Qtytmp;
 				--				WHILE @@FETCH_STATUS = 0
					--				BEGIN
					--				--if (@per<>0)
					--				--	begin
					--				--	 Select @wgt2 = (@pcswgt / (100 - @per) * 100)
					--				--	 Select @wgt = @wgt + @wgt2
					--				--	 Select @wgt1 = @wgt1 + (@wgt2 * @Qtytmp)
					--				--	 select @ClrQty= @ClrQty + @Qtytmp;
					--				--	end
															 
					--					FETCH NEXT FROM PCS_Wgt
					--					INTO @pcswgt,@Per,@Qtytmp;
					--				END;
					--				CLOSE PCS_Wgt;
					--				DEALLOCATE PCS_Wgt;
					--			FETCH NEXT FROM Dept
					--			INTO @DeptName,@Sl;
					--end
						--select @wgt1 =@wgt1 / @Count;
						
					FETCH NEXT FROM Dept
					INTO @DeptName,@Sl;
				END;
				CLOSE Dept;
				DEALLOCATE Dept;
				Print 'Asl Count ->'+Rtrim(@Count)
				Print 'as 125 ->'+ Rtrim(@Wgt)
		if (@wgt1=0)
			begin
				print @pcswgt_p;
				select @wgt1=@pcswgt_p;
			end
		if (@Wgt=0)
		Begin
			Select @Wgt=@pcswgt;
		End 
		if (@Count >=1) 
			begin
			Print 'as<->'+ Rtrim(@Wgt)
				select @wgt =@wgt / @Count;
				--select @wgt1 =@wgt1 / @Count;
			end
				Print 'as->'+ Rtrim(@Wgt)
				insert into TmpProg (Styleno,Row, CompDescr, Head, Value,OrdID,Slno,Guid) 
				Values(@StyleNo1 ,10,@CompDescr,'Final PCS Wgt',convert(decimal(10,5), @wgt),@OrdID,@CompGrdSlno,@GUID)
				
				insert into TmpProg (Styleno,Row, CompDescr, Head, Value,OrdID,Slno,GUID) 
				Values(@StyleNo1 ,11,@CompDescr,'Quantity(Pcs)',@ClrQty,@OrdID,@CompGrdSlno,@GUID)
				
				insert into TmpProg (Styleno,Row, CompDescr, Head, Value,OrdID,Slno,Guid) 
				Values(@StyleNo1 ,12,@CompDescr,'Fabric Wtg Kgs',convert(decimal(10,3), @wgt1),@OrdID,@CompGrdSlno,@GUID)

                insert into TmpProg (Styleno,Row, CompDescr, Head, Value,OrdID,Slno,Guid) 
                Values(@StyleNo1 ,13,@CompDescr,'','',@OrdID,@CompGrdSlno,@GUID)
                
                insert into TmpProg (Styleno,Row, CompDescr, Head, Value,OrdID,Slno,Guid) 
                Values(@StyleNo1 ,14,@CompDescr,'Yarn Dyeing','',@OrdID,@CompGrdSlno,@GUID)
                              
                insert into TmpProg (Styleno,Row, CompDescr, Head, Value,OrdID,Slno,Guid) 
                Values(@StyleNo1 ,100,@CompDescr,'','',@OrdID,@CompGrdSlno,@GUID)

                insert into TmpProg (Styleno,Row, CompDescr, Head, Value,OrdID,Slno,Guid) 
                Values(@StyleNo1 ,101,@CompDescr,'Fabric Dyeing','',@OrdID,@CompGrdSlno,@GUID)
                
			FETCH NEXT FROM ClrComb
			INTO @StyleNo1,@CompDescr,@compID,@CompGrdSlno; --,@ClrCombID
			
			 --select @wgt1=0;
			--select @wgt=0;
		END;
		CLOSE ClrComb;
		DEALLOCATE ClrComb;
		
		/*Quantity 
	    Select @Head = 'Quantity';
	    Select @Row = 10;
	     ;with   cte(ClrCombID,Styleno,CompDescr,compID,Slno) as  
        (
        SELECT A.ClrCombID,A.Styleno,B.CompDescr,A.compID,A.CompGrdSlno
        FROM Prog_ClrComb A
        INNER JOIN Mas_Component B (nolock) ON A.compID = B.CompID  
        WHERE A.Styleno = @StyleNo and  A.OrdID = @OrdID 
        GROUP BY A.ClrCombID,A.Styleno,B.CompDescr,A.compID,A.CompGrdSlno 
        )
        
        
        insert into TmpProg (Styleno,Row, CompDescr, Head, Value,OrdID,Slno,GUID) 
        Select @Styleno,@row,B.CompDescr,@Head,@OrderQty,@Ordid,B.Slno,@GuID
        from AssQty A
        inner join cte B on A.Styleno = B.Styleno  and A.ordid = @OrdID and A.Colid  = B.ClrCombID
        group by B.CompDescr,B.Slno

*/

		/* Yarn Dyeing */
		
		
		DECLARE YClr CURSOR FOR
			select A.Yclr, B.ColorDesc 
			From Prog_Ycns			A	(nolock)
			INNER JOIN Mas_Color	B	(nolock)	ON A.Yclr	= B.ColID       
			INNER JOIN Prog_ClrComb	C	(nolock)	ON A.ID		= C.ID  
			INNER JOIN Prog_Prsloss D	(nolock)	ON A.ID		= D.ID 
			--(Upper(fabtoyarn) = 'NO' or fabtoyarn = '' and Upper(fabtoyarn) = 'NO' )and --by asl 01-feb-2014
			WHERE C.Styleno In (Select IDStr From fnSplitter_Str(@Styleno)) and C.OrdID = @OrdID  
			and C.yd=1 and D.prs =2 --and A.ProcType = 'Proc.' ' By dharani  on 22-Feb-2014 prs=2 comment removed since Process loss doesnt have YDyeing  but Yd checkbox selected
			Group by A.Yclr, B.ColorDesc
		OPEN YClr;
		FETCH NEXT FROM YClr
		INTO @Yclr,@ColorDesc
		WHILE @@FETCH_STATUS = 0
			BEGIN
				Select @Row = Max(Row)+1 from TmpProg where Guid = @Guid and row < 100 ;
				Select @Head = @ColorDesc;
				DECLARE ClrComb CURSOR FOR
					SELECT A.ClrCombID,C.CompDescr + '->' + IsNull(E.PartName,'') + '~'+ IsNull(K.Dia,'') ,A.compID, A.CompGrdSlno as CompGrdSlno
					FROM Prog_ClrComb			A	(nolock)
					INNER JOIN Prog_Ycns		B	(nolock)	ON B.ID		= A.ID  
					INNER JOIN Mas_Component	C	(nolock)	ON A.compID = C.CompID  
					INNER JOIN Prog_Prsloss		D	(nolock)	ON B.ID		= D.ID 
					
					LEFT OUTER JOIN Prog_Cns		P	ON A.ID	= P.ID 
					LEFT OUTER JOIN Mas_Dia		K	ON P.Fdia = K.DiaID 
		            LEFT OUTER JOIN Mas_Part E ON A.PartID = E.PartID
					--(Upper(B.fabtoyarn) = 'NO' or fabtoyarn = '' )and by asl 01-feb-2014
					WHERE B.Yclr =@Yclr 
					and A.yd=1 and D.prs =2 --and B.ProcType = 'Proc.' ' By dharani  on 22-Feb-2014  prs=2 comment removed since Process loss doesnt have YDyeing  but Yd checkbox selected
					and A.Styleno In (Select IDStr From fnSplitter_Str(@Styleno)) and A.OrdID = @OrdID 
					GROUP BY A.ClrCombID,C.CompDescr,A.compID, IsNull(K.Dia,''),IsNull(E.PartName,'') ,A.CompGrdSlno  
				OPEN ClrComb;
				FETCH NEXT FROM ClrComb
				INTO @ClrCombID,@CompDescr,@CompID,@CompGrdSlno
				WHILE @@FETCH_STATUS = 0
					BEGIN
					print '--';
					print @ColorDesc;
					print @CompDescr;
						Select @wgt = 0;
						Select @wgt1 = 0;
						DECLARE Dept CURSOR FOR
							SELECT Distinct DeptName ,Sl 
							FROM Vue_OrderProcess 
							where ClrCombID = @ClrCombID and Styleno In (Select IDStr From fnSplitter_Str(@Styleno))  and OrdID = @OrdID and compID  = @compID 
							Order By sl desc
						OPEN Dept;
						FETCH NEXT FROM Dept
						INTO @DeptName ,@Sl;
						WHILE @@FETCH_STATUS = 0
							BEGIN
								if @EntryOption=1 OR @OrderPartDtlCount = 0 
									Begin 
										DECLARE PCSwgt CURSOR FOR
										SELECT distinct isnull(((C.pcswgt/100)*D.ConsPer/1000),4) as pcswgt, 
										ISnull(B.Loss_Per,0) AS per,Sum(Orderqty) as Qty 
										FROM Prog_ClrComb		A	(nolock)
										INNER JOIN Prog_Prsloss B	(nolock)	ON A.ID = B.ID 
										INNER JOIN Prog_Cns		C	(nolock)	ON A.ID = C.ID 
										INNER JOIN Prog_Ycns	D	(nolock)	ON A.ID = D.ID 
										INNER JOIN Mas_Dept		E	(nolock)	ON B.Prs = E.DeptID 
										INNER JOIN AssQty		F	(nolock)	ON F.OrdID = A.OrdID and F.SizeId = C.SizID   
										and F.ColId =A.ClrCombID
										and F.ColId =A.ClrCombID 
										INNER JOIN Mas_Component P ON A.CompID = P.CompID
										LEFT OUTER JOIN Mas_Dia K ON C.FDia = K.DiaID
										LEFT OUTER JOIN Mas_Part X ON A.PartID = X.PartID
										WHERE ISnull(B.Loss_Per,0)>0 and A.Component_Block = 'N' and 
										(Upper(fabtoyarn) = 'NO' or fabtoyarn = '')  --and A.yd=1
										and E.DeptName =  @DeptName and A.ClrCombID = @ClrCombID and A.CompGrdSlno=@CompGrdSlno
										and A.Styleno In (Select IDStr From fnSplitter_Str(@Styleno)) and E.inputType  in('Y','F')  
										and D.YClr  =@Yclr and A.OrdID = @OrdID
										and A.compID  = @compID 
										and RTrim(CompDescr +'->'+IsNull(X.PartName,'')+ '~' + IsNull(K.Dia,'')) = @compDescr
										
										Group by C.pcswgt,B.Loss_Per,D.ConsPer,IsNull(K.Dia,'')
									END
								ELSE
									Begin
										DECLARE PCSwgt CURSOR FOR
										SELECT distinct isnull(((C.pcswgt/100)*D.ConsPer/1000),4) as pcswgt, 
										ISnull(B.Loss_Per,0) AS per,Sum(Orderqty) as Qty 
										FROM Prog_ClrComb		A	(nolock)
										INNER JOIN Prog_Prsloss B	(nolock)	ON A.ID = B.ID 
										INNER JOIN Prog_Cns		C	(nolock)	ON A.ID = C.ID 
										INNER JOIN Prog_Ycns	D	(nolock)	ON A.ID = D.ID 
										INNER JOIN Mas_Dept		E	(nolock)	ON B.Prs = E.DeptID 
										INNER JOIN AssQty_Multiple	F	(nolock)	ON F.OrdID = A.OrdID and F.SizeId = C.SizID   
										and F.ColId =A.ClrCombID
										and F.ColId =A.ClrCombID ANd F.PartID = IsNull(A.Partid,0)
										INNER JOIN Mas_Component P ON A.CompID = P.CompID
										LEFT OUTER JOIN Mas_Dia K ON C.FDia = K.DiaID
										LEFT OUTER JOIN Mas_Part X ON A.PartID = X.PartID
										WHERE ISnull(B.Loss_Per,0)>0 and A.Component_Block = 'N' and 
										(Upper(fabtoyarn) = 'NO' or fabtoyarn = '')  --and A.yd=1
										and E.DeptName =  @DeptName and A.ClrCombID = @ClrCombID and A.CompGrdSlno=@CompGrdSlno
										and A.Styleno In (Select IDStr From fnSplitter_Str(@Styleno)) and E.inputType  in('Y','F')  
										and D.YClr  =@Yclr and A.OrdID = @OrdID
										and A.compID  = @compID 
										and RTrim(CompDescr +'->'+IsNull(X.PartName,'')+ '~' + IsNull(K.Dia,'')) = @compDescr
										
										Group by C.pcswgt,B.Loss_Per,D.ConsPer,IsNull(K.Dia,'')
									
									End 
									
								OPEN PCSwgt;
								FETCH NEXT FROM PCSwgt
								INTO @pcswgt,@Per,@Qty;
								WHILE @@FETCH_STATUS = 0
									BEGIN
								
											Select @wgt2 = convert(decimal(10,5),(@pcswgt / (100 - @per) * 100));
											Select @wgt = @wgt + @wgt2;
											Select @wgt1 = @wgt1 + (@wgt2 * @Qty);
										
										FETCH NEXT FROM PCSwgt
										INTO @pcswgt,@Per,@Qty;
									END;
									CLOSE PCSwgt;
									DEALLOCATE PCSwgt;
							if (@wgt1 =0)
							begin
								if @EntryOption =1 OR @OrderPartDtlCount = 0 
									Begin
										DECLARE PCSwgt CURSOR FOR
										SELECT distinct isnull(((C.pcswgt/100)*D.ConsPer/1000),5) as pcswgt, 
										ISnull(B.Loss_Per,0) AS per,Sum(Orderqty) as Qty 
										FROM Prog_ClrComb		A	(nolock)
										INNER JOIN Prog_Prsloss B	(nolock)	ON A.ID = B.ID 
										INNER JOIN Prog_Cns		C	(nolock)	ON A.ID = C.ID 
										INNER JOIN Prog_Ycns	D	(nolock)	ON A.ID = D.ID 
										INNER JOIN Mas_Dept		E	(nolock)	ON B.Prs = E.DeptID 
										INNER JOIN AssQty		F	(nolock)	ON F.OrdID = A.OrdID and F.SizeId = C.SizID 
										and F.ColId =A.ClrCombID 
										INNER JOIN Mas_Component P ON A.CompID = P.CompID
										LEFT OUTER JOIN Mas_Dia K ON C.FDia = K.DiaID
										LEFT OUTER JOIN Mas_Part X ON A.PartID = X.PartID
										--and (Upper(fabtoyarn) = 'NO' or fabtoyarn = '') by asl 01-feb-2014
										WHERE A.Component_Block = 'N' and A.yd=1
										and E.DeptName =  @DeptName and A.ClrCombID = @ClrCombID and A.CompGrdSlno=@CompGrdSlno
										and A.Styleno In (Select IDStr From fnSplitter_Str(@Styleno)) and E.inputType  in('Y','F')  
										and D.YClr  =@Yclr and A.OrdID = @OrdID
										and A.compID  = @compID
										and RTrim(CompDescr +'->' + IsNull(X.PartName,'') + '~' + IsNull(K.Dia,'')) = @compDescr
										GROUP BY C.pcswgt,B.Loss_Per,D.ConsPer,IsNull(K.Dia,''),IsNull(X.PartName,'')
									END
								Else
									Begin
										DECLARE PCSwgt CURSOR FOR
										SELECT distinct isnull(((C.pcswgt/100)*D.ConsPer/1000),5) as pcswgt, 
										ISnull(B.Loss_Per,0) AS per,Sum(Orderqty) as Qty 
										FROM Prog_ClrComb		A	(nolock)
										INNER JOIN Prog_Prsloss B	(nolock)	ON A.ID = B.ID 
										INNER JOIN Prog_Cns		C	(nolock)	ON A.ID = C.ID 
										INNER JOIN Prog_Ycns	D	(nolock)	ON A.ID = D.ID 
										INNER JOIN Mas_Dept		E	(nolock)	ON B.Prs = E.DeptID 
										INNER JOIN AssQty_Multiple		F	(nolock)	ON F.OrdID = A.OrdID and F.SizeId = C.SizID 
										and F.ColId =A.ClrCombID and F.PartID = IsNull(A.PartId,0)
										INNER JOIN Mas_Component P ON A.CompID = P.CompID
										LEFT OUTER JOIN Mas_Dia K ON C.FDia = K.DiaID
										LEFT OUTER JOIN Mas_Part X ON A.PartID = X.PartID
										--and (Upper(fabtoyarn) = 'NO' or fabtoyarn = '') by asl 01-feb-2014
										WHERE A.Component_Block = 'N' and A.yd=1
										and E.DeptName =  @DeptName and A.ClrCombID = @ClrCombID and A.CompGrdSlno=@CompGrdSlno
										and A.Styleno In (Select IDStr From fnSplitter_Str(@Styleno)) and E.inputType  in('Y','F')  
										and D.YClr  =@Yclr and A.OrdID = @OrdID
										and A.compID  = @compID
										and RTrim(CompDescr +'->' + IsNull(X.PartName,'') + '~' + IsNull(K.Dia,'')) = @compDescr
										GROUP BY C.pcswgt,B.Loss_Per,D.ConsPer,IsNull(K.Dia,''),IsNull(X.PartName,'')
									End 
								OPEN PCSwgt;
								FETCH NEXT FROM PCSwgt
								INTO @pcswgt,@Per,@Qty;
								WHILE @@FETCH_STATUS = 0
									BEGIN
											Select @wgt2 = convert(decimal(10,4),(@pcswgt / (100 - @per) * 100));
											Select @wgt = @wgt + @wgt2;
											Select @wgt1 = @wgt1 + (@wgt2 * @Qty);
										FETCH NEXT FROM PCSwgt
										INTO @pcswgt,@Per,@Qty;
									END;
									CLOSE PCSwgt;
									DEALLOCATE PCSwgt;
							end;

								FETCH NEXT FROM Dept
								INTO @DeptName ,@Sl;
							END;
							CLOSE Dept;
							DEALLOCATE Dept;
							
							  insert into TmpProg (Styleno,Row, CompDescr, Head, Value,OrdID,Slno,Guid) 
							  Values(@StyleNo1,@Row,@CompDescr,@Head,convert(decimal(10,3),@wgt1),@OrdID,@CompGrdSlno,@GUID)
											
					FETCH NEXT FROM ClrComb
					INTO @ClrCombID,@CompDescr,@CompID,@CompGrdSlno
				END;
				CLOSE ClrComb;
				DEALLOCATE ClrComb;
			FETCH NEXT FROM YClr
			INTO @Yclr,@ColorDesc
		END;
		CLOSE YClr;
		DEALLOCATE YClr;
		  Select @Row = Max(Row)+1 from TmpProg where Guid = @Guid;
		  update TmpProg set row=@Row where Guid = @Guid and row =100;
		  update TmpProg set row=@Row+1 where Guid = @Guid and row =101;
		  
		  select @wgt1=0;
		  select @wgt=0;
		  
		/* Farbic Dyeing */
		
		DECLARE FClr CURSOR FOR
				/*select C.ColorDesc, A.ColID  as Fclr
			From pro_Reqknitt			A	(nolock)
			INNER JOIN Prog_ClrComb		B	(nolock)	ON  rtrim(B.Styleno) = rtrim(A.Styleno) and A.ColID= B.FinCol  
			INNER JOIN Mas_Color		C	(nolock)	ON	A.ColID= C.ColID 
			WHERE A.Styleno = @Styleno  and A.OrdID = @OrdID 
			and deptid in (select Deptid from mas_Dept where deptid=8 or deptgrpcode =8) 
			group by C.ColorDesc,A.ColID */
			/*Above Qry commented by dharani on 04-Apr-2014- For SRG 763/13-Combined color in FabToYarn Not taken in above qry */
			select C.ColorDesc, B.FinCol  as Fclr from  Prog_ClrComb	B	
            INNER JOIN Mas_Color		C	(nolock)	ON	B.FinCol = C.ColID 
			INNER JOIN Prog_Prsloss		D	(nolock)	ON B.ID = D.ID 
			INNER JOIN Prog_Cns H ON B.ID = H.ID 
			INNER JOIN Mas_Dia K ON H.FDia = K.DiaID 
			INNER JOIN Mas_Component	P (nolock)	ON B.compID = P.CompID 
						
			WHERE B.Styleno In (Select IDStr From fnSplitter_Str(@Styleno))  and B.OrdID = @OrdID 
			and Prs in (select Deptid from mas_Dept where deptid=8 or deptgrpcode =8) 
		
			group by C.ColorDesc,B.FinCol 

		OPEN FClr;
		FETCH NEXT FROM FClr
		INTO @ColorDesc,@Fclr;
		WHILE @@FETCH_STATUS = 0
			BEGIN
				Select @Row = Max(Row)+1 from TmpProg where Guid = @Guid;
				Select @Head = @ColorDesc;
				DECLARE ClrComb CURSOR FOR
				
					SELECT A.ClrCombID,B.CompDescr +'->'+IsNull(E.PartName,'') +'~' + IsNull(K.Dia,''),A.compID, A.CompGrdSlno as CompGrdSlno
					FROM Prog_ClrComb			A	(nolock)
					INNER JOIN Mas_Component	B	(nolock)	ON A.compID = B.CompID  
					INNER JOIN Prog_Prsloss		C	(nolock)	ON A.ID = C.ID 
					
					LEFT OUTER JOIN Prog_Cns H ON A.ID = H.ID 
			LEFT OUTER JOIN Mas_Dia K ON H.FDia = K.DiaID 
			INNER JOIN Mas_Component	P (nolock)	ON A.compID = P.CompID 
			LEFT OUTER JOIN Mas_Part E ON A.PartID = E.PartID
			
					WHERE C.prs in(select Deptid from mas_Dept where deptid=8 or deptgrpcode =8) 
					and   A.FinCol  = @Fclr and A.Styleno In (Select IDStr From fnSplitter_Str(@Styleno)) and A.OrdID = @OrdID
					GROUP BY A.ClrCombID,B.CompDescr,A.compID, IsNull(K.Dia,''),IsNull(E.PartName,'') ,A.CompGrdSlno 
					
				OPEN ClrComb;
				FETCH NEXT FROM ClrComb
				INTO @ClrCombID,@CompDescr,@CompID,@CompGrdSlno
				WHILE @@FETCH_STATUS = 0
					BEGIN
						DECLARE Dept CURSOR FOR
							SELECT Distinct DeptName ,Sl 
							FROM Vue_OrderProcess 
							where ClrCombID = @ClrCombID and Styleno In (Select IDStr From fnSplitter_Str(@Styleno))  and OrdID = @OrdID 
							and compID  = @compID Order By sl desc
						OPEN Dept;
						FETCH NEXT FROM Dept
						INTO @DeptName ,@Sl;
						WHILE @@FETCH_STATUS = 0
							BEGIN
								if @EntryOption = 1  OR @OrderPartDtlCount = 0
									Begin 
									
										DECLARE PCSwgt CURSOR FOR
										SELECT distinct case when A.WtUom >0 then c.pcswgt*A.WtUom else c.pcswgt/1000 end as pcswgt, 
										ISnull(B.Loss_Per,0) AS Per,Sum(Orderqty) as Qty 
										FROM Prog_ClrComb			A	(nolock)
										INNER JOIN Prog_Prsloss		B	(nolock)	ON A.ID = B.ID 
										INNER JOIN Prog_Cns			C	(nolock)	ON A.ID = C.ID 
										INNER JOIN Mas_Dept			D	(nolock)	ON B.Prs = D.DeptID 
										INNER JOIN AssQty			E	(nolock)	ON E.OrdID = A.OrdID 
										and E.SizeId = C.SizID and E.ColId =A.ClrCombID 
										
										INNER JOIN Mas_Component P ON A.CompID = P.CompID
										LEFT OUTER JOIN Mas_Dia K ON C.FDia = K.DiaID
										LEFT OUTER JOIN Mas_Part X ON A.PartID = X.PartID
										
										WHERE ISnull(B.Loss_Per,0)>0 and  A.Component_Block = 'N' 
										and A.FinCol  = @Fclr  and D.DeptName =  @DeptName 
										and A.ClrCombID = @ClrCombID and A.Styleno In (Select IDStr From fnSplitter_Str(@Styleno)) 
										and D.inputType in('Y','F') and A.OrdID = @OrdID   and A.compID  = @compID 
										and RTrim(CompDescr +'->' + IsNull(X.PartName,'') + '~' + IsNull(K.Dia,'')) = @compDescr
										group by  C.pcswgt,B.Loss_Per,A.WtUom,IsNull(K.Dia,''),IsNull(X.PartName,'')
									End
								Else
									Begin
										DECLARE PCSwgt CURSOR FOR
										SELECT distinct case when A.WtUom >0 then c.pcswgt*A.WtUom else c.pcswgt/1000 end as pcswgt, 
										ISnull(B.Loss_Per,0) AS Per,Sum(Orderqty) as Qty 
										FROM Prog_ClrComb			A	(nolock)
										INNER JOIN Prog_Prsloss		B	(nolock)	ON A.ID = B.ID 
										INNER JOIN Prog_Cns			C	(nolock)	ON A.ID = C.ID 
										INNER JOIN Mas_Dept			D	(nolock)	ON B.Prs = D.DeptID 
										INNER JOIN AssQty_Multiple		E	(nolock)	ON E.OrdID = A.OrdID 
										and E.SizeId = C.SizID and E.ColId =A.ClrCombID And E.PartID = IsNull(A.PartID,0)
										
										INNER JOIN Mas_Component P ON A.CompID = P.CompID
										LEFT OUTER JOIN Mas_Dia K ON C.FDia = K.DiaID
										LEFT OUTER JOIN Mas_Part X ON A.PartID = X.PartID
										
										WHERE ISnull(B.Loss_Per,0)>0 and  A.Component_Block = 'N' 
										and A.FinCol  = @Fclr  and D.DeptName =  @DeptName 
										and A.ClrCombID = @ClrCombID and A.Styleno In (Select IDStr From fnSplitter_Str(@Styleno)) 
										and D.inputType in('Y','F') and A.OrdID = @OrdID   and A.compID  = @compID 
										and RTrim(CompDescr +'->' + IsNull(X.PartName,'') + '~' + IsNull(K.Dia,'')) = @compDescr
										group by  C.pcswgt,B.Loss_Per,A.WtUom,IsNull(K.Dia,''),IsNull(X.PartName,'')
									End 
								OPEN PCSwgt;
								FETCH NEXT FROM PCSwgt
								INTO @pcswgt,@Per,@Qty;
								WHILE @@FETCH_STATUS = 0
									BEGIN
											Select @wgt2 = convert(decimal(10,4),(@pcswgt / (100 - @per) * 100));
											Select @wgt = @wgt + @wgt2;
											Select @wgt1 = @wgt1 + (@wgt2 * @Qty);
										FETCH NEXT FROM PCSwgt
										INTO @pcswgt,@Per,@Qty;
									END;
									CLOSE PCSwgt;
									DEALLOCATE PCSwgt;
							if (@wgt1 =0)
							begin
								if @EntryOption = 1 OR @OrderPartDtlCount = 0
									Begin
										DECLARE PCSwgt CURSOR FOR
										--SELECT distinct C.pcswgt/1000 as pcswgt
										SELECT distinct case when A.WtUom >0 then c.pcswgt*A.WtUom else c.pcswgt/1000 end as pcswgt 
										, ISnull(B.Loss_Per,0) AS Per,Sum(Orderqty) as Qty 
										FROM Prog_ClrComb			A	(nolock)
										INNER JOIN Prog_Prsloss		B	(nolock)	ON A.ID = B.ID 
										INNER JOIN Prog_Cns			C	(nolock)	ON A.ID = C.ID 
										INNER JOIN Mas_Dept			D	(nolock)	ON B.Prs = D.DeptID 
										INNER JOIN AssQty			E	(nolock)	ON E.OrdID = A.OrdID 
										and E.SizeId = C.SizID and E.ColId =A.ClrCombID
										
										INNER JOIN Mas_Component P ON A.CompID = P.CompID
										LEFT OUTER JOIN Mas_Dia K ON C.FDia = K.DiaID
										LEFT OUTER JOIN Mas_Part X ON A.PartID = X.PartID
										
										WHERE  A.Component_Block = 'N' and A.FinCol  = @Fclr
										and D.DeptName =  @DeptName and A.ClrCombID = @ClrCombID
										and A.Styleno In (Select IDStr From fnSplitter_Str(@Styleno))  and D.inputType in('Y','F') 
										and A.OrdID = @OrdID 
										and A.compID  = @compID 
										and RTrim(CompDescr +'->'+IsNull(X.PartName,'')+ '~' + IsNull(K.Dia,'')) = @compDescr
										group by  C.pcswgt,B.Loss_Per,A.WtUom ,IsNull(K.Dia,''),IsNull(X.PartName,'')
									End
								Else
									Begin
										DECLARE PCSwgt CURSOR FOR
										--SELECT distinct C.pcswgt/1000 as pcswgt
										SELECT distinct case when A.WtUom >0 then c.pcswgt*A.WtUom else c.pcswgt/1000 end as pcswgt 
										, ISnull(B.Loss_Per,0) AS Per,Sum(Orderqty) as Qty 
										FROM Prog_ClrComb			A	(nolock)
										INNER JOIN Prog_Prsloss		B	(nolock)	ON A.ID = B.ID 
										INNER JOIN Prog_Cns			C	(nolock)	ON A.ID = C.ID 
										INNER JOIN Mas_Dept			D	(nolock)	ON B.Prs = D.DeptID 
										INNER JOIN AssQty_Multiple			E	(nolock)	ON E.OrdID = A.OrdID 
										and E.SizeId = C.SizID and E.ColId =A.ClrCombID and E.PartID = IsNull(A.PartId,0)
										
										INNER JOIN Mas_Component P ON A.CompID = P.CompID
										LEFT OUTER JOIN Mas_Dia K ON C.FDia = K.DiaID
										LEFT OUTER JOIN Mas_Part X ON A.PartID = X.PartID
										
										WHERE  A.Component_Block = 'N' and A.FinCol  = @Fclr
										and D.DeptName =  @DeptName and A.ClrCombID = @ClrCombID
										and A.Styleno In (Select IDStr From fnSplitter_Str(@Styleno))  and D.inputType in('Y','F') 
										and A.OrdID = @OrdID 
										and A.compID  = @compID 
										and RTrim(CompDescr +'->'+IsNull(X.PartName,'')+ '~' + IsNull(K.Dia,'')) = @compDescr
										group by  C.pcswgt,B.Loss_Per,A.WtUom ,IsNull(K.Dia,''),IsNull(X.PartName,'')
									End 
							
								OPEN PCSwgt;
								FETCH NEXT FROM PCSwgt
								INTO @pcswgt,@Per,@Qty;
								WHILE @@FETCH_STATUS = 0
									BEGIN
											Select @wgt2 = convert(decimal(10,4),(@pcswgt / (100 - @per) * 100));
											Select @wgt = @wgt + @wgt2;
											Select @wgt1 = @wgt1 + (@wgt2 * @Qty);
										FETCH NEXT FROM PCSwgt
										INTO @pcswgt,@Per,@Qty;
									END;
									CLOSE PCSwgt;
									DEALLOCATE PCSwgt;
							                      
							end;
								FETCH NEXT FROM Dept
								INTO @DeptName ,@Sl;
							END;
							CLOSE Dept;
							DEALLOCATE Dept;
							
							  insert into TmpProg (Styleno,Row, CompDescr, Head, Value,OrdID,Slno,Guid) 
							  Values(@StyleNo1,@Row,@CompDescr,@Head,convert(decimal(10,3),@wgt1),@OrdID,@CompGrdSlno,@GUID)
							  
							  	Select @wgt = 0;
								Select @wgt1 = 0;
											
					FETCH NEXT FROM ClrComb
					INTO @ClrCombID,@CompDescr,@CompID,@CompGrdSlno
				END;
				CLOSE ClrComb;
				DEALLOCATE ClrComb;
			FETCH NEXT FROM FClr
			INTO @ColorDesc,@Fclr;
		END;
		CLOSE FClr;
		DEALLOCATE FClr;
                   
                  


Set Nocount off	
end --B0