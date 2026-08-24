/*;=============================================   
; Author           :  Global Software's    
; Create date      :  09/10/2021    
; Create By        :  ASLAM  
; Description      :  SP_Rpt_DebitNote   
; Change Person    :  ASLAM
; Last Change Date :  09/10/2021 10.45 AM 
; =============================================  */  
  
  CREATE PROCEDURE SP_Rpt_DebitNote ( @Coycode as int,  @FromDate as datetime,  @ToDate as datetime,  @OrdId as nvarchar(200),  
@DeptId as nvarchar(200),  @PId as nvarchar(200),@Finyear as char(2) )  AS  BEGIN   DECLARE @SQLSTR AS NVARCHAR(4000)  
Set @SQLSTR =N'SELECT  DNo, Finyear, dt, Typ, Reason, ExporterName, OrdId, BuyOrdNo, Pname, CountName, ColorDesc, ShortMill, DebKg, DebMtr, Rate, Coycode, PID, Deptname, DeptID,jobno,Iofinyear,Remark,NetAmt FROM Vue_Rpt_DebitNoteYarn WHERE Coycode=@Coycode '   
if (@FromDate)<>'' Begin  Set @SQLSTR=@SQLSTR+N' AND Dt >=@FromDate'  End   if (@ToDate)<>'' Begin  Set @SQLSTR=@SQLSTR+N' AND Dt <=@ToDate'  End      if len(RTRIM(@OrdId))>0  begin  Set @SQLSTR=@SQLSTR+N' AND OrdId in (Select ID From fnSplitter(@OrdId))'  end    if
 len(RTRIM(@DeptId))>0  begin  Set @SQLSTR=@SQLSTR+N' AND DeptId in (Select ID From fnSplitter(@DeptId))'  end   
if len(RTRIM(@PId))>0  begin  Set @SQLSTR=@SQLSTR+N' AND PId in (Select ID From fnSplitter(@PId))'  end     
Exec SP_EXECUTESQL @SQLSTR,N'@Coycode int,@FromDate Datetime,@ToDate Datetime,@OrdId nvarchar(200),@Deptid nvarchar(200),  @Pid nvarchar(200),@Finyear char(2)',  @Coycode=@coycode,@Fromdate=@FromDate,@Todate=@Todate,@OrdId=@OrdId,@Deptid=@Deptid,@Pid=@Pid,@Finyear=@Finyear END
  
  
  
  
  
  
  
