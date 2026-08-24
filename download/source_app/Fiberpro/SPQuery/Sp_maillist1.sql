 /*                  
;=============================================                  
; Author  :  Global Software's                  
; Create date  :  06/JUL/2018                  
; Create By  :  ASLAM                  
; Description  :  Stored Procedure for Mail List - Commando
; Change Person  :  ASLAM                
; Last Change Date :  05/Jul/2018 04.00 PM                  
; =============================================   */  
CREATE PROC Sp_Maillist1 (@AssigneeList        VARCHAR(2000), 
                         @TemplateId          INT, 
                         @FromDate            DATE, 
                         @ToDate              DATE, 
                         @arg1                AS VARCHAR(255), 
                         @argname1            AS VARCHAR(255), 
                         @arg2                AS VARCHAR(255), 
                         @argname2            AS VARCHAR(255), 
                         @arg3                AS VARCHAR(255), 
                         @argname3            AS VARCHAR(255), 
                         @AssigneeListCloudid VARCHAR(2000)) 
AS 
  BEGIN 
      DECLARE @SQL         AS NVARCHAR(max) 
	  DECLARE @DATASQL         AS NVARCHAR(max), 
			  @CountSQL as NVarchar(Max),
              @columnslist VARCHAR(100) 
      DECLARE @Buyer    AS CHAR(1), 
              @Oper     AS CHAR(1), 
              @Assignee AS CHAR(1) 
      DECLARE @MailDisplayList  AS VARCHAR(500), 
              @QueryDisplayList AS VARCHAR(500), 
              @OrderType        CHAR(6) 
      DECLARE @DateFilter     AS VARCHAR(10), 
              @UpcomingDays   AS INT, 
              @DUEDays_Filter INT, 
              @PendingType    AS VARCHAR(10) ,
			  @MailDataLimit as VARCHAR(10) = 145

      SELECT @MailDisplayList = maildisplaylist 
      FROM   wf_mailtemplate 
      WHERE  templateid = @TemplateId 

      SELECT @DateFilter = Isnull(datecriteria, 'tilldate') 
      FROM   wf_mailtemplate 
      WHERE  templateid = @TemplateId 

      SELECT @UpcomingDays = Isnull(upcomingdays, '0') 
      FROM   wf_mailtemplate 
      WHERE  templateid = @TemplateId 

      SELECT @PendingType = Isnull(pendingtype, 'C,M') 
      FROM   wf_mailtemplate 
      WHERE  templateid = @TemplateId 

      IF @PendingType = 'C,M' 
        BEGIN 
            SET @DUEDays_Filter = 0 
        END 
      ELSE IF @PendingType = 'C' 
        BEGIN 
            SET @DUEDays_Filter = 5 
        END 
      ELSE IF @PendingType = 'M' 
        BEGIN 
            SET @DUEDays_Filter = 2 
        END 

      IF @DateFilter = 'today' 
        BEGIN 
            SET @FromDate =@ToDate 
        END 

      IF @DateFilter = 'upcoming' 
        BEGIN 
            SET @ToDate =Dateadd(d, 1, @ToDate) 
        END 

      SELECT @QueryDisplayList = Stuff((SELECT ',' + fieldname + ' as td' 
                                        FROM   wf_maildisplaylist 
                                        WHERE  id IN (SELECT idstr 
                                                      FROM   Fnsplitter_str( 
                                                             @MailDisplayList) 
                                                     ) 
                                        FOR xml path ('')), 1, 1, '') 

  
  SET @DATASQL =N'

SELECT * FROM ( Select id, IONO,BuyOrdNo,shortbuyer,StyleNo,StyleNo1,styleqty,uom, Convert(varchar(20),deldt,105) as deldt, Assignee,WF_OperationCode, OperationName, ItemSlno,ItemDesc , Convert(varchar(10),PlanStartDate,105) as Dueon, abs(Datediff("d",Planstartdate,''01-Jan-1900'')) as DueonSORT,  isnull(OperationType,''-'') as OperationType, PendingDays,abs(PendingDays) as pdays, Convert(varchar(10),InitialPlanStartDate,105) as InitialPlanStartDate, Convert(varchar(10),InitialPlanFinishDate,105) as InitialPlanFinishDate, JobNo, Finyear, OrdId, GrdSlno, BuyerID, WF_USerID, finishflg, Convert(varchar(10),Actualstartdate,105) as Actualstartdate, Convert(varchar(10),actualfinishdate,105) as actualfinishdate, buyerdeptid,remarks,colorcode,oprtype,deptcode,accgrpcode,stagecode,(iono+''!''+buyordno+''!''+styleno) idfld FROM  Vue_WbsList VWL  WHERE ActualStartDate IS NULL And VFlag_Start is Null  AND  ActualFinishDate is Null And (FinishFlg is Null OR FinishFlg =''N'') '

    IF Len(Rtrim(@FromDate)) > 0 
      BEGIN 
          SET @DATASQL=@DATASQL + N' And Planstartdate >=@fromdate' 
      END 

    SET @DATASQL=@DATASQL 
             + 
N' And (planstartdate <= @Todate)  AND  VWl.BuyerID in (Select IdStr From dbo.fnSplitter_Str( ( Select  case When SelAll =''S'' Then   Stuff( (Select '','' +  Rtrim(BuyerID)  from Wf_UserBuyerMas Where UserId = Vwl.WF_USerID  FOR XML PATH(''''))  ,1,1,'''' ) ELSE  Stuff( (Select '','' +  Rtrim(BuyerID)  from Mas_Buyer  FOR XML PATH(''''))  ,1,1,'''' )    END as BuyerID From WF_UserMas WHERE USERID = Vwl.WF_USerID)))   AND  VWl.BuyerDeptID in (Select IdStr From dbo.fnSplitter_Str( ( Select  case When SelAll =''S'' Then   Stuff( (Select '','' +  Rtrim(BuyerDeptID)  from Wf_UserBuyerDeptMas Where UserId = Vwl.WF_USerID  FOR XML PATH(''''))  ,1,1,'''' ) ELSE  Stuff( (Select '','' +  Rtrim(ID)  from Mas_BuyerDept  FOR XML PATH(''''))  ,1,1,'''' )    END as BuyerDeptID From WF_UserMas WHERE USERID = Vwl.WF_USerID)))    AND  VWl.ProdUnit in (Select IdStr From dbo.fnSplitter_Str(( Select  case When SelAll =''S'' Then   Stuff( (Select '','' +  Rtrim(Unit)  from wf_UserUnitMas Where UserId = Vwl.WF_USerID  FOR XML PATH(''''))  ,1,1,'''' ) ELSE  Stuff( (Select '','' +  Rtrim(ExpID)  from Mas_Exporter  FOR XML PATH(''''))  ,1,1,'''' )    END as UnitID From WF_UserMas WHERE USERID = Vwl.WF_USerID)))  AND VWl.WF_OperationCode in (Select IdStr From dbo.fnSplitter_Str(( Select  case When SelAll =''S'' Then   Stuff( (Select '','' +  Rtrim(OpCode)  from Wf_UserOperationList  Where UserId = Vwl.WF_USerID  FOR XML PATH(''''))  ,1,1,'''' ) ELSE Stuff( (Select '','' +  Rtrim(OpCode)  from Wf_OperationMaster   FOR XML PATH(''''))  ,1,1,'''' )   END as OperCode From WF_UserMas WHERE USERID = Vwl.WF_USerID)))  AND VWl.WF_UserId  in (Select IdStr From dbo.fnSplitter_Str(( Select  case When SelAll =''S'' Then   Stuff( (Select '','' +  Rtrim(Sel_UserID)  from Wf_AssigneeMas   Where UserId = Vwl.WF_USerID  FOR XML PATH(''''))  ,1,1,'''' ) ELSE Stuff( (Select '','' +  Rtrim(UserID)  from WF_UserMas   FOR XML PATH(''''))  ,1,1,'''' )   END as OperCode From WF_UserMas WHERE USERID = Vwl.WF_USerID)))  '
    SET @DATASQL=@DATASQL 
             + 
N'   ) XY        UNION SELECT * FROM ( Select ID,IONO,BuyOrdNo,shortbuyer,StyleNo, StyleNo1,Styleqty,uom,convert(varchar(10),deldt,105) as deldt,Assignee,WF_OperationCode, OperationName, ItemSlno,ItemDesc , Convert(varchar(10),PlanFinishDate,105) as Dueon, abs(Datediff("d",PlanFinishdate,''01-Jan-1900'')) as DueonSORT ,OperationType, PendingDays,abs(PendingDays)as pdays,InitialPlanStartDate,InitialPlanFinishDate, JobNo, Finyear, OrdId, GrdSlno, BuyerID, WF_USerID, finishflg, Actualstartdate, actualfinishdate,buyerdeptid,remarks,colorcode,oprtype,deptcode,accgrpcode,stagecode,(iono+''!''+buyordno+''!''+styleno) idfld FROM  Vue_WbsList VWL WHERE ActualFinishDate is Null And ActualStartDate is Not Null And (FinishFlg is Null OR FinishFlg =''N'')'

    IF Len(Rtrim(@FromDate)) > 0 
      BEGIN 
          SET @DATASQL=@DATASQL + N' And planfinishdate >=@fromdate' 
      END 

    SET @DATASQL=@DATASQL 
             + 
N' And (planfinishdate <= @Todate) And (VFlag_Start is not null And VFlag_Finish Is Null)  AND VWl.BuyerID in (Select IdStr From dbo.fnSplitter_Str(( Select  case When SelAll =''S'' Then   Stuff( (Select '','' +  Rtrim(BuyerID)  from Wf_UserBuyerMas Where UserId = Vwl.WF_USerID  FOR XML PATH(''''))  ,1,1,'''' ) ELSE Stuff( (Select '','' +  Rtrim(BuyerID)  from Mas_Buyer  FOR XML PATH(''''))  ,1,1,'''' )   END as BuyerID From WF_UserMas WHERE USERID = Vwl.WF_USerID)))       AND VWl.BuyerDeptID in (Select IdStr From dbo.fnSplitter_Str(( Select  case When SelAll =''S'' Then   Stuff( (Select '','' +  Rtrim(BuyerDeptID)  from Wf_UserBuyerDeptMas Where UserId = Vwl.WF_USerID  FOR XML PATH(''''))  ,1,1,'''' ) ELSE Stuff( (Select '','' +  Rtrim(ID)  from Mas_BuyerDept  FOR XML PATH(''''))  ,1,1,'''' )   END as BuyerDeptID From WF_UserMas WHERE USERID = Vwl.WF_USerID)))    AND VWl.ProdUnit in (Select IdStr From dbo.fnSplitter_Str(( Select  case When SelAll =''S'' Then   Stuff( (Select '','' +  Rtrim(Unit)  from wf_UserUnitMas Where UserId = Vwl.WF_USerID  FOR XML PATH(''''))  ,1,1,'''' ) ELSE Stuff( (Select '','' +  Rtrim(ExpID)  from Mas_Exporter  FOR XML PATH(''''))  ,1,1,'''' )   END as UnitID From WF_UserMas WHERE USERID = Vwl.WF_USerID)))       AND VWl.WF_OperationCode in (Select IdStr From dbo.fnSplitter_Str(( Select  case When SelAll =''S'' Then   Stuff( (Select '','' +  Rtrim(OpCode)  from Wf_UserOperationList  Where UserId = Vwl.WF_USerID  FOR XML PATH(''''))  ,1,1,'''' ) ELSE Stuff( (Select '','' +  Rtrim(OpCode)  from Wf_OperationMaster   FOR XML PATH(''''))  ,1,1,'''' )   END as OperCode From WF_UserMas WHERE USERID = Vwl.WF_USerID)))      AND VWl.WF_UserId  in (Select IdStr From dbo.fnSplitter_Str(( Select  case When SelAll =''S'' Then   Stuff( (Select '','' +  Rtrim(Sel_UserID)  from Wf_AssigneeMas   Where UserId = Vwl.WF_USerID  FOR XML PATH(''''))  ,1,1,'''' ) ELSE Stuff( (Select '','' +  Rtrim(UserID)  from WF_UserMas   FOR XML PATH(''''))  ,1,1,'''' )   END as OperCode From WF_UserMas WHERE USERID = Vwl.WF_USerID)))   and PendingDays > 0   '
    SET @DATASQL = @DATASQL + 
N') XYZ '

  
      SET @SQL = 
'SELECT sno,templatename ,userid,mailheader,mailfooter,Case when DataCount >' + @MailDataLimit + ' then  concat(''<center><br><br>'',''<h3> Total Pending Operations : '',DataCount,'',</h3><br><br><i>Unable to List the Operations (Mail Data Limit Exceded)</i></center>'') Else bodydata END as bodydata ,DataCount, cols,widths,' + @argname1 + ',' + @argname2 +',' + @argname3 + ', cloudid


From (SELECT dat.*, cid.idstr as cloudid FROM (Select Row_Number() Over(Order by userid)  as sno,templatename,userid,mailheader,mailfooter , isnull( ( SELECT * FROM ( SELECT (SELECT '
+ @QueryDisplayList 
+ 
' FROM ('




SET @SQL = @Sql + @DATASQL 

 

 

SET @SQL = @Sql + N'
) ABC  For XML RAW (''tr'') , ELEMENTS  ) DATA ) ZZ),''nodata'') bodydata, (select count(1) as DCount From ('+ @dataSql + ' ) DSql ) DataCount ,   (SElect Stuff((select '',''+header from (Select displayname as header from wf_maildisplaylist where id in (Select idstr from  fnSplitter_Str( (Select MailDisplayList from WF_MailTemplate where Templateid = @TemplateId ))))x for xml path ('''')),1,1,'''')) as cols,(SElect Stuff((select '',''+header from (Select convert(varchar,width) as header from wf_maildisplaylist where id in (Select idstr from  fnSplitter_Str( (Select MailDisplayList from WF_MailTemplate where Templateid =@TemplateId ))))x for xml path ('''')),1,1,'''')) as widths, '''
           + @arg1 + '''  as ' + @argname1 + ', ''' + @arg2 
           + '''  as ' + @argname2 + ', ''' + @arg3 + '''  as ' 
           + @argname3 
           + 
' From (Select * from WF_UserMas UM Where Userid in  (Select IDStr From fnSplitter_Str(@AssigneeList))) X1 LEFT JOIN   WF_MailTemplate ON TemplateID =@TemplateID) DAT left join (select Row_Number() Over(Order by idstr)  as sno,idstr from fnSplitter_Str(@AssigneeListCloudid))cid on dat.sno = cid.sno ) FinalQuery '

--print cast(@sql as ntext)

   EXEC Sp_executesql       @SQL, 
N'@AssigneeList Varchar(2000),@TemplateId int,@FromDate Date,@ToDate Date,@arg1 Varchar(255),@argname1 Varchar(255),@arg2 Varchar(255),@argname2 Varchar(255),@arg3 Varchar(255),@argname3 Varchar(255),@AssigneeListCloudid varchar(2000) '
    , 
@AssigneeList=@AssigneeList, 
@templateId=@Templateid, 
@FromDate=@FromDate, 
@ToDate=@ToDate, 
@arg1=@arg1, 
@argname1=@argname1, 
@arg2=@arg2, 
@argname2=@argname2, 
@arg3=@arg3, 
@argname3=@argname3, 
@AssigneeListCloudid=@AssigneeListCloudid 
END 


--EXEC Sp_maillist1   '3,4', 2,'', '2018-04-17','Fashionsuite <noreply@fashionsuite.com>', 'X_Sender','Fashion Apps',  'X_Mailer','v3','arg3','5,7'; 

