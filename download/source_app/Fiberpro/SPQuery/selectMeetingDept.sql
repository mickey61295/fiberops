/*
;=============================================
; Author			:		Global Software's
; Create date		:		18/01/2014
; Create By			:		Nithya
; Description		:		Procedure for chart that shows about started and ended of each department 
; Change Person		:		Nithya
; Last Change Date	:		18/01/2014
; =============================================	*/

CREATE PROC [dbo].[selectMeetingDept] AS  
BEGIN  
DECLARE @CurDate Date  
DECLARE @TempDept table (DeptID int, DeptName varchar(50))  
DECLARE @TempSchedule table (DeptID int, DeptName varchar(50),ORDID int,PlanStart DATE,Planfinish DATE,ActStart DATE,ActFinish DATE)  
  
SET NOCOUNT OFF;     
  
SELECT @CurDate=CONVERT(DATE,GETDATE()-1)   
  
        INSERT INTO @TempSchedule  
        SELECT TS.DeptId,MD.DeptName,TS.OrdId,TS.PlanStart,TS.Planfinish,TS.ActStart,TS.ActFinish        
        FROM trs_schedule TS         
        LEFT JOIN OrderMas AS OM         
        ON TS.OrdId = OM.OrdId LEFT JOIN Mas_Dept MD ON TS.DeptId=MD.DeptID  
        WHERE ISNULL(TS.PlanStart,'')<>'' AND ISNULL(TS.Planfinish,'')<>'' AND OM.Completed=0       
            
        INSERT INTO @TempDept SELECT TS.DeptID,TS.DeptName FROM @TempSchedule TS         
               WHERE ISNULL(TS.ActStart,'')<>'' AND ISNULL(TS.ActFinish,'')='' AND         
               TS.PlanStart=@CurDate AND       
               TS.ActStart<=TS.PlanStart        
                 
        INSERT INTO @TempDept SELECT TS.DeptID,TS.DeptName FROM @TempSchedule TS        
               WHERE --ISNULL(TS.ActStart,'')<>'' AND  -- comment actstart if curdate is compared      
               ISNULL(TS.ActFinish,'')='' AND       
               TS.PlanStart<TS.ActStart AND      
               TS.ActStart=@CurDate AND       
               TS.Planfinish>=@CurDate     
                     
        INSERT INTO @TempDept SELECT TS.DeptID,TS.DeptName FROM @TempSchedule TS       
              WHERE ISNULL(TS.ActStart,'')='' AND TS.Planfinish<@CurDate         
               
         INSERT INTO @TempDept SELECT TS.DeptID,TS.DeptName FROM @TempSchedule TS              
               WHERE ISNULL(TS.ActFinish,'')<>'' AND         
               TS.Planfinish=@CurDate AND       
               TS.ActFinish<=TS.Planfinish  
                 
        INSERT INTO @TempDept SELECT TS.DeptID,TS.DeptName FROM @TempSchedule TS           
               WHERE --ISNULL(TS.ActFinish,'')<>'' AND                 -- comment actfinish if curdate is compared      
               TS.ActFinish=@CurDate AND       
               TS.ActFinish>TS.Planfinish       
                   
        INSERT INTO @TempDept SELECT TS.DeptID,TS.DeptName FROM @TempSchedule TS       
               WHERE ISNULL(TS.ActStart,'')<>'' AND ISNULL(TS.ActFinish,'')='' AND         
               TS.Planfinish<@CurDate     
                 
                 
        SELECT DISTINCT DeptID,DeptName from @TempDept      
   SET NOCOUNT ON;     
   END

