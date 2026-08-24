/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  01/02/2023 10.10 AM 
; =============================================  */  
 CREATE PROCEDURE SP_PendingRateCnf
AS
 Select RTrim(Jobno) +'/' + C.Finyear + '->' + BuyOrdNo as JobNo , B.Styleno,PartName,WorkComplDet as Stage,G.Rate as BudgetRate, B.Rate as QuotRate,Rtrim(A.QuotNo) + '/' + A.Finyear As QuotNo,PName as Party,B.Ordid,B.PartId,B.StageId,A.ID as QuotID,A.PartyID,ProdnType   FROM Pro_RateCnfPcs1 A INNER JOIN Pro_RateCnfPcs2 B ON A.ID = B.ID INNER JOIN ORDERMAS C ON B.OrdID = C.OrdId 
INNER JOIN Mas_Part D ON B.PartId = D.PartID INNER JOIN Mas_Party E ON A.PartyID = E.PID INNER JOIN Mas_JobWrkComp F ON
B.StageId = F.Id  
INNER JOIN Pro_Prod_PartwiseRate G ON B.Ordid = G.OrdID AND B.Styleno = G.Styleno AND B.PartId = G.PartID And B.StageId = G.WrkID 
WHERE IsNull(Approved,0) = 0 And ProdnType ='O' and isNull(b.Rate,0) > 0

UNION

Select RTrim(Jobno) +'/' + C.Finyear + '->' + BuyOrdNo as JobNo , B.Styleno,PartName,WorkComplDet as Stage,G.JobWrkRate as BudgetRate, B.Rate as QuotRate,Rtrim(A.QuotNo) + '/' + A.Finyear As QuotNo,EmpName as Party,B.Ordid,B.PartId,B.StageId,A.ID as QuotID,A.PartyID,ProdnType    FROM Pro_RateCnfPcs1 A INNER JOIN Pro_RateCnfPcs2 B ON A.ID = B.ID INNER JOIN ORDERMAS C ON B.OrdID = C.OrdId 
INNER JOIN Mas_Part D ON B.PartId = D.PartID INNER JOIN Mas_Emp E ON A.PartyID = E.ID INNER JOIN Mas_JobWrkComp F ON
B.StageId = F.Id  
INNER JOIN Pro_Prod_PartwiseRate G ON B.Ordid = G.OrdID AND B.Styleno = G.Styleno AND B.PartId = G.PartID And B.StageId = G.WrkID 
WHERE IsNull(Approved,0) = 0 And ProdnType ='I' and isNull(b.Rate,0) > 0

ORDER BY a.PartyId


 