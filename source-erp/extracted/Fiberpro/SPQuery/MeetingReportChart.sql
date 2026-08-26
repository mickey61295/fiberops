/*
;=============================================
; Author			:		Global Software's
; Create date		:		18/01/2014
; Create By			:		Nithya
; Description		:		Procedure for chart that shows about started and ended of each department 
; Change Person		:		Nithya
; Last Change Date	:		18/01/2014
; =============================================	*/
--------------------------------------------------------------------------------------------        
--***        MeetingReportChart       ***---------------------------------------------        
--***        Procedure for chart that shows about started and ended of each department        
--***        Parameters               ***---------------------------------------------        
--           @DeptId - Department ID        
        
--------------------------------------------------------------------------------------------        
--18/01/14   Nithya                   -- Created for chart control to display in percentage        
--------------------------------------------------------------------------------------------        
CREATE PROC [dbo].[MeetingReportChart] (@DeptID INT) AS        
BEGIN        
DECLARE @CurDate Date,@StartTotal int,@EndTotal int        
DECLARE @OnTimeStarted int,@DelayedStarted int,@DelayedNotStarted int        
DECLARE @OnTimeEnded int,@DelayedEnded int,@DelayedNotEnded int        
        
SET NOCOUNT OFF;        
SELECT @CurDate=CONVERT(DATE,GETDATE()-1)       
--SELECT @CurDate=@currDate        
        
CREATE TABLE #TempOrderChart (DeptID INT,OnTimeSt INT,DelayedSt INT,NotSt INT,OntimeEnd INT,DelayedEnd INT,NotEnd INT)        
        
    SELECT TS.OrdId,        
           TS.DeptId,        
           TS.PlanStart,        
           TS.PlanFinish,        
           TS.ActStart,        
           TS.ActFinish         
        INTO #TempSchedule         
        FROM trs_schedule TS         
        INNER JOIN OrderMas AS OM         
        ON TS.OrdId = OM.OrdId         
        WHERE ISNULL(TS.PlanStart,'')<>'' AND ISNULL(TS.Planfinish,'')<>'' AND OM.Completed=0 AND TS.DeptID=@DeptID         
            
                      
        SELECT @OnTimeStarted=ISNULL(COUNT(OrdId),0) FROM #TempSchedule TS         
               WHERE ISNULL(TS.ActStart,'')<>'' AND ISNULL(TS.ActFinish,'')='' AND         
               TS.PlanStart=@CurDate AND       
               TS.ActStart<=TS.PlanStart        
        SELECT @DelayedStarted=ISNULL(COUNT(OrdId),0) FROM #TempSchedule TS         
               WHERE --ISNULL(TS.ActStart,'')<>'' AND  -- comment actstart if curdate is compared      
               ISNULL(TS.ActFinish,'')='' AND       
               TS.PlanStart<TS.ActStart AND      
               TS.ActStart=@CurDate AND       
               TS.Planfinish>=@CurDate         
        SELECT @DelayedNotStarted=ISNULL(COUNT(OrdId),0) FROM #TempSchedule TS WHERE         
              ISNULL(TS.ActStart,'')='' AND TS.Planfinish<@CurDate         
                      
         SELECT @OnTimeEnded=ISNULL(COUNT(OrdId),0) FROM #TempSchedule TS         
               WHERE ISNULL(TS.ActFinish,'')<>'' AND         
               TS.Planfinish=@CurDate AND       
               TS.ActFinish<=TS.Planfinish         
        SELECT @DelayedEnded=ISNULL(COUNT(OrdId),0) FROM #TempSchedule TS         
               WHERE --ISNULL(TS.ActFinish,'')<>'' AND                 -- comment actfinish if curdate is compared      
               TS.ActFinish=@CurDate AND       
               TS.ActFinish>TS.Planfinish         
        SELECT @DelayedNotEnded=ISNULL(COUNT(OrdId),0) FROM #TempSchedule TS         
               WHERE ISNULL(TS.ActStart,'')<>'' AND ISNULL(TS.ActFinish,'')='' AND         
               TS.Planfinish<@CurDate         
          
        INSERT INTO #TempOrderChart (DeptID) VALUES (@DeptID)  
                
        SELECT @StartTotal=@OnTimeStarted +@DelayedStarted +@DelayedNotStarted         
        SELECT @EndTotal=@OnTimeEnded +@DelayedEnded +@DelayedNotEnded        
          
                
                             
        IF (@StartTotal>0)        
        BEGIN  
            SET @OnTimeStarted=dbo.FN_MeetingReportAverage(@StartTotal,@OnTimeStarted)        
            SET @DelayedStarted=dbo.FN_MeetingReportAverage(@StartTotal,@DelayedStarted)  
            SET @DelayedNotStarted=dbo.FN_MeetingReportAverage(@StartTotal,@DelayedNotStarted)  
        END  
          
            UPDATE #TempOrderChart SET OnTimeSt= @OnTimeStarted,        
                           DelayedSt=@DelayedStarted,  
                           NotSt=@DelayedNotStarted  
              
              
        IF (@EndTotal>0)       
        BEGIN  
            SET @OnTimeEnded=dbo.FN_MeetingReportAverage(@EndTotal,@OnTimeEnded)        
            SET @DelayedEnded=dbo.FN_MeetingReportAverage(@EndTotal,@DelayedEnded)  
            SET @DelayedNotEnded=dbo.FN_MeetingReportAverage(@EndTotal,@DelayedNotEnded)  
        END   
            UPDATE #TempOrderChart SET OntimeEnd=@OnTimeEnded,  
                            DelayedEnd=@DelayedEnded,  
                            NotEnd=@DelayedNotEnded    
               
                                   
        SELECT DeptID,OnTimeSt,DelayedSt,NotSt,OntimeEnd,DelayedEnd,NotEnd FROM #TempOrderChart        
          
   SET NOCOUNT ON;        
END  

