/*                  
;=============================================                  
; Author  :  Global Software's                  
; Create date  :  25/DEC/2024                  
; Create By  :  ASLAM                  
; Description  :  Stored Procedure for Commando-Dept wise completion
; Change Person  :  ASLAM                
; Last Change Date :  25/Dec/2024 10.20 AM                  
; =============================================   */  

CREATE VIEW Vue_Reqd_Vs_Finish AS 

 SELECT Mas_Dept.DeptID, Mas_Dept.OrderSno,Mas_Dept.DeptName As Dept,Round(Sum(ReqKgs),2) as ReqKgs, Round(Sum(ReqMtr),2) As ReqMtrs,IsNull(sum(POKgs),0) as POKgs,IsNull(sum(POMtr),0) as POMtr,IsNull(Sum(DCKgs),0) as DCKgs, IsNull(Sum(DCMtr),0) as DCMtr,IsNull(Sum(TransOutKgs),0) as TransOutKgs,IsNull(Sum(TransOutMtr),0) as TransOutMtrs,IsNull(Sum(TransInKgs),0) as TransInKgs,IsNull(Sum(TransInMtr),0) as TransInMtrs,IsNull(Sum(ReturnKgs),0) as ReturnKgs,IsNull(Sum(ReturnMtrs),0) as ReturnMtr,IsNull(Sum(GRNKgs),0) as GRNKgs,IsNull(Sum(GRNMtr),0) as GRNMtr,IsNull(Sum(PRog_CompKgs),0) as Prog_CompKgs,IsNull(Sum(PRog_CompMtr),0) as Prog_CompMtrs,IsNull(Sum(CancelKgs),0) as CancelKgs,IsNull(Sum(CancelMtr),0) as CancelMtr ,Vue_ST_ProgBalance_FabricDet.Ordid,
 
sum( (isnull(Reqkgs,0) + isNull(ShortKgs,0)) - ( isnull(GRNKgs,0) + IsNull(Prog_CompKgs,0) + IsNull(TransInKgs,0) + isNUll(ReturnKgs,0) - isnull(TransOutKgs,0) ) )as req_balance_kgs,

Sum((isnull(ReqMtr,0) + isNull(ShortMtr,0)) - ( isnull(GRNMtr,0) + IsNull(Prog_CompMtr,0) + IsNull(TransInMtr,0) + isNUll(ReturnMtrs,0) - isnull(TransOutMtr,0) ) ) as Req_balance_Mtr,

sum( ( isnull(GRNKgs,0) + IsNull(Prog_CompKgs,0) + IsNull(TransInKgs,0) + isNUll(ReturnKgs,0) - isnull(TransOutKgs,0) ) )as finished_kgs,

Sum( ( isnull(GRNMtr,0) + IsNull(Prog_CompMtr,0) + IsNull(TransInMtr,0) + isNUll(ReturnMtrs,0) - isnull(TransOutMtr,0) ) ) as finished_mtrs

 
  from Vue_ST_ProgBalance_FabricDet inner Join OrderMas On OrderMas.Ordid=Vue_ST_ProgBalance_FabricDet.Ordid left join Mas_Dept On Vue_ST_ProgBalance_FabricDet.Deptid=Mas_Dept.Deptid Left join Mas_Fabric on Mas_Fabric.FabID=Vue_ST_ProgBalance_FabricDet.FabId left Join Mas_UOM on Mas_UOM.UomID=Mas_Fabric.PriUomID Where OrderMas.Completed=0  Group By Mas_Dept.OrderSno,Mas_Dept.DeptName,Vue_ST_ProgBalance_FabricDet.Ordid,Mas_Dept.DeptID
 
 UNION ALL 
 
 Select Mas_Dept.DeptID,Mas_Dept.OrderSno,Mas_Dept.DeptName As Dept,Round(Sum(ReqKgs),2)  As ReqKgs, 0 as ReqMtrs, Sum(PoKgs)  As PoKgs,0 as POMtr,Case When Sum(PoKgs) >0  then 0 ELSE Sum(DCKgs) END  As DCKgs,0 as DCMtr,Sum(TransOutKgs) as TransOutKgs,0 as TransOutMtrs,Sum(TransInKgs) as TransInKgs, 0 as TransInMtrs,SUM(ReturnKgs) As ReturnKgs,0 as ReturnMtr, Sum(GRNKgs)  As GRNKgs,0 as GRNMtr,IsNull(Sum(PRog_CompKgs),0) as Prog_CompKgs,0 as Prog_CompMtrs,0 as CancelKgs,0 as CancelMtr,
 
 Vue_ST_ProgBalance_YarnDet.Ordid,
 Sum((isnull(Reqkgs,0) + isNull(ShortKgs,0)) - ( isnull(GRNKgs,0) + IsNull(TransInKgs,0) + IsNull(Prog_CompKgs,0) + isNUll(ReturnKgs,0) - isnull(TransOutKgs,0) )) as req_balance_kgs ,0 as Req_balance_Mtr,
 Sum( ( isnull(GRNKgs,0) + IsNull(TransInKgs,0) + IsNull(Prog_CompKgs,0) + isNUll(ReturnKgs,0) - isnull(TransOutKgs,0) )) as finished_kgs, 0 as finished_mtrs

  from Vue_ST_ProgBalance_YarnDet inner Join OrderMas On OrderMas.Ordid=Vue_ST_ProgBalance_YarnDet.Ordid left join Mas_Dept On Vue_ST_ProgBalance_YarnDet.Deptid=Mas_Dept.Deptid Left join Mas_Count on Mas_Count.CountID=Vue_ST_ProgBalance_YarnDet.CountId  Where OrderMas.Completed=0 Group By Mas_Dept.DeptID,Mas_Dept.OrderSno,Mas_Dept.DeptName,Vue_ST_ProgBalance_YarnDet.Ordid
