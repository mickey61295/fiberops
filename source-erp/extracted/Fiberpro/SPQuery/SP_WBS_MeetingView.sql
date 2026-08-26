/*                  
;=============================================                  
; Author  :  Global Software's                  
; Create date  :  16/JUL/2018                  
; Create By  :  ASLAM                  
; Description  :  Stored Procedure for Commando-Meeting Review
; Change Person  :  ASLAM                
; Last Change Date :  26/Sep/2018 01.50 PM                  
; =============================================   */      
CREATE PROC [dbo].[SP_WBS_MeetingView](
@Coycode Varchar(100),@Buyerid nvarchar(max),@BuyerDeptId nvarchar(max),@FromDate DateTime,@ToDate DateTime,@OrderType Varchar(6),@OperationList nvarchar(max)
) As 

BEGIN 
DECLARE @SQLSTR AS NVARCHAR(max) 

if Len(Rtrim(@toDate))=0 
begin
SELECT @toDate = convert(date,Dateadd(d,7,getdate())) 
end

Set @SQLSTR =N'SELECT 
 CONVERT( varchar(32), HashBytes(''MD5'', concat(OM.JobNo,OM.Finyear,OM.BuyOrdNo,
 
  Case When WP.StyleNo = '''' then (Select Top 1 
Styleno from WF_WorkFlow_Planning WPP Where Wp.Ordid = WPP.Ordid and WPP.Styleno <>'''') ELSE WP.StyleNo END )) ,2) as group_column,WP.wf_operationcode, SUBSTRING(OPName,1,12) As operationName,
rtrim(OM.Jobno) +''/'' +om.Finyear as iono, OM.BuyOrdNo as buyordno,WP.styleno,
 Case When WP.StyleNo = '''' then (Select Top 1 
Styleno from WF_WorkFlow_Planning WPP Where Wp.Ordid = WPP.Ordid and WPP.Styleno <>'''') ELSE WP.StyleNo END as Styleno2,

   Convert(varchar(10),Min(PlanStartDate),120) as planstartdate , 
 Convert(varchar(10),Max(Planfinishdate),120) planfinishdate, Min(Grdslno) as itemorder,Convert(varchar(10),Min(ActualStartDate),120) as actualstartdate, Convert(varchar(10),Max(ActualFinishDate),120) AS actualfinishdate, Case When Min(ActualStartDate) is null then ''NOT YET STARTED'' ELSE Case When Min(ActualStartDate) is Not null  And VFlag_Start Is Null then ''STARTED, BUT NOT CONFIRMED'' ELSE Case When Min(ActualStartDate) is Not null  And VFlag_Start =''C'' And Max(ActualFinishDate) Is Null then ''STARTED, NOT YET FINISHED'' ELSE Case When Min(ActualStartDate) is Not null  And VFlag_Start =''C'' And Max(ActualFinishDate) Is Not Null And VFlag_Finish is Null then ''FINISHED, BUT NOT CONFIRMED'' ELSE Case When Min(ActualStartDate) is Not null  And VFlag_Start =''C'' And Max(ActualFinishDate) Is Not Null And VFlag_Finish=''C'' And FinishFlg =''Y'' Then  ''FINISHED'' END END END END END As ''orderstatus''  ,

 CASE WHEN Min(ActualStartDate) is not null and Min(actualstartdate) < Min(planstartdate) then ''ON BEFORE'' ELSE CASE WHEN Min(ActualStartDate) is not null and Min(actualstartdate) = Min(planstartdate) then ''ON TIME'' ELSE CASE WHEN  Min(ActualStartDate) is not null and Min(actualstartdate) > Min(planstartdate) then ''ON DELAY''  ELSE CASE WHEN Min(ActualStartDate) is null and Min(planstartdate) <= getdate() then ''ON DUE''  ELSE CASE WHEN Min(ActualStartDate) is null and Min(planstartdate) > getdate() then ''UPCOMING'' END END END END END  AS ''startstatus'', 
 
 
 CASE WHEN Min(ActualStartDate) is not null and Min(actualstartdate) < Min(planstartdate) then ''green'' ELSE CASE WHEN Min(ActualStartDate) is not null 
 and Min(actualstartdate) = Min(planstartdate) then ''green'' ELSE CASE WHEN  Min(ActualStartDate) is not null and Min(actualstartdate) > 
 Min(planstartdate) then ''lightgreen''  ELSE CASE WHEN Min(ActualStartDate) is null and Min(planstartdate) <= getdate() then (Select (dbo.wbs_getColor(DateDiff(d,getdate(),Min(planstartdate)))))  ELSE CASE WHEN Min(ActualStartDate) is null and Min(planstartdate) > getdate() then ''blue'' END END END END END  AS ''startstatuscolor'', 


 
 CASE WHEN Max(ActualFinishDate) is not null and Max(ActualFinishDate) < Max(planFinishdate) then ''ON BEFORE'' ELSE CASE WHEN Max(ActualFinishDate) is not null and Max(ActualFinishDate) = Max(planFinishdate) then ''ON TIME'' ELSE CASE WHEN Max(ActualFinishDate) is not null and Max(ActualFinishDate) > Max(planFinishdate) then ''ON DELAY''  ELSE CASE WHEN Max(ActualFinishDate) is null and Max(planFinishdate) <= getdate() then ''ON DUE''  ELSE CASE WHEN Max(ActualFinishDate) is null and Max(planFinishdate) > getdate() then ''UPCOMING'' END END END END END  AS ''finishstatus'', 
 
 CASE WHEN Max(ActualFinishDate) is not null and Max(ActualFinishDate) < Max(planFinishdate) then ''green'' ELSE CASE WHEN Max(ActualFinishDate) is not null and Max(ActualFinishDate) = Max(planFinishdate) then ''green'' ELSE CASE WHEN Max(ActualFinishDate) is not null and Max(ActualFinishDate) > Max(planFinishdate) then   ''lightgreen'' ELSE CASE WHEN Max(ActualFinishDate) is null and Max(planFinishdate) <= getdate() then (Select (dbo.wbs_getColor(DateDiff(d,getdate(),Max(planFinishdate)))))   ELSE CASE WHEN Max(ActualFinishDate) is null and Max(planFinishdate) > getdate() then ''blue'' END END END END END  AS ''finishstatuscolor'',wp.id , (Select dbo.Fun_Meet_Finish_Perc (Wp.Id)) as  finishperc, WP.OrdId as orderid, WOM.Type  as oprtype,wom.deptcode,Case When WP.StyleNo = '''' then (Select 
Sum(StyleQty) from OrderStyleDtl OSD Where Wp.Ordid = OSD.Ordid and ordid = wp.ORdid ) else Os.StyleQty end as styleqty ,ordermas2.deldt
 
  FROM WF_WorkFlow_Planning WP INNER JOIN Wf_OperationMaster WOM ON WP.WF_OperationCode = WOM.OPCode INNER JOIN WF_UserMas ON Wp.WF_UserId = WF_UserMas.UserID INNER JOIN OrderMas OM ON  Wp.Ordid = OM.Ordid INNER JOIN OrderMas2 ON OM.ORdid = OrderMas2.Ordid LEFT JOIN OrderStyleDtl OS on WP.ordid = os.ordid and  os.StyleNo = WP.Styleno And isnull(os.CP_Order_Completion,''N'') =''N''  WHERE 1=1  '
  
 
 if len(RTRIM(@Coycode))>0 begin Set @SQLSTR=@SQLSTR+N' AND OM.ExpId in (Select IDStr From fnSplitter_Str(@Coycode))' end   
 if len(RTRIM(@Buyerid))>0 begin Set @SQLSTR=@SQLSTR+N' AND OM.BuyerID in (Select IDStr From fnSplitter_Str(@BuyerId)) ' end  
 if len(RTRIM(@BuyerDeptId))>0 begin Set @SQLSTR=@SQLSTR+N' AND OM.Buyerdeptid in (Select IDStr From fnSplitter_Str(@BuyerDeptId)) ' end  
 if len(RTRIM(@OrderType))>0 begin Set @SQLSTR=@SQLSTR+N' AND OM.OrderType in (Select IDStr From fnSplitter_Str(@OrderType)) ' end  
 if len(RTRIM(@OperationList))>0 begin Set @SQLSTR=@SQLSTR+N' AND WOM.Opcode in (Select IDStr From fnSplitter_Str(@OperationList)) ' end  

  Set @SQLSTR=@SQLSTR+N'  
  
  GROUP BY ordermas2.deldt,CONVERT( varchar(32), HashBytes(''MD5'', concat(OM.JobNo,OM.Finyear,OM.BuyOrdNo,WP.StyleNo)) ,2) ,WP.wf_operationcode, OPName ,
  rtrim(OM.Jobno) +''/''+om.Finyear,OM.BuyOrdNo ,WP.styleno,VFlag_Start,VFlag_Finish,FinishFlg,wp.ordid,om.jobno,om.finyear ,wp.id,WOM.Type,wom.deptcode,Os.StyleQty
   

  ORDER BY ordermas2.deldt, 4'	Exec SP_EXECUTESQL @SQLSTR,N'@Coycode Varchar(100),@Buyerid nvarchar(max),@BuyerDeptId nvarchar(max),@FromDate DateTime,@ToDate DateTime,@OrderType Varchar(6),@OperationList nvarchar(max)', @Coycode=@coycode, @Buyerid=@Buyerid,@BuyerDeptId=@BuyerDeptId,@FromDate=@FromDate,@ToDate=@ToDate,@OrderType=@OrderType,@OperationList=@OperationList 
  END 

	 
--EXEC SP_WBS_MeetingView '','','','','24-Jul-2019','',''


