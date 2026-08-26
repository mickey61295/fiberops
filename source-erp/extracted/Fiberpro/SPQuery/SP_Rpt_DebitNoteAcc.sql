/*;=============================================   
; Author           :  Global Software's    
; Create date      :  11/10/2021    
; Create By        :  ASLAM  
; Description      :  DEBIT NOTE  
; Change Person    :  ASLAM
; Last Change Date :  11/10/2021 09.45 AM 
; =============================================  */  
  
CREATE PROCEDURE SP_Rpt_DebitNoteAcc (@Coycode as int,  @FromDate as datetime,  @ToDate as datetime,  @OrdId as nvarchar(200),  @DeptId as nvarchar(200),  @PId as nvarchar(200),@Finyear char(2))  AS  BEGIN   DECLARE @SQLSTR AS NVARCHAR(4000)  Set @SQLSTR 
=N' SELECT     DNo, Finyear, dt, Typ, Reason, ExporterName, Pname, ColorDesc, Gsm, GG, DebKg, DebMtr, Rate, PID, Coycode, DeptID, Deptname, YF, Uom, OrdId,   BuyOrdNo, IoFinyear, Jobno, ll, LotNo, Acc_Descr, AccDescription, SizeDesc,sno,remark,NetAmt FROM Vue_Rpt_DebitNoteAcc WHERE Coycode=@Coycode '  if (@FromDate)<>'' Begin  Set @SQLSTR=@SQLSTR+N' AND Dt >=@FromDate'  End   if (@ToDate)<>''   Begin  Set @SQLSTR=@SQLSTR+N' AND Dt <=@ToDate'  End     if len(RTRIM(@OrdId))>0  begin  Set @SQLSTR=@SQLSTR+N' AND OrdId in (Select ID From fnSplitter(@OrdId))'  end    if len(RTRIM(@DeptId))>0  begin  Set @SQLSTR=@SQLSTR+N' AND DeptId in (Select ID From fnSplitter(@DeptId))'  end  if len(RTRIM(@PId))>0  begin  Set @SQLSTR=@SQLSTR+N' AND PId in (Select ID From fnSplitter
(@PId))'  end     Exec SP_EXECUTESQL @SQLSTR,N'@Coycode int,@FromDate Datetime,@ToDate Datetime,@OrdId nvarchar(200),@Deptid nvarchar(200),@Pid nvarchar(200),@Finyear char(2)', @Coycode=@coycode,@Fromdate=@FromDate,@Todate=@Todate,@OrdId=@OrdId,@Deptid=@Deptid,@Pid=@Pid,@Finyear=@Finyear END
  
  
  
  
  
  
  
