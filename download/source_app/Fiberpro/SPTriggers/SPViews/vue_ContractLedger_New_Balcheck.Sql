/*                  
;=============================================                  
; Author  :  Global Software's                  
; Create date  :  02/FEB/2026                  
; Create By  :  ASLAM                  
; Description  :  Contractor Wages Ledger Balance
; Change Person  :  ASLAM                
; Last Change Date :  02/FEB/2026 10.00 AM                  
; =============================================   */  

CREATE VIEW vue_ContractLedger_New_Balcheck as (
 
 
 select  Distinct  Sum(Trs_ProdBillDetNew.ThisBillQty) as OrderQty,Trs_ProdBillEntry.StageID,  EmpName, RTRIM (Brno)+ '/' + Trs_ProdBillMasNew.Finyear AS Brno,brdt as Dt, Rate,RTRIM (Jobno)+ '/' + OrderMas.Finyear + 
'-> ' + ordermas.BuyOrdNo as OrdNo,  Trs_ProdBillEntry.Styleno, Trs_ProdBillEntry.OrdID , ISNULL (Sum(Trs_ProdBillDetNew.NetAmount),0) as Credit, 0 as Debit,  Trs_ProdBillEntry.Styleid, Mas_Emp.ID as EmpId,WorkComplDet,'' as PaymentType   from Trs_ProdBillEntry inner join   Trs_ProdBillDetNew on Trs_ProdBillDetNew.Ordid=Trs_ProdBillEntry.Ordid and Trs_ProdBillEntry.StyleNo=Trs_ProdBillDetNew.StyleNo and   Trs_ProdBillDetNew.Colorid=Trs_ProdBillEntry.Colorid and Trs_ProdBillDetNew.StageID=Trs_ProdBillEntry.StageID and   Trs_ProdBillEntry.Partid=Trs_ProdBillDetNew.Partid inner join Trs_ProdBillMasNew on Trs_ProdBillMasNew.ID=Trs_ProdBillDetNew.ID   and Trs_ProdBillEntry.empid=Trs_ProdBillMasNew.Empid inner join OrderMas on OrderMas.OrdId=Trs_ProdBillEntry.Ordid   inner join mas_emp on Mas_Emp.ID=Trs_ProdBillMasNew.Empid and Mas_Emp.ID=Trs_ProdBillEntry.empid inner join Mas_JobWrkComp on   Mas_JobWrkComp.Id =Trs_ProdBillEntry.StageID and Mas_JobWrkComp.Id=Trs_ProdBillDetNew.StageID  group by Trs_ProdBillEntry.StageID,EmpName,Brno,Rate,OrderMas.Finyear, ordermas.BuyOrdNo,Trs_ProdBillEntry.Styleno, Trs_ProdBillEntry.OrdID,Trs_ProdBillEntry.Styleid, Mas_Emp.ID,Trs_ProdBillMasNew.finyear, OrderMas.Jobno,Mas_JobWrkComp.WorkComplDet,Trs_ProdBillMasNew.brdt  
Having ISNULL (Sum(Trs_ProdBillDetNew.NetAmount),0)>0  

UNION ALL 

SELECT   0 as OrderQty,0 as StageID,EmpName, RTRIM (Vno)+ '/' + PaymentMas.Finyear AS Vno,EntryDate as Dt,0 as Rate, RTRIM (Jobno)+ '/' + OrderMas.Finyear + '-> '+ Ordermas.BuyOrdNo as OrdNo,PaymentDtl.StyleNo,ordermas.OrdID,0 as Credit,  Amount as Debit, 0 as StyleID, Mas_Emp.ID as EmpId, '' as WorkComplDet,Case When ReserveFlg='P' Then 'Payment' When   ReserveFlg='V' Then 'Advance' When ReserveFlg='C' Then 'Credit - Note' When ReserveFlg='R' Then 'Reserve'  WHEN ReserveFlg='T' Then 'Others(' + isnull(c.TypeDesc,'') +')' end As PaymentType    from PaymentMas inner join PaymentDtl on PaymentMas.MasSlno = PaymentDtl.DetSlno inner join ordermas on PaymentDtl.Ordid= ordermas.OrdId  inner join Mas_Emp on PaymentMas.EmpId = Mas_Emp.ID And PaymentMas.ReserveFlg In ('P','V','C','R','T')   LEFT JOIN Mas_Voucher_PaymentType C ON PaymentMas.paymentTypeID = c.ID  WHERE Amount>0 

UNION ALL

SELECT   0 as OrderQty,0 as StageID,EmpName,     RTRIM (Vno)+ '/' + PaymentMas.Finyear AS Vno,EntryDate as Dt,0 as Rate,RTRIM (Jobno)+ '/' + OrderMas.Finyear+ '-> '+ Ordermas.BuyOrdNo as OrdNo,  PaymentDtl.StyleNo,ordermas.OrdID,Amount as Credit, 0 as Debit, 0 as StyleID, Mas_Emp.ID as EmpId, '' as WorkComplDet,   case When ReserveFlg='D' Then 'Debit - Note' end As PaymentType   from PaymentMas inner join PaymentDtl on PaymentMas.MasSlno = PaymentDtl.DetSlno   inner join ordermas on PaymentDtl.Ordid= ordermas.OrdId inner join Mas_Emp on PaymentMas.EmpId = Mas_Emp.ID And   PaymentMas.ReserveFlg In ('D') where   Amount>0 )