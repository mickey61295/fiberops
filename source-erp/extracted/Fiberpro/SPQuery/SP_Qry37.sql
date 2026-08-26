/*;=============================================   
; Author           :  Global Software's    
; Create date      :  03/11/2023    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  03/11/2023 10.00 AM 
; =============================================  */  
 
CREATE PROCEDURE SP_Qry37 (@Ordid int) as 
 select Count(Distinct x.StyleNo) from (select  Styleno, isnull(avg(Trs_ProdBillDetNew.rate),0)  as avgrate, isnull( (Trs_ProdBillDetNew.ThisBillQty),0) as qty ,isnull((Trs_ProdBillDetNew.rate*Sum(Trs_ProdBillDetNew.ThisBillQty)),0) as amt ,Trs_ProdBillDetNew.id,Mas_JobWrkComp.WorkComplDet,Mas_JobWrkComp.Id as stageid,Trs_ProdBillDetNew.Ordid as ordid from Trs_ProdBillDetNew inner join Mas_JobWrkComp on Mas_JobWrkComp.id=Trs_ProdBillDetNew.StageID where Trs_ProdBillDetNew.Ordid=@Ordid and Rework = 0 group by Trs_ProdBillDetNew.rate,Trs_ProdBillDetNew.ThisBillQty,Trs_ProdBillDetNew.id,Mas_JobWrkComp.WorkComplDet,Mas_JobWrkComp.Id,Trs_ProdBillDetNew.Ordid,Styleno   Union All  Select Trs_ProdShiftWages.Styleno,0 as avgrate, 0 as qty, sum(Trs_ProdShiftWages.ShiftWages) AS amt, 1 as id , WorkComplDet, Trs_ProdShiftWages.StageId,Trs_ProdShiftWages.OrdId From Trs_ProdShiftWages Inner Join Mas_JobWrkComp On Trs_ProdShiftWages.StageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId  Inner Join Prod_Sequence on Prod_Sequence.OrdId=Trs_ProdShiftWages.OrdId and Prod_Sequence.StyleNo =Trs_ProdShiftWages.StyleNo and  Prod_Sequence.stageid=Mas_JobWrkComp.Id  Where Trs_ProdShiftWages.OrdId =@Ordid group by Trs_ProdShiftWages.ordid,WorkComplDet,Trs_ProdShiftWages.StageId,Trs_ProdShiftWages.Styleno )X where X.Ordid=@Ordid