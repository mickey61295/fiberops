

/*;=============================================   

; Author           :  Global Software's    

; Create date      :  28/12/2023 

; Create By        :  ASLAM  

; Description      :  QUERY

; Change Person    :  ASLAM

; Last Change Date :  15/04/2024 10.25 AM 

; =============================================  */  

CREATE PROCEDURE SP_OnePageRpt (@Ordid Int,@IPAddress Varchar(100))

AS

BEGIN


/*
DELETE FROM BI_STKREPORTS;

DELETE FROM BI_GrpStockinfo; 

DELETE FROM BI_ACCSTOCK;

DELETE FROM BI_PCEREG;
*/


DECLARE @IDs VARCHAR(500);

DECLARE @Number VARCHAR(500);

DECLARE @charSpliter CHAR;

DECLARE @SLNO INT

DECLARE @Coycode int,@OrderStatus INT,@OrderType Varchar(10)

DECLARE @GRPID INT



SELECT @Coycode = ExpID FROM ORDERMAS WHERE ORDID = @Ordid

SELECT @OrderStatus = COMPLETED FROM ORDERMAS WHERE ORDID = @Ordid

SELECT @OrderType = OrderType FROM ORDERMAS WHERE ORDID = @Ordid



CREATE TABLE #DT_StkRptGrp (Slno int,GrpID int, Formula1 VARCHAR(max))

CREATE TABLE #DT_Temp (DeptID int,Slno int)



/* List All Data From StockGrp Config Related 'YARN' AND INSERT IN #DT_StkRptGrp  */



INSERT INTO #DT_StkRptGrp SELECT Row_Number() OVER (ORDER BY id) AS SLno,ID,Formula1 from Mas_StockReportGroup WHERE Y_F_A_P ='Y' 



DECLARE @Item_Counter_StkGrp INT,@MaxSlNoId_StkGrp int

SELECT @Item_Counter_StkGrp = min(Slno) , @MaxSlNoId_StkGrp = max(Slno) FROM #DT_StkRptGrp



DECLARE @Item_Counter_1 INT,@MaxSlNoId_1 int

DECLARE @DEPTID INT



WHILE(@Item_Counter_StkGrp IS NOT NULL AND @Item_Counter_StkGrp <= @MaxSlNoId_StkGrp)

	BEGIN

		DELETE FROM #DT_Temp 

		SET @charSpliter = ',';

		SELECT @IDs = Formula1 from #DT_StkRptGrp WHERE Slno = @Item_Counter_StkGrp 

		SELECT @GRPID = GRPID  FROM #DT_StkRptGrp WHERE Slno = @Item_Counter_StkGrp 

		SELECT @IDs = @IDs +  @charSpliter

		SET @SLNO =1

		WHILE CHARINDEX(@charSpliter, @IDs) > 0

		BEGIN

			SET @Number = SUBSTRING(@IDs, 0, CHARINDEX(@charSpliter, @IDs));

			SET @IDs = SUBSTRING(@IDs, CHARINDEX(@charSpliter, @IDs) + 1, LEN(@IDs));



		INSERT INTO #DT_Temp VALUES (@Number , @SLNO)

		   SET @SLNO = @SLNO +1 



		END;

	

		SELECT * FROM #DT_Temp

		

		

		SELECT @Item_Counter_1 = min(Slno) , @MaxSlNoId_1 = max(Slno) FROM #DT_Temp

		WHILE(@Item_Counter_1 IS NOT NULL AND @Item_Counter_1 <= @MaxSlNoId_1)

		BEGIN

			SELECT @DEPTID = DEPTID FROM #DT_Temp WHERE Slno = @Item_Counter_1

			 

			EXEC Sp_BIStockRpt 'Y', @OrderType,@OrderStatus,@Coycode ,@DEPTID,@IPADDRESS,@Ordid,@GRPID

			

			Update tmp set tmp.rate = isnull(st.Cumbillrate,0)  from BI_STKREPORTS  tmp inner join StockRAtePost st (nolock) 

			on tmp.ordid=st.ordid  and tmp.deptid=st.deptid  and  isnull(tmp.cntid,0)=isnull(st.cntid,0)  and  isnull(tmp.fabid,0)=isnull				(st.fabid,0)  and  isnull(tmp.colid,0)=isnull(st.colid,0) and	 isnull(tmp.designid,0) = 	ISNULL(st.designid,0) where(isnull
				(st.Cumbillrate, 0) <> 0) AND IPAddress =@IpADdress 



			Update tmp set tmp.rate = st.budrate from BI_STKREPORTS  tmp inner join StockRAtePost st (nolock)  on tmp.ordid=st.ordid 

			and tmp.deptid=st.deptid   and  isnull(tmp.cntid,0)=isnull(st.cntid,0) and  isnull(tmp.fabid,0)=isnull(st.fabid,0)  and  isnull				(tmp.colid,0)=isnull(st.colid,0)  and	 isnull(tmp.designid,0) = 	ISNULL(st.designid,0)  where(isnull(st.Cumbillrate, 0) =
 0)				And IPAddress =@IPAddress



			Update tmp set tmp.rate = st.budrate from BI_STKREPORTS  tmp inner join StockRAtePost st (nolock) on tmp.ordid=st.ordid 

			and tmp.deptid=st.deptid  and  isnull(tmp.cntid,0)=isnull(st.cntid,0) and  isnull(tmp.fabid,0)=isnull(st.fabid,0) 

			and  isnull(tmp.colid,0)=isnull(st.colid,0)  and	 isnull(tmp.designid,0) = 	ISNULL(st.designid,0) where tmp.Deptid In					(3,15,4,8)  And IPAddress = @IPAddress 



			Update tmp set tmp.rate =isnull(st.Cumbillrate,0) from BI_STKREPORTS  tmp INNER JOIN StockTable ON Tmp.Stockid =							StockTable.StockID AND TMP.Deptid = StockTable.Dept  INNER JOIN StockTable as ST1 on StockTable.FrmStockID = st1.StockID inner				join StockRAtePost st (nolock)  on tmp.ordid=st.ordid  aND ST1.FabID = ST.fabid AND ST1.CntID = ST.cntid AND ST1.ColID = ST.colid			AND ST1.PRINT_DESIGNID = ST.designid AND STOCKTABLE.Dept = TMP.Deptid  AND ST1.Dept = ST.deptid where(isnull(st.Cumbillrate,
 0)				<> 0) and Tmp.DeptID = -7 AND IPAddress = @IPAddress

			
	if (select count(1) from BI_GrpStockinfo WHERE deptID=@DEPTID  and GroupId = @GRPID) >0
	begin
	print 'b'
	print @GrpId
	print @Deptid 
		update BI_GrpStockinfo SET StockKgs = isNull(Stockkgs,0) + isNull(X.KGS,0),StockValue = IsNull(Stockvalue,0) + isNull(X.VALUE,0)  FROM (SELECT @GRPID as grpid ,@DEPTID as deptid,isNull(Sum(StkKgs),0) AS KGS, isNull(Sum(StkKgs * Rate),0) AS VALUE FROM BI_STKREPORTS WHERE deptid = @DEPTID AND IPAddress = @IPAddress and StkGrpID = @GRPID and Ordid=@Ordid) X INNER JOIN BI_GrpStockinfo  ON X.grpid = BI_GrpStockinfo.GroupId
		And x.deptid = BI_GrpStockinfo.DeptID
	end
	else
	begin
	print'a'
			INSERT INTO BI_GrpStockinfo (GroupId,DeptID,StockKgs,StockValue) SELECT @GRPID,@DEPTID,isNull(Sum(StkKgs),0) AS KGS, isNull(Sum(StkKgs * Rate),0) AS VALUE FROM BI_STKREPORTS WHERE deptid = @DEPTID AND IPAddress = @IPAddress and StkGrpID = @GRPID and OrdId=@Ordid

	end
	
			

			

			SELECT * FROM BI_GrpStockinfo

			SET @Item_Counter_1 = @Item_Counter_1 + 1	

		END

		SET @Item_Counter_StkGrp = @Item_Counter_StkGrp + 1	



	END





/* FABRIC GROUP STOCK */

 

DELETE FROM #DT_StkRptGrp

INSERT INTO #DT_StkRptGrp SELECT Row_Number() OVER (ORDER BY id) AS SLno,ID,Formula1 from Mas_StockReportGroup WHERE Y_F_A_P ='F' 



SELECT @Item_Counter_StkGrp = min(Slno) , @MaxSlNoId_StkGrp = max(Slno) FROM #DT_StkRptGrp





WHILE(@Item_Counter_StkGrp IS NOT NULL AND @Item_Counter_StkGrp <= @MaxSlNoId_StkGrp)

	BEGIN

		DELETE FROM #DT_Temp 

		SET @charSpliter = ',';

		SELECT @IDs = Formula1 from #DT_StkRptGrp WHERE Slno = @Item_Counter_StkGrp 

		SELECT @GRPID = GRPID  FROM #DT_StkRptGrp WHERE Slno = @Item_Counter_StkGrp 

		SELECT @IDs = @IDs +  @charSpliter

		SET @SLNO =1

		WHILE CHARINDEX(@charSpliter, @IDs) > 0

		BEGIN

			SET @Number = SUBSTRING(@IDs, 0, CHARINDEX(@charSpliter, @IDs));

			SET @IDs = SUBSTRING(@IDs, CHARINDEX(@charSpliter, @IDs) + 1, LEN(@IDs));



		INSERT INTO #DT_Temp VALUES (@Number , @SLNO)

		   SET @SLNO = @SLNO +1 



		END;

	

		SELECT * FROM #DT_Temp

		

		

		SELECT @Item_Counter_1 = min(Slno) , @MaxSlNoId_1 = max(Slno) FROM #DT_Temp

		WHILE(@Item_Counter_1 IS NOT NULL AND @Item_Counter_1 <= @MaxSlNoId_1)

		BEGIN

			SELECT @DEPTID = DEPTID FROM #DT_Temp WHERE Slno = @Item_Counter_1



			EXEC Sp_BIStockRpt 'F', @OrderType,@OrderStatus,@Coycode ,@DEPTID,@IPADDRESS,@Ordid,@GRPID

			

			Update tmp set tmp.rate = isnull(st.Cumbillrate,0)  from BI_STKREPORTS  tmp inner join StockRAtePost st (nolock) 

			on tmp.ordid=st.ordid  and tmp.deptid=st.deptid  and  isnull(tmp.cntid,0)=isnull(st.cntid,0)  and  isnull(tmp.fabid,0)=isnull				(st.fabid,0)  and  isnull(tmp.colid,0)=isnull(st.colid,0) and	 isnull(tmp.designid,0) = 	ISNULL(st.designid,0) where(isnull
				(st.Cumbillrate, 0) <> 0) AND IPAddress =@IpADdress 



			Update tmp set tmp.rate = st.budrate from BI_STKREPORTS  tmp inner join StockRAtePost st (nolock)  on tmp.ordid=st.ordid 

			and tmp.deptid=st.deptid   and  isnull(tmp.cntid,0)=isnull(st.cntid,0) and  isnull(tmp.fabid,0)=isnull(st.fabid,0)  and  isnull				(tmp.colid,0)=isnull(st.colid,0)  and	 isnull(tmp.designid,0) = 	ISNULL(st.designid,0)  where(isnull(st.Cumbillrate, 0) =
 0)				And IPAddress =@IPAddress



			Update tmp set tmp.rate = st.budrate from BI_STKREPORTS  tmp inner join StockRAtePost st (nolock) on tmp.ordid=st.ordid 

			and tmp.deptid=st.deptid  and  isnull(tmp.cntid,0)=isnull(st.cntid,0) and  isnull(tmp.fabid,0)=isnull(st.fabid,0) 

			and  isnull(tmp.colid,0)=isnull(st.colid,0)  and	 isnull(tmp.designid,0) = 	ISNULL(st.designid,0) where tmp.Deptid In					(3,15,4,8)  And IPAddress = @IPAddress 



			Update tmp set tmp.rate =isnull(st.Cumbillrate,0) from BI_STKREPORTS  tmp INNER JOIN StockTable ON Tmp.Stockid =							StockTable.StockID AND TMP.Deptid = StockTable.Dept  INNER JOIN StockTable as ST1 on StockTable.FrmStockID = st1.StockID inner				join StockRAtePost st (nolock)  on tmp.ordid=st.ordid  aND ST1.FabID = ST.fabid AND ST1.CntID = ST.cntid AND ST1.ColID = ST.colid			AND ST1.PRINT_DESIGNID = ST.designid AND STOCKTABLE.Dept = TMP.Deptid  AND ST1.Dept = ST.deptid where(isnull(st.Cumbillrate,
 0)				<> 0) and Tmp.DeptID = -7 AND IPAddress = @IPAddress


	if  (select count(1) from BI_GrpStockinfo WHERE deptID=@DEPTID  and GroupId = @GRPID) > 0
	begin
	print'c'
		update BI_GrpStockinfo SET StockKgs = isNull(Stockkgs,0) + isNull(X.KGS,0),StockValue = IsNull(Stockvalue,0) + isNull(X.VALUE,0)  FROM (SELECT @GRPID as grpid ,@DEPTID as deptid,isNull(Sum(StkKgs),0) AS KGS, isNull(Sum(StkKgs * Rate),0) AS VALUE FROM BI_STKREPORTS WHERE deptid = @DEPTID AND IPAddress = @IPAddress and StkGrpID = @GRPID AND ORDID = @Ordid ) X INNER JOIN BI_GrpStockinfo  ON X.grpid = BI_GrpStockinfo.GroupId
		And x.deptid = BI_GrpStockinfo.DeptID
	end
	else
	begin
	print 'd'
			INSERT INTO BI_GrpStockinfo (GroupId,DeptID,StockKgs,StockValue) SELECT @GRPID,@DEPTID,isNull(Sum(StkKgs),0) AS KGS, isNull(Sum(StkKgs * Rate),0) AS VALUE FROM BI_STKREPORTS WHERE deptid = @DEPTID AND IPAddress = @IPAddress and StkGrpID = @GRPID  AND ORDID = @Ordid

	end



			

			



			SET @Item_Counter_1 = @Item_Counter_1 + 1	

		END

		SET @Item_Counter_StkGrp = @Item_Counter_StkGrp + 1	



	END





	/* ACCESSORIES GROUP STOCK */



DELETE FROM #DT_StkRptGrp

INSERT INTO #DT_StkRptGrp SELECT Row_Number() OVER (ORDER BY id) AS SLno,ID,Formula1 from Mas_StockReportGroup WHERE Y_F_A_P ='A' 



SELECT @Item_Counter_StkGrp = min(Slno) , @MaxSlNoId_StkGrp = max(Slno) FROM #DT_StkRptGrp





WHILE(@Item_Counter_StkGrp IS NOT NULL AND @Item_Counter_StkGrp <= @MaxSlNoId_StkGrp)

	BEGIN

		DELETE FROM #DT_Temp 

		SET @charSpliter = ',';

		SELECT @IDs = Formula1 from #DT_StkRptGrp WHERE Slno = @Item_Counter_StkGrp 

		SELECT @GRPID = GRPID  FROM #DT_StkRptGrp WHERE Slno = @Item_Counter_StkGrp 

		SELECT @IDs = @IDs +  @charSpliter

		SET @SLNO =1

		WHILE CHARINDEX(@charSpliter, @IDs) > 0

		BEGIN

			SET @Number = SUBSTRING(@IDs, 0, CHARINDEX(@charSpliter, @IDs));

			SET @IDs = SUBSTRING(@IDs, CHARINDEX(@charSpliter, @IDs) + 1, LEN(@IDs));



		INSERT INTO #DT_Temp VALUES (@Number , @SLNO)

		   SET @SLNO = @SLNO +1 



		END;

	

		SELECT * FROM #DT_Temp

		

		

		SELECT @Item_Counter_1 = min(Slno) , @MaxSlNoId_1 = max(Slno) FROM #DT_Temp

		WHILE(@Item_Counter_1 IS NOT NULL AND @Item_Counter_1 <= @MaxSlNoId_1)

		BEGIN

			SELECT @DEPTID = DEPTID FROM #DT_Temp WHERE Slno = @Item_Counter_1



			EXEC Sp_BIStockRpt 'A', @OrderType,@OrderStatus,@Coycode ,@DEPTID,@IPADDRESS,@Ordid,@GRPID

			

			update BI_ACCSTOCK set rate=Billrate from BI_ACCSTOCK inner join  StockRAtePost on BI_ACCSTOCK.ordid= StockRAtePost.ordid and			BI_ACCSTOCK.atype=StockRAtePost.acctypeid and BI_ACCSTOCK.ades=StockRAtePost.accdescid  and							

			BI_ACCSTOCK.colid=StockRAtePost.colid and BI_ACCSTOCK.siz=StockRAtePost.sizeid where isnull(Billrate,0)<> 0  



			update BI_ACCSTOCK set rate=Budrate from BI_ACCSTOCK inner join  StockRAtePost on BI_ACCSTOCK.ordid= StockRAtePost.ordid and				BI_ACCSTOCK.atype=StockRAtePost.acctypeid and BI_ACCSTOCK.ades=StockRAtePost.accdescid  and		

			BI_ACCSTOCK.colid=StockRAtePost.colid and BI_ACCSTOCK.siz=StockRAtePost.sizeid  where isnull(Billrate,0)= 0


			if (select count(1) from BI_GrpStockinfo WHERE deptID=@DEPTID  and GroupId = @GRPID) > 0
			begin
				update BI_GrpStockinfo SET StockValue = IsNull(Stockvalue,0) + isNull(X.VALUE,0)  FROM (SELECT @GRPID as grpid,@DEPTID as deptid,0 as kgs,isNull(Sum(Qty * A.Rate),0) as value FROM BI_ACCSTOCK a inner join Mas_Acc on a.atype = mas_acc.ID inner join Mas_AccCategory on Mas_Acc.CatId = Mas_AccCategory.CatId WHERE 
Mas_Acc.CatId = @DEPTID  and a.StkGrpID = @GRPID AND ORDID = @Ordid) X INNER JOIN BI_GrpStockinfo  ON X.grpid = BI_GrpStockinfo.GroupId
		And x.deptid = BI_GrpStockinfo.DeptID
			end
			else
			begin
				INSERT INTO BI_GrpStockinfo (GroupId,DeptID,StockKgs,StockValue) SELECT @GRPID,@DEPTID,0,isNull(Sum(Qty * A.Rate),0) FROM BI_ACCSTOCK a inner join Mas_Acc on a.atype = mas_acc.ID inner join Mas_AccCategory on Mas_Acc.CatId = Mas_AccCategory.CatId WHERE 
Mas_Acc.CatId = @DEPTID and StkGrpid = @GRPID AND ORDID = @Ordid

			end


			
			

			



			SET @Item_Counter_1 = @Item_Counter_1 + 1	

		END

		SET @Item_Counter_StkGrp = @Item_Counter_StkGrp + 1	



	END

	 

/* PCS STOCK GROUP  */

DELETE FROM #DT_StkRptGrp

INSERT INTO #DT_StkRptGrp SELECT Row_Number() OVER (ORDER BY id) AS SLno,ID,Formula1 from Mas_StockReportGroup WHERE Y_F_A_P ='P' 



SELECT @Item_Counter_StkGrp = min(Slno) , @MaxSlNoId_StkGrp = max(Slno) FROM #DT_StkRptGrp





WHILE(@Item_Counter_StkGrp IS NOT NULL AND @Item_Counter_StkGrp <= @MaxSlNoId_StkGrp)

	BEGIN

		DELETE FROM #DT_Temp 

		SET @charSpliter = ',';

		SELECT @IDs = Formula1 from #DT_StkRptGrp WHERE Slno = @Item_Counter_StkGrp 

		SELECT @GRPID = GRPID  FROM #DT_StkRptGrp WHERE Slno = @Item_Counter_StkGrp 

		SELECT @IDs = @IDs +  @charSpliter

		SET @SLNO =1

		WHILE CHARINDEX(@charSpliter, @IDs) > 0

		BEGIN

			SET @Number = SUBSTRING(@IDs, 0, CHARINDEX(@charSpliter, @IDs));

			SET @IDs = SUBSTRING(@IDs, CHARINDEX(@charSpliter, @IDs) + 1, LEN(@IDs));



		INSERT INTO #DT_Temp VALUES (@Number , @SLNO)

		   SET @SLNO = @SLNO +1 



		END;

	

		SELECT * FROM #DT_Temp

		

		

		SELECT @Item_Counter_1 = min(Slno) , @MaxSlNoId_1 = max(Slno) FROM #DT_Temp

		WHILE(@Item_Counter_1 IS NOT NULL AND @Item_Counter_1 <= @MaxSlNoId_1)

		BEGIN

			SELECT @DEPTID = DEPTID FROM #DT_Temp WHERE Slno = @Item_Counter_1



			EXEC Sp_BIStockRpt 'P', @OrderType,@OrderStatus,@Coycode ,@DEPTID,@IPADDRESS,@Ordid,@GRPID

			

		



			SET @Item_Counter_1 = @Item_Counter_1 + 1	

		END

		SET @Item_Counter_StkGrp = @Item_Counter_StkGrp + 1	



		EXEC SP_PcsValue @ORdid,@IPAddress 



	END



/* PCS VALUE */



DELETE FROM #DT_StkRptGrp

INSERT INTO #DT_StkRptGrp SELECT Row_Number() OVER (ORDER BY id) AS SLno,ID,Formula1 from Mas_StockReportGroup WHERE Y_F_A_P ='P' 



SELECT @Item_Counter_StkGrp = min(Slno) , @MaxSlNoId_StkGrp = max(Slno) FROM #DT_StkRptGrp





WHILE(@Item_Counter_StkGrp IS NOT NULL AND @Item_Counter_StkGrp <= @MaxSlNoId_StkGrp)

	BEGIN

		DELETE FROM #DT_Temp 

		SET @charSpliter = ',';

		SELECT @IDs = Formula1 from #DT_StkRptGrp WHERE Slno = @Item_Counter_StkGrp 

		SELECT @GRPID = GRPID  FROM #DT_StkRptGrp WHERE Slno = @Item_Counter_StkGrp 

		SELECT @IDs = @IDs +  @charSpliter

		SET @SLNO =1

		WHILE CHARINDEX(@charSpliter, @IDs) > 0

		BEGIN

			SET @Number = SUBSTRING(@IDs, 0, CHARINDEX(@charSpliter, @IDs));

			SET @IDs = SUBSTRING(@IDs, CHARINDEX(@charSpliter, @IDs) + 1, LEN(@IDs));



		INSERT INTO #DT_Temp VALUES (@Number , @SLNO)

		   SET @SLNO = @SLNO +1 



		END;

	

		SELECT * FROM #DT_Temp

		

		

		SELECT @Item_Counter_1 = min(Slno) , @MaxSlNoId_1 = max(Slno) FROM #DT_Temp

		WHILE(@Item_Counter_1 IS NOT NULL AND @Item_Counter_1 <= @MaxSlNoId_1)

		BEGIN

			SELECT @DEPTID = DEPTID FROM #DT_Temp WHERE Slno = @Item_Counter_1

		if  (select count(1) from BI_GrpStockinfo WHERE deptID=@DEPTID  and GroupId = @GRPID) > 0
		begin
			update BI_GrpStockinfo SET StockKgs = IsNull(StockKgs,0) + isNull(X.KGS,0) ,StockValue = IsNull(Stockvalue,0) + isNull(X.VALUE,0)  FROM (SELECT @GRPID as Grpid,@DEPTID as Deptid,isNull(Sum(StockPcs),0) as KGS,isNull(Sum(GarmentStockValue),0) as Value  FROM	BI_PCEREG A INNER JOIN Mas_JobWrkcomp  B ON  A.DeptId = B.ID   WHERE B.DeptId = @DEPTID and StkGrpID = @GRPID AND ORDID = @Ordid) X INNER JOIN BI_GrpStockinfo  ON X.grpid = BI_GrpStockinfo.GroupId
		And x.deptid = BI_GrpStockinfo.DeptID		
		end
		else
		begin
			INSERT INTO BI_GrpStockinfo (GroupId,DeptID,StockKgs,StockValue) SELECT @GRPID,@DEPTID,isNull(Sum(StockPcs),0) as KGS,isNull(Sum(GarmentStockValue),0) as Value  FROM	BI_PCEREG A INNER JOIN Mas_JobWrkcomp  B ON  A.DeptId = B.ID   WHERE B.DeptId = @DEPTID and StkGrpID = @GRPID and OrdId= @Ordid
		end

		

			

		



			SET @Item_Counter_1 = @Item_Counter_1 + 1	

		END

		SET @Item_Counter_StkGrp = @Item_Counter_StkGrp + 1	



	END


END 






