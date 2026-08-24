 /*                  

;=============================================                  
; Author  :  Global Software's                  
; Create date  :  13/Oct/2015                  
; Create By  :  ASLAM                  
; Description  :  Stored Procedure for Unit wise Daily P & L                
; Change Person  :  ASLAM                
; Last Change Date :  09/Ap/2020 04.00 PM                  
; =============================================   */                   
ALTER PROCEDURE Sp_DailyUnitPANDL (@PLDate1 as Date)  as               
/* Below - Unitwise Daily P&L Posting */              
DECLARE @CurrentCnt as INT,@Total as INT,@StitchDeptCode as INT,@StitchStageID as INT           
DECLARE @SQL as Varchar(max)
DECLARE @TotalStyleQty as int
DECLARE @SIZEWISE_BUDGET AS CHAR(1)
SELECT @StitchStageID  = 0 /*IsNull(Stitching_StageID,0) FROM Options_FM Where isNull(Stitching_StageId,0) > 0      */
SELECT @CurrentCnt = 0          
SELECT @Total = 0          
    
SELECT @SIZEWISE_BUDGET = IsNull(BudRT_CMT_SizeWise,'N') from Options 

if @Total = @CurrentCnt           
BEGIN           
 declare @Postdate as date          


/* Daily Unit P And L Posting Starts Here ...*/
 --DELETE FROM DailyUnit_P_and_L  WHERE PLDATE= Cast( DateAdd("d",-1,Getdate()) as Date)          
 --Select @Postdate = Cast( DateAdd("d",-1,Getdate()) as Date)          
  --Select @Postdate = cast('10-SEP-2016' as date)  
  DELETE FROM DailyUnit_P_and_L  WHERE PLDATE= @PLDate1
  Select @Postdate = cast(@pldate1 as date)
   

 /*Insert into DailyUnit_P_and_L (Coycode,PLDate,Ordid,StyleNo,PartId,StageId,ProdQty,BudgetRate,BudgetValue,Admin_BudgetValue) Select  Coycode,ProdDate,Ordid,Styleno,0,StageId,IsNull(Sum(ProdQty),0) as ProdPcs, IsNull(Avg(BudgetCostPerPcs),0) as BudgetCostPerPcs,  (IsNull(Avg(BudgetCostPerPcs),0) * IsNull(Sum(ProdQty),0)) as BudgetValue,(IsNull(Avg(BudgetValue),0) * IsNull(Sum(ProdQty),0))  as AdminBudgetValue    

 ---- From Trs_HourlyProduction Where Cast(ProdDate as Date)=@Postdate Group by  Coycode,ProdDate,Ordid,Styleno,PartID,StageId              */

 IF @SIZEWISE_BUDGET = 'Y' 
 BEGIN
  Insert into DailyUnit_P_and_L (Coycode,PLDate,Ordid,StyleNo,PartId,StageId,Shift_ProdQty,Contractor_Prod_Pcs,BudgetRate,BudgetValue,Contractor_Actual_Wages,JobWrk_Pcs,
  JobWrk_ActualAmt) 

  Select X.Coyid,X.ProdDate,X.Ordid,X.Styleno,x.PartId,X.StageId,Sum(X.ProdPcs) as ProdPcs,Sum(x.Contractor_Prod_Pcs) as Contractor_Prod_Pcs,BudgetCostPerPcs as BudgetCostPerPcs,Sum(BudgetValue) as BudgetValue, Sum(X.Contractor_Actual_Wages) as Contractor_Actual_Wages,Sum(X.JobWrk_Prod_Pcs) as JobWrk_Prod_Pcs ,Sum(Jobwrk_ActualAmt) as Jobwrk_ActualAmt FROM (

  Select  A.CoyID,Dt as ProdDate,A.Ordid,A.Styleno,A.PartId,B.SizId,StageId,IsNull(Sum(ProdPcs),0) as ProdPcs, 0 as Contractor_Prod_Pcs,0 as JobWrk_Prod_Pcs, c.Rate as BudgetCostPerPcs,  IsNull(Sum(ProdPcs),0) * C.Rate  as BudgetValue,0 as Contractor_Actual_Wages
,0 as Jobwrk_ActualAmt    
  From Trs_ProdEntry A INNER JOIN TRs_ProdEntryQty B ON A.Id = B.ID INNER JOIN Mas_Emp ON A.EmpId = Mas_Emp.ID
  INNER JOIN (Select Distinct Ordid,Styleno,PartId,SizeID,Rate_Pcs as Rate,NWork as WrkID From Bud_InhRateclw )C ON A.Ordid = C.OrdID And A.StyleNo = C.Styleno And A.PARTID = C.PartID and A.StageID = C.WrkID  and B.SizId = C.SizeId
   Where Cast(Dt as Date)=@Postdate and IsNull(Shift_Pcs,'S')='S' Group by  A.coyid,dt,A.Ordid,A.Styleno,A.PartID,StageId,B.Sizid,C.Rate  
          
Union
Select  A.CoyID,Dt as ProdDate,A.Ordid,A.Styleno,A.PartId,StageId,B.SizID,0 as ProdPcs, IsNull(Sum(ProdPcs),0) as Contractor_Prod_Pcs,0 as JobWrk_Prod_Pcs,c.Rate as BudgetCostPerPcs,  IsNull(Sum(ProdPcs),0)  * isnull(C.Rate,0)  as BudgetValue, IsNull(Sum(ProdPcs)
,0)  * 0 as Contractor_Actual_Wages ,0 as Jobwrk_ActualAmt
  From Trs_ProdEntry A INNER JOIN TRs_ProdEntryQty B ON A.Id = B.ID INNER JOIN Mas_Emp ON A.EmpId = Mas_Emp.ID
  INNER JOIN (Select Distinct Ordid,Styleno,PartId,SizeID,NWork as WrkID,Rate_Pcs as Rate From Bud_InhRateclw )C ON A.Ordid = C.OrdID And A.StyleNo = C.Styleno And A.PARTID = C.PartID and A.StageID = C.WrkID and B.SizId = C.SizeId
   Where Cast(Dt as Date)=@Postdate and IsNull(Shift_Pcs,'S')='P' Group by  A.coyid,dt,A.Ordid,A.Styleno,A.PartID,StageId,isnull(Pcs_Rate,0),b.SizID,C.Rate 
Union
Select  A.Coycode,Dt as ProdDate,A.OrdJob as ordid ,B.Styleno ,B.PartId,B.SizID,TargetStageID,0 as ProdPcs, 0 as Contractor_Prod_Pcs, IsNull(Sum(RecPcs),0) as JobWrk_Prod_Pcs,c.JobWrkRate as BudgetCostPerPcs,  IsNull(Sum(RecPcs),0)  * isnull(C.JobWrkRate,0)  as 
BudgetValue, 0 as Contractor_Actual_Wages ,IsNull(Sum(RecPcs),0)  * 0 as Jobwrk_ActualAmt
  From Trs_PcsGrn1 A INNER JOIN Trs_PcsGrn2 B ON A.Id = B.ID INNER JOIN (Select Distinct Ordid,Styleno,PartId,SizeID,NWork as WrkID,Rate_Pcs as JobWrkRate From Bud_InhRateclw )C ON A.OrdJob = C.OrdID And B.StyleNo = C.Styleno And B.PARTID = C.PartID and A.TargetStageID = C.WrkID and B.SizId = C.SizeId
   Where Cast(Dt as Date)=@Postdate and A.ReceiptType='Piece' Group by  A.coycode,dt,A.Ordjob,B.Styleno,B.PartID,TargetStageId,C.JobWrkRate ,B.SizId
    ) X
   Group by X.Coyid,X.ProdDate,X.Ordid,X.Styleno,x.PartId,X.StageId,BudgetCostPerPcs
 
 END
 ELSE
 BEGIN
  Insert into DailyUnit_P_and_L (Coycode,PLDate,Ordid,StyleNo,PartId,StageId,Shift_ProdQty,Contractor_Prod_Pcs,BudgetRate,BudgetValue,Contractor_Actual_Wages,JobWrk_Pcs,
  JobWrk_ActualAmt) 

  Select X.Coyid,X.ProdDate,X.Ordid,X.Styleno,x.PartId,X.StageId,Sum(X.ProdPcs) as ProdPcs,Sum(x.Contractor_Prod_Pcs) as Contractor_Prod_Pcs,BudgetCostPerPcs as BudgetCostPerPcs,Sum(BudgetValue) as BudgetValue, Sum(X.Contractor_Actual_Wages) as Contractor_Actual_Wages,Sum(X.JobWrk_Prod_Pcs) as JobWrk_Prod_Pcs ,Sum(Jobwrk_ActualAmt) as Jobwrk_ActualAmt FROM (
  Select  A.CoyID,Dt as ProdDate,A.Ordid,A.Styleno,A.PartId,StageId,IsNull(Sum(ProdPcs),0) as ProdPcs, 0 as Contractor_Prod_Pcs,0 as JobWrk_Prod_Pcs, c.Rate as BudgetCostPerPcs,  IsNull(Sum(ProdPcs),0) * C.Rate  as BudgetValue,0 as Contractor_Actual_Wages
,0 as Jobwrk_ActualAmt    
  From Trs_ProdEntry A INNER JOIN TRs_ProdEntryQty B ON A.Id = B.ID INNER JOIN Mas_Emp ON A.EmpId = Mas_Emp.ID
  INNER JOIN (Select Distinct Ordid,Styleno,PartId,Rate,WrkID From Pro_Prod_PartwiseRate )C ON A.Ordid = C.OrdID And A.StyleNo = C.Styleno And A.PARTID = C.PartID and A.StageID = C.WrkID 
   Where Cast(Dt as Date)=@Postdate and IsNull(Shift_Pcs,'S')='S' Group by  A.coyid,dt,A.Ordid,A.Styleno,A.PartID,StageId,C.Rate         
Union
Select  A.CoyID,Dt as ProdDate,A.Ordid,A.Styleno,A.PartId,StageId,0 as ProdPcs, IsNull(Sum(ProdPcs),0) as Contractor_Prod_Pcs,0 as JobWrk_Prod_Pcs,c.Rate as BudgetCostPerPcs,  IsNull(Sum(ProdPcs),0)  * isnull(C.Rate,0)  as BudgetValue, IsNull(Sum(ProdPcs)
,0)  * 0 as Contractor_Actual_Wages ,0 as Jobwrk_ActualAmt
  From Trs_ProdEntry A INNER JOIN TRs_ProdEntryQty B ON A.Id = B.ID INNER JOIN Mas_Emp ON A.EmpId = Mas_Emp.ID
  INNER JOIN (Select Distinct Ordid,Styleno,PartId,WrkID,Rate From Pro_Prod_PartwiseRate )C ON A.Ordid = C.OrdID And A.StyleNo = C.Styleno And A.PARTID = C.PartID and A.StageID = C.WrkID 
   Where Cast(Dt as Date)=@Postdate and IsNull(Shift_Pcs,'S')='P' Group by  A.coyid,dt,A.Ordid,A.Styleno,A.PartID,StageId,isnull(Pcs_Rate,0),C.Rate 
Union
Select  A.Coycode,Dt as ProdDate,A.OrdJob as ordid ,B.Styleno ,B.PartId,TargetStageID,0 as ProdPcs, 0 as Contractor_Prod_Pcs, IsNull(Sum(RecPcs),0) as JobWrk_Prod_Pcs,c.JobWrkRate as BudgetCostPerPcs,  IsNull(Sum(RecPcs),0)  * isnull(C.JobWrkRate,0)  as 
BudgetValue, 0 as Contractor_Actual_Wages ,IsNull(Sum(RecPcs),0)  * 0 as Jobwrk_ActualAmt
  From Trs_PcsGrn1 A INNER JOIN Trs_PcsGrn2 B ON A.Id = B.ID INNER JOIN (Select Distinct Ordid,Styleno,PartId,WrkID,JobWrkRate From Pro_Prod_PartwiseRate )C ON A.OrdJob = C.OrdID And B.StyleNo = C.Styleno And B.PARTID = C.PartID and A.TargetStageID = C.WrkID 
   Where Cast(Dt as Date)=@Postdate and A.ReceiptType='Piece' Group by  A.coycode,dt,A.Ordjob,B.Styleno,B.PartID,TargetStageId,C.JobWrkRate 
    ) X
   Group by X.Coyid,X.ProdDate,X.Ordid,X.Styleno,x.PartId,X.StageId,BudgetCostPerPcs
 
 END
   



/*Update DPL SET BudgetValue  = IsNull(BudgetRate,0) * isnull(Y.OrderQty,0)  From DailyUnit_P_and_L DPL  INNER JOIN  (Select DISTINCT Ordid,StyleNo,PartID,Sum(OrderQty) as OrderQty From OrderQtyDtl Group by Ordid,Styleno,PartID ) Y    ON  DPL.Ordid = Y.OrdID And Dpl.Styleno = Y.StyleNo And DPL.PartId = Y.PartID Where PLDate = @Postdate */

     

Update DPL SET Shift_ActualWages  = IsNull(D.ActualWages,0) ,Actual_AddlAmount = IsNull(D.AddlAmt,0) From DailyUnit_P_and_L DPL INNER JOIN   

( SELECT TPS.coycode,TPS.Ordid,TPS.Styleno,TPS.PartID,TPS.StageId,TPS.EntryDate,sum(ShiftWages) as ActualWages,isNull(Sum(Addl_Amount),0)  as AddlAmt From Trs_ProdWages TPS WHERE EntryDate = @Postdate GROUP BY TPS.coycode,TPS.Ordid,TPS.Styleno,            

TPS.StageId,TPS.EntryDate,TPS.PartID )  D ON DPL.Coycode = D.COYCODE AND DPL.Ordid = D.ORDID  AND DPL.Styleno = D.StyleNo AND DPL.StageID = D.StageId AND DPL.PartId = D.PartId   Where PLDate = @Postdate  /*CAST(GetDate() as Date)    */          


Update DailyUnit_P_And_L SET BudgetOverheadAmt = (IsNull(BudgetValue,0) * IsNull(X.ProdOverheads,0) /100) From DailyUnit_P_And_L  INNER JOIN (Select Ordid ,IsNull(ProdOverheads,0) ProdOverheads From  OrderMas2 ) X ON  DailyUnit_P_And_L.OrdId = X.OrdId Where PLDate = @Postdate   



/* Prod. bill Entry */
Update DPL SET Contractor_Actual_Wages  = IsNull(D.Contractor_Actual_Wages,0) ,Actual_AddlAmount = IsNull(D.AddlAmt,0) From DailyUnit_P_and_L DPL INNER JOIN   

( SELECT A.coycode,B.Ordid,B.Styleno,B.PartID,B.StageId,A.brdt,sum(B.Amount) as Contractor_Actual_Wages,0  as AddlAmt From Trs_ProdBillMasNew A INNER JOIN Trs_ProdBillDetNew B ON A.ID = B.ID  WHERE A.BrDt = @Postdate GROUP BY A.coycode,B.Ordid,B.Styleno,
B.StageId,A.BrDt,B.PartID )  D ON DPL.Coycode = D.COYCODE AND DPL.Ordid = D.ORDID  AND DPL.Styleno = D.StyleNo AND DPL.StageID = D.StageId AND DPL.PartId = D.PartId   Where PLDate = @Postdate 

/* Pcs form Delivery Receipt Bill Entry */
Update DPL SET Jobwrk_ActualAmt  = IsNull(D.Contractor_Actual_Wages,0) ,Actual_AddlAmount = IsNull(D.AddlAmt,0) From DailyUnit_P_and_L DPL INNER JOIN   

( SELECT A.coycode,B.Ordid,B.Styleno,B.PanelID as PartID,B.Dept as StageId,A.brdt,sum(B.Amount) as Contractor_Actual_Wages,0  as AddlAmt From Trs_Bills A INNER JOIN Trs_BillRate B ON A.ID = B.ID  WHERE A.BrDt = @Postdate GROUP BY A.coycode,B.Ordid,B.Styleno,
B.Dept,A.BrDt,B.PanelID )  D ON DPL.Coycode = D.COYCODE AND DPL.Ordid = D.ORDID  AND DPL.Styleno = D.StyleNo AND DPL.StageID = D.StageId AND DPL.PartId = D.PartId   Where PLDate = @Postdate 



Declare @OH_Percent Numeric(9,2)              
Declare @HolidayCount INT    
Declare @WeekoffCount INT    
Select @OH_Percent =  isnull(Budget_OverHead_Percent,10) From options              
    

/* Create a Abstract for Each Date - To calculate OverHeads */              

DELETE FROM DailyUnit_P_And_L_Abs WHERE PLDATE=@Postdate /* CAST(GetDate() as Date)    */          
     

/* Inserting Budget details*/          
Insert into DailyUnit_P_And_L_Abs (Coycode,PLDate,OverHead_Percent,Total_BudgetValue,Budget_Overhead_Value,Shift_Total_ActualValue,Admin_TotalBudgetValue,Shift_TotProdnQty,
Contractor_Total_Prod_Pcs,Contractor_Total_Actual_Wages,JobWrk_Total_Pcs,JobWrk_Total_ActualAmt) Select Coycode,PLDate,@OH_Percent,IsNull(Sum(BudgetValue),0) as BudgetValue, ((IsNull(Sum(BudgetValue),0)   * @OH_Percent)/100) as         
Budget_Overhead_Value,(IsNull(Sum(Shift_ActualWages),0) + IsNull(Sum(Actual_AddlAmount),0)) as Total_ActualValue,    
IsNull(Sum(Admin_BudgetValue),0) as Admin_TotalBudgetValue,IsNull(Sum(Shift_ProdQty),0) as ProdQty, isnull(Sum(Contractor_Prod_Pcs),0) as Contractor_Prod_Pcs,IsNull(Sum(Contractor_Actual_Wages),0) as Contractor_Actual_Wages ,isnull(sum(JobWrk_Pcs),0) as JobWrk_Pcs,IsNull(Sum(JobWrk_ActualAmt),0) as JobWrk_ActualAmt   From DailyUnit_P_and_L Where Cast(PLDate as Date)=@Postdate Group by Coycode,PlDate              
     

/* Updating Daily Expense details as OverHead*/          

      

Update DailyUnit_P_And_L_Abs SET ActualOverhead_Value = IsNull(X.OverHeadsAmt,0) From DailyUnit_P_And_L_Abs INNER JOIN (Select Coycode, EntryDate,IsNull(Sum(Amount),0) OverHeadsAmt From  Trs_DailyExpenseEntry Group by EntryDate,Coycode) X ON  DailyUnit_P_And_L_Abs.PLDate = X.EntryDate And DailyUnit_P_And_L_Abs.Coycode= X.Coycode  Where PLDate = @Postdate          



      DELETE FROM Trs_FixedExpensesDateWise WHERE DT = @PostDate

  INSERT INTO Trs_FixedExpensesDateWise SELECT @PostDate,coycode,ExpensesCode,PerMonthAmt,PerDayAmount from FixedExpenses_Entry 

/* Updating Fixed Expense details as OverHead*/          

Update DailyUnit_P_And_L_Abs SET ActualOverhead_Value = IsNull(ActualOverhead_Value,0) + IsNull(X.OverHeadsAmt,0) From DailyUnit_P_And_L_Abs INNER JOIN (Select coycode,IsNull(Sum(PerDayAmt),0) OverHeadsAmt From Trs_FixedExpensesDateWise WHERE DT =@Postdate Group by coycode) X ON  DailyUnit_P_And_L_Abs.Coycode = X.Coycode        
     

/* Updating GENERAL Employee Assignement - Wage details as OverHead 
     

Update DailyUnit_P_And_L_Abs Set ActualOverhead_Value = IsNull(ActualOverhead_Value,0) + ISNULL( X.Wage,0) FROM DailyUnit_P_And_L_Abs INNER JOIN ( Select A.Coycode,ProdDAte,IsNull(SUM(wage),0) as Wage from Trs_DailyWagePosting A INNER JOIN Trs_EmployeeAssignment B ON  A.EmpId = B.Empcode Where B.Deptcode =-5 and IsNull(General_AssignDeptCode,0) = -5 group by A.Coycode,ProdDate) X ON  DailyUnit_P_And_L_Abs.Coycode = X.Coycode  and DailyUnit_P_And_L_Abs.PLDate = X.ProdDate    */          

Update DailyUnit_P_And_L_Abs SET Actual_OverHead_Percent = Case When IsNull(Shift_Total_ActualValue,0) > 0 then (isnull(ActualOverhead_Value,0) / (isnull(Shift_Total_ActualValue,0) + isnull(Contractor_Total_Actual_Wages,0) ))*100 Else 0 END Where PLDate = @Postdate   

  SELECT @HolidayCount = Count(*) From GovtHolidays Where GHDAte=@PostDate    
  SELECT @WeekoffCount = Count(Distinct Weekoff) From Options Where Weekoff = (Select DatePart("w",@PostDate))    
      
Declare @TotalActualWages Numeric(18,2) /*Shift Basis Wages */             
Declare @Contractor_TotalActualWages Numeric(18,2)              
Declare @TotalActual_OverHeadAmt Numeric(18,2)              
     

/*  Updation of OverHeads for each stage */              

Declare @PLDate DateTime,@Coycode1 int              
Declare @Tmp Numeric(18,2)              
DECLARE OH_CURSOR CURSOR FOR                
   Select coycode,PLDate FROM DailyUnit_P_And_L_ABS  Where PLDate=@Postdate          
   OPEN OH_CURSOR;                
   FETCH NEXT FROM OH_CURSOR INTO @Coycode1,@PLDate;                
   WHILE @@FETCH_STATUS = 0                
   BEGIN              
   Select @TotalActualWages = 0               
   Select @TotalActual_OverHeadAmt = 0              
   Select @TotalActualWages = IsNull(Shift_Total_ActualValue,0) From DailyUnit_P_And_L_Abs               
   Select @Contractor_TotalActualWages = IsNull(Contractor_Total_Actual_Wages,0) From DailyUnit_P_And_L_Abs               
   Where PLDate =@PLDate and Coycode=@Coycode1          
   Select @TotalActual_OverHeadAmt = IsNull(ActualOverHead_Value,0) From DailyUnit_P_And_L_Abs Where PLDate = @PLDate And Coycode = @Coycode1         
   print @TotalActualWages
   Print @Contractor_TotalActualWages
   Print @TotalActual_OverHeadAmt
 if( @TotalActualWages + @Contractor_TotalActualWages)>0               
 Begin              
  Update DailyUnit_P_And_L SET OverHeads = isNull(OverHeads,0) + (@TotalActual_OverHeadAmt / (@TotalActualWages + @Contractor_TotalActualWages)) * (isnull(Shift_ActualWages,0) + ISNull(Contractor_Actual_Wages,0) + ISNULL(Actual_AddlAmount,0))   Where  PLDate = @PLDate  and Coycode =@coycode1              

 End              
    

  FETCH NEXT FROM OH_CURSOR INTO @Coycode1,@PLDate;              
  END;                
  CLOSE OH_CURSOR;                
  DEALLOCATE OH_CURSOR;                
 
  
  /* Update the Order Style Qty */

  Update DailyUnit_P_And_L SET TotalStyleQty = IsNull(X.CutPlanQty,0) From DailyUnit_P_And_L INNER JOIN (Select Ordid, Styleno,IsNull(Sum(CutPlanQty),0) CutPlanQty From  OrderQtyDtl Group by Ordid,StyleNo) X ON  DailyUnit_P_And_L.OrdId = X.OrdID And DailyUnit_P_And_L.StyleNo= X.StyleNo  Where PLDate = @Postdate  

  -- Stylewise Expense Entry Updation

  Update DailyUnit_P_And_L SET OverHeads =  Case When TotalStyleQty > 0 then IsNull(X.StyleOHAmt,0) / TotalStyleQty * (isNull(Shift_ProdQty,0) + isNull(Contractor_Prod_Pcs,0) + isNull(JobWrk_Pcs,0)) ELSE 0 End From DailyUnit_P_And_L  INNER JOIN (Select Ordid, Styleno,IsNull(Sum(Cost),0) StyleOHAmt From  Trs_StylewiseSingleExpense Group by OrdID,StyleNo) X ON  DailyUnit_P_And_L.Ordid = X.Ordid And DailyUnit_P_And_L.Styleno= X.StyleNo  Where PLDate = @Postdate  



  Update DailyUnit_P_And_L SET Actual_OverHead_Percent = Case When (IsNull((Shift_ActualWages),0) + + isnull(Contractor_Actual_Wages,0)) > 0 then (OverHeads)/ ((isnull(Shift_ActualWages,0)) + isnull((Contractor_Actual_Wages),0) )*100 Else 0 END Where PLDate = @PLDate 

 

  SET NOCOUNT OFF                 
      

END          

ELSE          

PRINT 'DATA CORRUPTED(DELETED)'          

--Exec Sp_DailyUnitPANDL '11-Mar-2020'     


 