/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  13/Oct/2015            
; Create By  :  ASLAM            
; Description  :  Function for Arrival the Tentative Plan FinishDate
; Change Person  :  ASLAM          
; Last Change Date :  24/JUL/2018 10.00 AM            
; =============================================   */     
CREATE Function [dbo].[WF_PlanFinishDateArrival]  (@Date DateTime ,@Days int,@flg Char(1))   RETURNS DateTime  
BEGIN
Declare @Amt as Int   
Declare @Count as int  
Declare @WeeklyOff as int  
Declare @WeeklyDay as int  
Declare @CountHolidays as int   
DEclare @DaysAdd as int

if @Days > 0 
BEGIN 
SELECT @Date = DateAdd(d,1,@Date)   
if @flg='F'
SET @DaysAdd =1
Else
SET @DaysAdd =-1

SET @Count =1  
SET @WeeklyOff = 1 -- from Options  
While  @Count < @Days  
BEGIN  
  SELECT @WeeklyDay = DatePart("w",@Date)   
 -- print @WeeklyDay  
  SELECT @CountHolidays = Count(1) FROM GovtHolidays Where GHDate =@Date  
 -- print @CountHolidays  
  if @Weeklyday <> @WeeklyOff and @CountHolidays =0  
  Begin  
  SELECT @Date = DateAdd(d,@DaysAdd,@Date)   
  --print @Date   
  SET @Count = @Count + 1   
  End   
  Else  
  Begin  
  SELECT @Date = DateAdd(d,@DaysAdd,@Date)   
  End  
END   
SELECT @WeeklyDay = DatePart("w",@Date)   
--print @WeeklyDay
WHILE @WeeklyDay = 1 
BEGIN
--print 'asd'
	  if @Weeklyday <> @WeeklyOff and @CountHolidays =0  
	  Begin  
		SELECT @Date = DateAdd(d,@DaysAdd,@Date)   
		--print @Date   
		SET @Count = @Count + 1   
	  End   
  Else  
	  Begin  
		SELECT @Date = DateAdd(d,@DaysAdd,@Date)   
	  End  
	   SELECT @WeeklyDay = DatePart("w",@Date)   
END
END 
--Print 'FinalDate'
--Print @Date  
Return @Date
END
--Select dbo.WF_PlanFinishDateArrival('21-Sep-2017',3,'F')
