/*;=============================================   

; Author           :  Global Software's    

; Create date      :  22/05/2023 

; Create By        :  ASLAM  

; Description      :  QUERY

; Change Person    :  SWETHA

; Last Change Date :  11/03/2024 10.40 AM 

; =============================================  */  



      

 CREATE PROCEDURE SP_Qry28 (@DeptId int,@PartyID int,@OrdID int) AS

BEGIN



SELECT rtrim(X.JobWrkNo) + '/' + rtrim(X.finyear) AS JWNo, X.ID, X.dt, Sum(YarnIss) as YarnIss,Sum(Prog) as Prog,sum(rec) as Rec from (Select C.JobWrkNo,C.Finyear,C.Dt,C.JobWrkId as ID,b.OrdId, sum(kg) as YarnIss,0 as prog,0 as Rec from Trs_del1 a inner join trs_del2 b on a.id = b.id  INNER JOIN Trs_JobWrkMas C ON A.Knit_JobWrkID = C.JobWrkId where (IsNull(c.CLOS,'') ='' OR C.Clos ='No') and c.PartyID = @PartyID and c.DeptID = @DeptID AND b.OrdId=@OrdID  GROUP BY C.JobWrkNo,C.Finyear,C.Dt,C.JobWrkId ,b.OrdId UNION SELECT C.JobWrkNo,C.Finyear,C.Dt,C.JobWrkId, D.Ordid, 0 as YarnIss,sum(Prog) as Prog,0 as rec FROM Trs_JobWrkMas C inner join Trs_JobWrkDet D ON c.JobWrkId = D.JobWrkId  And c.JobWrkId in (Select Knit_JobWrkID from Trs_del1 ) WHERE (IsNull(c.CLOS,'') ='' OR C.Clos ='No') and c.PartyID = @PartyID and c.DeptID = @DeptID and d.OrdId=@OrdID   GROUP BY C.JobWrkNo,C.Finyear,C.Dt,C.JobWrkId,D.OrdId UNION SELECT D.JobWrkNo,D.Finyear,D.Dt,D.JobWrkId, C.Ordid, 0 as YarnIss,0 as Prog,sum(RecKgs) as rec FROM Trs_Grn1 A INNER JOIN Trs_Grn2 C ON A.Id= C.ID inner join Trs_JobWrkMas D ON A.DCID  = D.JobWrkId  and a.Dept = d.DeptID WHERE (IsNull(D.CLOS,'') ='' OR D.Clos ='No' ) and D.PartyID = @PartyID and D.DeptID = @DeptID and c.ordid=@OrdID   GROUP BY D.JobWrkNo,D.Finyear,D.Dt,D.JobWrkId,C.OrdId ) X INNER JOIN ORDERMAS ON X.OrdId = OrderMas.OrdId GROUP BY X.ID,X.Dt,rtrim(X.JobWrkNo) + '/' + rtrim(X.finyear)

 END