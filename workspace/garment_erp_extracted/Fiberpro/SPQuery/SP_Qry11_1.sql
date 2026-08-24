/*;=============================================   
; Author           :  Global Software's    
; Create date      :  21/04/2025    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  23/04/2025 10.07 AM 
; =============================================  */  
 CREATE PROCEDURE SP_Qry11_1 (@Ordid int,@coycode int,@PartyId int,@deptID int,@GodId int) AS
BEGIN
    Select RTRIM(X.DocNo) + '/' + RTRIM(x.Finyear) AS DcNo, X.Id,X.Finyear,X.DocNo,X.ProcessType,Case When OrderMas.JobNo = 0 Then 'General/' + RTRIM(Ordermas.Finyear) Else RTRIM(OrderMas.JobNo) + '/' + RTRIM(Ordermas.Finyear) + '/' + RTRIM(OrderMas.BuyOrdNo)  end AS OrdRef from (
Select Trs_Pcs1.id,Trs_Pcs1.Finyear,trs_pcs1.DocNo, ProcessType,Trs_pcs1.Ordjobno,Party,sum(Pcs) as DCPcs FROM
trs_pcs1 INNER JOIN trs_pcs2 ON trs_pcs1.id=trs_pcs2.id INNER JOIN OrderMas ON trs_pcs1.Ordjobno = OrderMas.ordid 
WHERE (trs_pcs1.Clos IS NULL OR trs_pcs1.Clos = 'No')  and Coycode = @Coycode and Party = @PartyID and dept = @DeptID and Ordjobno = @Ordid and GodID =@GodId
And trs_Pcs1.ID in (Select ID From Trs_DC_ScanDetail)
GROUP BY Trs_Pcs1.id,Trs_Pcs1.Finyear,trs_pcs1.DocNo, ProcessType,Trs_pcs1.Ordjobno,Party) X LEFT JOIN (Select OrdJob,Dept,Party,OurDcRef,Sum(Recpcs) as RecPcs FROM  Trs_Pcsgrn1 INNER JOIN Trs_PcsGrn2 ON Trs_PcsGrn1.Id = Trs_PcsGrn2.Id 
WHERE Coycode = @Coycode And Party = @PartyID and Dept = @DeptID and OrdJob = @Ordid and GodID = @GodId
GROUP BY OrdJob,Dept,OurDcRef,Party) Y  ON X.ID = Y .Ourdcref
And x.Ordjobno = Y.OrdJob And X.Party = Y.Party 
INNER JOIN ORDERMAS ON X.Ordjobno = OrderMas.OrdId 
WHERE IsNull(DCPcs,0)  - IsNull(RecPcs,0) >0 And OrderMas.Completed =0  ORDER BY X.Finyear DESC, X.DocNo DESC
END
