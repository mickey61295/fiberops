/*;=============================================   
; Author           :  Global Software's    
; Create date      :  25/12/2023    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  04/07/2024 10.40 AM 
; =============================================  */  
CREATE PROCEDURE SP_GrnUpdate (@Ordid Int,@Formula1 nvarchar(max),@GrpID int,@deptID int,@RECMETHOD CHAR(1))
AS
BEGIN 
DECLARE @TOTRECKGS NUMERIC(18,3)
DECLARE @TOTBUDAMT NUMERIC(18,2)

SELECT @TOTRECKGS = ISNULL(KGS,0) FROM (
SELECT  CASE WHEN Sum(TOTRECKGS) > Sum(B.KG) THEN IsNull(Sum(B.KG),0) ELSE Isnull(Sum(TOTRECKGS),0) END AS KGS FROM  TRS_DEL1 A INNER JOIN TRS_DEL2 B ON A.ID = B.ID WHERE A.Clos = 'Yes' AND B.OrdId = @Ordid And Prs_Dept in((Select ID From fnSplitter(@Formula1)))
UNION
SELECT  Isnull(Sum(TOTRECKGS),0) AS KGS FROM  TRS_DEL1 A INNER JOIN TRS_DEL2 B ON A.ID = B.ID WHERE IsNUll(A.Clos,'No') = 'No' AND B.OrdId = @Ordid And Prs_Dept in((Select ID From fnSplitter(@Formula1))) ) X 


SELECT @TOTBUDAMT = ISNULL(AMT,0) FROM (
SELECT  Isnull(Sum(TOTBudAmt),0) AS AMT FROM  TRS_DEL1 A INNER JOIN TRS_DEL2 B ON A.ID = B.ID WHERE A.Clos = 'Yes' AND B.OrdId = @Ordid And Prs_Dept in((Select ID From fnSplitter(@Formula1)))
UNION
SELECT  Isnull(Sum(TOTBudAmt),0) AS AMT FROM  TRS_DEL1 A INNER JOIN TRS_DEL2 B ON A.ID = B.ID WHERE IsNUll(A.Clos,'No') = 'No' AND B.OrdId = @Ordid And Prs_Dept in((Select ID From fnSplitter(@Formula1))) ) X 



UPDATE OrderStylewiseCost_Grp SET GRNKGS = @TOTRECKGS,GRNBASEDVALUE = @TOTBUDAMT WHERE ORDID = @Ordid ANd GrpID = @GrpID 


END

