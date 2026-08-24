/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  03/02/2023 10.00 AM 
; =============================================  */   
CREATE PROCEDURE SP_ApprovedRateCnf1 (@OrdId as Nvarchar(4000),@StyleNo as Nvarchar(4000)) AS BEGIN DECLARE @SQLSTR AS NVARCHAR(4000) SET @SQLSTR=N' SELECT JobNo,Styleno,PartName,Stage,BudgetRate, QuotRate,Quotno,Party,Ordid,PartId,StageID,QuotId,PartyID,ProdnType from (
 Select RTrim(Jobno) +''/'' + C.Finyear + ''->'' + BuyOrdNo as JobNo , B.Styleno,PartName,WorkComplDet as Stage,G.Rate as BudgetRate, B.Rate as QuotRate,Rtrim(A.QuotNo) + ''/'' + A.Finyear As QuotNo,PName as Party,B.Ordid,B.PartId,B.StageId,A.ID as QuotID,A.PartyID,ProdnType   FROM Pro_RateCnfPcs1 A INNER JOIN Pro_RateCnfPcs2 B ON A.ID = B.ID INNER JOIN ORDERMAS C ON B.OrdID = C.OrdId 
INNER JOIN Mas_Part D ON B.PartId = D.PartID INNER JOIN Mas_Party E ON A.PartyID = E.PID INNER JOIN Mas_JobWrkComp F ON
B.StageId = F.Id  
INNER JOIN Pro_Prod_PartwiseRate G ON B.Ordid = G.OrdID AND B.Styleno = G.Styleno AND B.PartId = G.PartID And B.StageId = G.WrkID 
WHERE IsNull(Approved,0) = 1 And ProdnType =''O''

UNION

Select RTrim(Jobno) +''/'' + C.Finyear + ''->'' + BuyOrdNo as JobNo , B.Styleno,PartName,WorkComplDet as Stage,G.JobWrkRate as BudgetRate, B.Rate as QuotRate,Rtrim(A.QuotNo) + ''/'' + A.Finyear As QuotNo,EmpName as Party,B.Ordid,B.PartId,B.StageId,A.ID as QuotID,A.PartyID,ProdnType    FROM Pro_RateCnfPcs1 A INNER JOIN Pro_RateCnfPcs2 B ON A.ID = B.ID INNER JOIN ORDERMAS C ON B.OrdID = C.OrdId 
INNER JOIN Mas_Part D ON B.PartId = D.PartID INNER JOIN Mas_Emp E ON A.PartyID = E.ID INNER JOIN Mas_JobWrkComp F ON
B.StageId = F.Id  
INNER JOIN Pro_Prod_PartwiseRate G ON B.Ordid = G.OrdID AND B.Styleno = G.Styleno AND B.PartId = G.PartID And B.StageId = G.WrkID 
WHERE IsNull(Approved,0) = 1 And ProdnType =''I'' ) X

WHERE 1 = 1  ' if len(rtrim(@OrdId))>0  BEGIN SET @SQLSTR=@SQLSTR+N' AND X.Ordid in (Select ID From fnSplitter(@OrdId))' End  If Len(Rtrim(@StyleNo))>0 Begin Set @SQLSTR=@SQLSTR+N' AND X.Styleno in (Select IDStr From fnSplitter_Str(@StyleNO))' End BEGIN SET @SQLSTR=@SQLSTR+N' ORDER BY PartyId ' End EXEC SP_EXECUTESQL @SQLSTR,N'@OrdId Nvarchar(4000),@StyleNo as Nvarchar(4000)',@OrdId=@OrdId,@Styleno=@Styleno End


