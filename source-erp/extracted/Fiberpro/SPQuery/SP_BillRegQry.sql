/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  28/11/2022 10.00 AM 
; =============================================  */  
CREATE PROCEDURE SP_BillRegQry (@Ordid nvarchar(max),@DeptId nvarchar(max),@Coycode int,@DeptName nVarchar(max),@tmpdeptID nvarchar(max))
AS
BEGIN DECLARE @SQLSTR AS NVARCHAR(Max) Set @SQLSTR=N'
SELECT DISTINCT TOP 100 PERCENT Mas_Party.Pname, Mas_Party.PID FROM  Trs_Bills INNER JOIN Trs_BillRate ON Trs_Bills.ID = Trs_BillRate.ID INNER JOIN Mas_Party ON Trs_Bills.party = Mas_Party.PId inner join Mas_Dept  on Mas_Dept.deptid=trs_billrate.Dept where Trs_Bills.Coycode=@Coycode and  Trs_BillRate.Ordid=@ORdId  and mas_dept.DeptID in(
(Select ID From fnSplitter(@DeptId))) and type<>''pp'' and Mas_Dept.Deptname in((Select ID From fnSplitter(@DeptName))) 
UNION  
SELECT DISTINCT  Mas_Party.Pname, Mas_Party.PID FROM  Trs_Bills INNER JOIN Trs_BillRate ON Trs_Bills.ID = Trs_BillRate.ID INNER JOIN Mas_Party ON Trs_Bills.party = Mas_Party.PId inner join Mas_JobWrkComp  on Mas_JobWrkComp.Id=trs_billrate.Dept INNER JOIN Mas_Dept ON Mas_Dept.DeptID=Mas_JobWrkComp.DeptId where Trs_Bills.Coycode=@Coycode and  Trs_BillRate.Ordid=@ORdId  and mas_dept.DeptID in((Select ID From fnSplitter(@tmpdeptID)))   and type=''pp'' and Mas_Dept.Deptname in((Select ID From fnSplitter(@DeptName))) UNION  SELECT DISTINCT    Mas_Party.Pname,Mas_Party.PID FROM ShippingBill A INNER JOIN ShippingBill_Det B ON A.ID = B.CID INNER JOIN Mas_Party ON A.Party = Mas_Party.PID inner join mas_dept  on mas_dept.DeptID=a.Dept where A.Coycode=@Coycode and  B.Ordid=@ORdId and mas_dept.DeptID in((Select ID From fnSplitter(@tmpdeptID))) and Mas_Dept.Deptname in((Select ID From fnSplitter(@DeptName))) UNION SELECT DISTINCT Mas_Emp.EmpName AS Pname,Mas_Emp.ID AS PID FROM Trs_ProdBillMasNew INNER JOIN Trs_ProdBillDetNew ON Trs_ProdBillMasNew.ID = Trs_ProdBillDetNew.ID LEFT JOIN Mas_Emp ON Trs_ProdBillMasNew.Empid = Mas_Emp.ID INNER JOIN Trs_BillRate ON Trs_BillRate.OrdID = Trs_ProdBillDetNew.Ordid inner join Mas_JobWrkComp on Mas_JobWrkComp.Id=Trs_ProdBillDetNew.StageID INNER JOIN Mas_Dept ON Mas_Dept.DeptID = Mas_JobWrkComp.DeptId where Trs_ProdBillMasNew.Coycode=@Coycode and Trs_ProdBillDetNew.Ordid=@ORdid and mas_dept.DeptID in((Select ID From fnSplitter(@tmpdeptID))) and Mas_Dept.Deptname in((Select ID From fnSplitter(@DeptName))) ORDER BY PNAME'  EXEC SP_EXECUTESQL @SQLSTR,N'@Ordid nvarchar(max),@DeptId nvarchar(max),@Coycode int,@DeptName nVarchar(max),@tmpdeptID nvarchar(max)',@Ordid=@Ordid,@DeptId=@DeptId,@Coycode=@Coycode,@DeptName=@DeptName,@tmpdeptID=@tmpdeptID End
