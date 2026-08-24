/*;=============================================   
; Author           :  Global Software's    
; Create date      :  23/12/2023    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  20/03/2024 10.10 AM 
; =============================================  */  

CREATE PROCEDURE SP_1 (@Ordid Int,@Formula1 nvarchar(max),@GrpID int)
AS
BEGIN 
DECLARE @SQLSTR AS NVARCHAR(Max) Set @SQLSTR=N'
Update OrderStylewiseCost_Grp SET BudgetValue = X.Amt From ( 
Select Ordid,Styleno,isnull(Sum(Amount),0) As Amt  From VUE_RPT_Budget_Abstract_StyleWise A WHERE  A.Ordid = @OrdID AND A.DeptID in((Select ID From fnSplitter(@Formula1)))
Group by Ordid,Styleno ) X , OrderStylewiseCost_Grp Where X.Ordid = OrderStylewiseCost_Grp.Ordid And X.StyleNo = OrderStylewiseCost_Grp.StyleNo And OrderStylewiseCost_Grp.Ordid = @Ordid And OrderStylewiseCost_Grp.GrpId= @GrpID'  EXEC SP_EXECUTESQL @SQLSTR,N'@Ordid INT, @Formula1 nvarchar(max),@GrpID INT ',@Ordid=@Ordid, @Formula1=@Formula1 ,@GrpID = @GrpID End