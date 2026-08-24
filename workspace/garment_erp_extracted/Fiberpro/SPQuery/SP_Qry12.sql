/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  17/02/2023 10.05 AM 
; =============================================  */  

 CREATE PROCEDURE SP_Qry12 (@Ordid int,@coycode int,@InvId int) AS
BEGIN
    SELECT isnull(Sum(Qty* Rate*ExRate),0) as TotalInvAmt FRom (
Select InvDate, BuyerName,BuyOrdNo,A.StyleNo,StyleDesc,sum(Ship_InvDet.Qty) as Qty, sum(Actual_FabricValue) Actual_FabricValue,Sum(Actual_AccValue) as Actual_AccValue ,Sum(Emb_Printing_Actual_Amt) as Emb_Printing_Actual_Amt,Sum(Supplier_Bill_Amt)  as Supplier_Bill_Amt ,Sum(SalesAmt) as SalesAmt,RTRIM(CAST(B.Jobno AS varchar)) + '/' + B.Finyear as iono,RTRIM(CAST(Invno AS varchar)) + '/' + Ship_InvMas.Finyear as invoiceno,a.Ordid as Order_ID,Avg(rate) as rate,fcyname,crate,isNull(ExRate,0) as ExRate,b.OrdDate,isnull(OrderMas2.FabricName,'')as FabricName,Ship_InvMas.InvId,Ship_InvMas.Consignee,isnull(FabSalesAmt,0) FabSalesAmt,isnull(AccSalesAmt,0) AccSalesAmt,isnull(PcsSalesAmt,0) PcsSalesAmt  from OrderStylewiseCost A INNER JOIN OrderMas B ON A.Ordid = B.Ordid INNER JOIN OrderStyleDtl ON a.ORdid = OrderStyleDtl.Ordid And A.StyleNo = OrderStyleDtl.StyleNo INNER JOIN Ship_InvDet ON B.Ordid = Ship_InvDet.OrdID and Ship_InvDet.StyleNo=A.StyleNo and Ship_InvDet.StyleNo=OrderStyleDtl.StyleNo INNER JOIN Ship_InvMas ON Ship_InvDet.InvID = Ship_InvMas.InvId INNER JOIN  Mas_Buyer ON B.BuyerId = Mas_Buyer.BuyerID INNER JOIN Mas_StyleDesc ON OrderStyleDtl.StyleID = Mas_styleDesc.StyleID INNER JOIN Mas_Fcy ON B.Fcy = Mas_Fcy.Id inner join OrderMas2 on b.OrdId=OrderMas2.Ordid Where b.ExpID = @Coycode AND B.OrdId = @OrdId and  IsNull(Actual_AccValue,0) > 0  group by RTRIM(CAST(B.Jobno AS varchar)) + '/' + B.Finyear,RTRIM(CAST(Invno AS varchar)) + '/' + Ship_InvMas.Finyear,a.Ordid,fcyname,crate,BuyerName,BuyOrdNo,A.StyleNo,StyleDesc,InvDate,InvNo,b.OrdDate,OrderMas2.FabricName,Ship_InvMas.InvId,Ship_InvMas.Consignee,isNull(ExRate,0),isnull(FabSalesAmt,0) ,isnull(AccSalesAmt,0) ,isnull(PcsSalesAmt,0)     ) X 

/*AND Ship_InvMas.InvId = @InvID*/
END
