/*;=============================================   

; Author           :  Global Software's    

; Create date      :  17/07/2023    

; Create By        :  ASLAM  

; Description      :  QUERY

; Change Person    :  ASLAM

; Last Change Date :  18/07/2023 10.07 AM 

; =============================================  */  

 CREATE PROCEDURE SP_Qry35 (@Ordid int,@coycode int,@PartyId int,@deptID int,@GodId int) AS

BEGIN

    Select RTRIM(X.DocNo) + '/' + RTRIM(x.Finyear) AS DcNo, X.Id,X.Finyear,X.DocNo,X.ProcessType,Case When OrderMas.JobNo = 0 Then 'General/' + RTRIM(Ordermas.Finyear) Else RTRIM(OrderMas.JobNo) + '/' + RTRIM(Ordermas.Finyear) + '/' + RTRIM(OrderMas.BuyOrdNo)  end AS OrdRef from (

Select trs_pcsGrn1.id,trs_pcsGrn1.Finyear,trs_pcsGrn1.DocNo, ProcessType,trs_pcsGrn1.Ordjob,Party,sum(RecPcs) as DCPcs FROM

trs_pcsGrn1 INNER JOIN trs_pcsGrn2 ON trs_pcsgrn1.id=trs_pcsgrn2.id INNER JOIN OrderMas ON trs_pcsgrn1.Ordjob = OrderMas.ordid 

WHERE Coycode = @Coycode and Party = @PartyID and dept = @DeptID   and GodID =@GodId and IsNull(GANFlg,'N') = 'N'

GROUP BY trs_pcsGrn1.id,trs_pcsGrn1.Finyear,trs_pcsGrn1.DocNo, ProcessType,trs_pcsGrn1.Ordjob,Party) X 
INNER JOIN ORDERMAS ON X.Ordjob = OrderMas.OrdId 

WHERE   OrderMas.Completed =0  ORDER BY X.Finyear DESC, X.DocNo DESC

END
