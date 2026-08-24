/*;=============================================   
; Author           :  Global Software's    
; Create date      :  05/11/2022    
; Create By        :  ASLAM 
; Description      :  SP FOR SALES INVOICE
; Change Person    :  ASLAM
; Last Change Date :  12/01/2023 10.03 AM 
; =============================================  */  
CREATE PROCEDURE SP_Vue_OrderStyleWiseCost   AS 
BEGIN 

DECLARE @sql1 NVARCHAR(MAX);


SET @sql1 = 'ALTER VIEW Vue_OrderStyleWiseCost as
 Select Ordid,Sum(StyleQty) as StyleQty,Sum(FabricReqKGs) as FabricReqKgs,Sum(Fabric_Cost_Per_UOM) as FabCostPerUOM,Sum(TotalBudgetAccValue) as TotalBudgetAccValue,Sum(TotalBudgetProdValue) AS TotalBudgetProdValue,Sum(TotalBudgetCommValue) AS TotalBudgetCommValue, Avg(ProfitPercent) as ProfitPercent,Sum(ProfitValue) as ProfitValue, Sum(BudgetFabricValue) AS BudgetFabricValue,Sum(Buycomm) as BuyComm,Sum(DDBValue) as DDBValue,
Sum(Actual_FabricValue) AS Actual_FabricValue , Sum(Actual_AccValue) AS Actual_AccValue , Sum(Actual_ProdnValue) as Actual_ProdnValue , Sum(Actual_CommValue) AS Actual_CommValue,sum(Actual_BuyComm) AS Actual_BuyComm,Sum(Actual_DDBValue) AS Actual_DDBValue ,
Sum(ShippedQty) as ShippedQty, Sum(ShippedValue) AS ShippedValue,sum(Actual_ProdOverHeadValue) AS Actual_ProdOverHeadValue,Sum(Budget_ProdOverHeadValue) AS Budget_ProdOverHeadValue,Sum(BudgetShippedValue) AS BudgetShippedValue, sum(Total_ActualCreditValue) AS Total_ActualCreditValue , Sum(Total_ActualDebitValue) AS Total_ActualDebitValue,Sum(NetProfitValue) AS NetProfitValue,
Sum(NetActualValue) AS NetActualValue, Sum(NetBudgetValue) AS NetBudgetValue, Sum(SalesAmt) AS SalesAmt, Sum(Supplier_Bill_Amt) AS Supplier_Bill_Amt , IsNull(Sum(Emb_Printing_Actual_Amt) ,0) AS Emb_Printing_Actual_Amt,Sum(FabSalesAmt) AS FabSalesAmt,Sum(AccSalesAmt) AS AccSalesAmt, sum(PcsSalesAmt) as PcsSalesAmt
 from ORDERSTYLEWISECOST GROUP BY ORdid'

EXEC sp_executesql @sql1 

END


-- SP_Vue_SalesInvoice  2603