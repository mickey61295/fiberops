/*;=============================================   
; Author           :  Global Software's    
; Create date      :  21/12/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  27/12/2022 10.06 AM 
; =============================================  */  
CREATE PROCEDURE SP_Qry8 (@Ordid int,@Styleno Varchar(30),@ColID int,@SizeID int)
AS 
Select Sum(Qty) from (
Select IsNull(Sum(ProdPcs),0) as Qty From Trs_Prodentry A INNER JOIN Trs_ProdentryQty B ON A.ID = B.ID where Ordid=@Ordid and StyleNo=@Styleno And stageId=1 And ClrId =  @ColID And SizId = @SizeID 
UNION
Select IsNull(Sum(RecPcs),0) as Qty From Trs_PcsGrn1 A INNER JOIN Trs_PcsGrn2 B ON A.ID = B.ID where OrdJob=@Ordid and StyleNo=@Styleno and TargetStageID=1 And ColId =  @ColID  And SizId = @SizeID and GrnType ='Process Receipt'

UNION

Select IsNull(Sum(RecPcs),0) as Qty From Trs_PcsGrn1 A INNER JOIN Trs_PcsGrn2 B ON A.ID = B.ID INNER JOIN Mas_Dept ON A.dept = Mas_Dept.DeptID where OrdJob=@Ordid and StyleNo=@Styleno And ColId =  @ColID  And SizId = @SizeID and GrnType ='Supplier Order Receipt' And SEMIFINISH='F'

) X 

--SP_Qry8 601,'ASJASDAJSD',2,-2