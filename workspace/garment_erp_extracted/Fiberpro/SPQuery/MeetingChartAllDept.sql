/*    
;=============================================    

; Author   :  Global Software's    

; Create date  :  08/11/2013    

; Create By   :  Radhakrishnan.R    

; Description  :  Budget Vs Actual  (or) Over All Consolidation    

; Change Person  :  Vishnu   

; Last Change Date :  05/04/2017 10.30 AM

; =============================================     */
--------------------------------------------------------------------------------------------        
--***        MeetingChartAllDept       ***---------------------------------------------        
--***        Procedure for showing yesterday's status of process of all department       
--***        Parameters               ***---------------------------------------------        
--           @StartEnd  - (S  - Started, E - Ended)        
        
--------------------------------------------------------------------------------------------        
--01/02/14   Nithya                   -- Created for chart control to display in percentage        
--------------------------------------------------------------------------------------------     

CREATE PROC [dbo].[MeetingChartAllDept](@StartEnd VARCHAR(1)) AS
BEGIN

DECLARE @CurDate Date    
SELECT @CurDate=CONVERT(DATE,GETDATE()-1)      

SET NOCOUNT OFF;        

CREATE TABLE #TempOrderChart (DeptID INT,OnTimeSt INT,DelayedSt INT,NotSt INT,OntimeEnd INT,DelayedEnd INT,NotEnd INT)        

DECLARE @TempDeptData TABLE (DeptID INT,OnTime INT,Delayed INT,NotDone INT)  
DECLARE @TempDeptChart TABLE (DeptID INT,OnTime INT,Delayed INT,NotDone INT)  

--CREATE TABLE @TempDeptData (DeptID INT,OnTime INT,Delayed INT,NotDone INT,perc INT)  

SELECT TS.OrdId,        
       TS.DeptId,        
       TS.PlanStart,        
       TS.PlanFinish,        
       TS.ActStart,        
	   TS.ActFinish         
       INTO #TempSchedule FROM trs_schedule TS INNER JOIN OrderMas AS OM ON TS.OrdId = OM.OrdId         
       WHERE ISNULL(TS.PlanStart,'')<>'' AND ISNULL(TS.Planfinish,'')<>'' AND OM.Completed=0  

IF(@StartEnd='S')
BEGIN
    INSERT INTO @TempDeptData SELECT TS.DeptId,ISNULL(COUNT(TS.OrdId),0),0,0 FROM #TempSchedule TS         
           WHERE ISNULL(TS.ActStart,'')<>'' AND ISNULL(TS.ActFinish,'')='' AND         
           TS.PlanStart=@CurDate AND TS.ActStart<=TS.PlanStart GROUP BY TS.DeptId       

    INSERT INTO @TempDeptData SELECT TS.DeptId,0,ISNULL(COUNT(TS.OrdId),0),0 FROM #TempSchedule TS              
           WHERE --ISNULL(TS.ActStart,'')<>'' AND  -- comment actstart if curdate is compared      
           ISNULL(TS.ActFinish,'')='' AND TS.PlanStart<TS.ActStart AND      
           TS.ActStart=@CurDate AND TS.Planfinish>=@CurDate GROUP BY TS.DeptId              

    INSERT INTO @TempDeptData SELECT TS.DeptId,0,0,ISNULL(COUNT(TS.OrdId),0) FROM #TempSchedule TS
	       WHERE ISNULL(TS.ActStart,'')='' AND TS.Planfinish=@CurDate GROUP BY TS.DeptId         
		   
END

ELSE IF (@StartEnd='E')
BEGIN
    INSERT INTO @TempDeptData SELECT TS.DeptId,ISNULL(COUNT(TS.OrdId),0),0,0 FROM #TempSchedule TS       
           WHERE ISNULL(TS.ActFinish,'')<>'' AND         
           TS.Planfinish=@CurDate AND TS.ActFinish<=TS.Planfinish GROUP BY TS.DeptId            

    INSERT INTO @TempDeptData SELECT TS.DeptId,0,ISNULL(COUNT(TS.OrdId),0),0 FROM #TempSchedule TS     
           WHERE --ISNULL(TS.ActFinish,'')<>'' AND                 -- comment actfinish if curdate is compared      
           TS.ActFinish=@CurDate AND TS.ActFinish>TS.Planfinish GROUP BY TS.DeptId            
    
	INSERT INTO @TempDeptData SELECT TS.DeptId,0,0,ISNULL(COUNT(TS.OrdId),0) FROM #TempSchedule TS         
           WHERE ISNULL(TS.ActStart,'')<>'' AND ISNULL(TS.ActFinish,'')='' AND         
           TS.Planfinish=@CurDate GROUP BY TS.DeptId     
END
      
	 -- select * from @TempDeptData
       INSERT INTO @TempDeptChart SELECT DISTINCT TD.DeptId,0,0,0 FROM @TempDeptData TD     

	    UPDATE TC SET TC.OnTime=ISNULL((SELECT TD.OnTime FROM @TempDeptData TD WHERE TC.DeptID=TD.DeptID AND TD.OnTime>0),0),
		       TC.Delayed=ISNULL((SELECT TD.Delayed FROM @TempDeptData TD WHERE TC.DeptID=TD.DeptID AND TD.Delayed>0),0),
			   TC.NotDone=ISNULL((SELECT TD.NotDone FROM @TempDeptData TD WHERE TC.DeptID=TD.DeptID AND TD.NotDone>0),0)
		         FROM @TempDeptChart TC

		 
	  

       UPDATE TT SET OnTime=dbo.FN_MeetingReportAverage(OnTime+Delayed+NotDone,OnTime),
				  Delayed=dbo.FN_MeetingReportAverage(OnTime+Delayed+NotDone,Delayed),
				  NotDone=dbo.FN_MeetingReportAverage(OnTime+Delayed+NotDone,NotDone)
              FROM @TempDeptChart TT


    SELECT TT.DeptID,
	       MD.ShortDept,
		   TT.OnTime, TT.Delayed, TT.NotDone 
		   FROM @TempDeptChart TT LEFT JOIN Mas_Dept MD ON TT.DeptID=MD.DeptID
	       

		  
SET NOCOUNT ON;        

END

