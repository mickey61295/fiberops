/*;=============================================   
; Author           :  Global Software's    
; Create date      :  08/08/2023    
; Create By        :  chandru  
; Description      :  Accessories_Stock  
; Change Person    :  SWETHA
; Last Change Date :  27/05/2024 10.00 AM 
; =============================================  */  


create Procedure Sp_DomesticPL (@ORDID as int) as  insert into temp_DomesticPL (Ordid,Buyer,iono,finyear,Style,OrderQty,Orddate,Seson,Category,MerchID,Brandid,fabriccost,trimscost,Productioncost,emblish,commercialcost,shippedQty,shippedvalue,othersale,Overheads,otherexp 
 ) 





select a.Ordid,BuyerName,a.Jobno,a.Finyear,b.StyleNo,StyleQty,a.OrdDate,SeasDesc,Mas_BuyerDept.BuyerDeptDesc ,MerchID,isnull(Mas_brand.ID,0) ID,0,0,0,0,0,0,0,0,0,0  from Ordermas a inner join OrderStyleDtl b on a.OrdId=b.OrdID inner join Mas_Buyer on a.BuyerID =Mas_buyer.BuyerID inner join Mas_Season on Mas_Season.SeasID = a.Season  inner join Mas_BuyerDept on Mas_BuyerDept.ID = a.Buyerdeptid inner join Mas_StyleNo on Mas_StyleNo.StyleNo=b.StyleNo  Left join Mas_brand on Mas_brand.id = Mas_StyleNo.BrandId   where a.Ordid = @ORDID





/* fabric cost*/




--update temp_DomesticPL set  fabriccost = Z.amount from( select y.Ordid,Sum(y.amount) as amount from  (select Trs_FabAllot1.Ordid,isnull((amount)*(trs_del2.Kg ),0) as amount  from ( select distinct Ordid,FabId,ClrID,CntId,Diaid,Gsm,LL,DesignId,isnull(sum(amount)/sum(Pokgs),0) as amount from trs_po3 Where Ordid in (SELECT DISTinct YarnLotOrdid  from Trs_FabAllot2 inner join Trs_FabAllot1 on Trs_FabAllot1.id = Trs_FabAllot2.id where Ordid =@ORDID)   group by  Ordid,FabId,ClrID,CntId,Diaid,Gsm,LL,DesignId ) x


--  inner join Trs_FabAllot2 c on x.OrdId =c.YarnLotOrdid and x.FabID =c.FabId_1 and x.ClrID = c.ColId_1 and x.CntID =c.CntId_1 and x.DiaID =c.Diaid_1 and x.gsm =c.Gsm_1 and x.LL =c.LL_1 and x.DESIGNID =c.DesignId_1 inner join Trs_FabAllot1 on Trs_FabAllot1


--.id = c.id inner join Trs_Del2 on trs_DEL2.OrdId = Trs_FabAllot1.Ordid inner         join trs_del1 on trs_del1.id = trs_del2.id inner join StockTable  D on D.StockID = Trs_Del2.StockID  and D.OrdId =c.YarnLotOrdid and D.FabID =c.FabId_1 and D.ColID  = c.ColId_1 and D.CntID =c.CntId_1 and D.DiaID =c.Diaid_1 and D.gsm =c.Gsm_1 and D.LL =c.LL_1 and D.PRINT_DESIGNID  =c.DesignId_1 where  Trs_FabAllot1.Ordid = @Ordid  and Prs_Dept =11 and  DeptId = 31  and TrType = 1  group by amount ,AllotKgs,Trs_FabAllot1.Ordid,Trs_Del2.Kg )y group by Ordid )Z inner join temp_DomesticPL on temp_DomesticPL.Ordid =Z.OrdId 

--swetha 

update temp_DomesticPL set  fabriccost = Z.amount from( select y.Ordid,Sum(y.amount) as amount from  (select distinct Trs_FabAllot1.Ordid,isnull((Trs_Del2.rate)*sum((trs_del2.Kg )),0) as amount  from  Trs_FabAllot2 c INNER JOIN Trs_FabAllot1 on Trs_FabAllot1.id = c.id inner join Trs_Del2 on trs_DEL2.OrdId = Trs_FabAllot1.Ordid inner         join trs_del1 on trs_del1.id = trs_del2.id inner join StockTable  D on D.StockID = Trs_Del2.StockID  and D.OrdId =c.YarnLotOrdid and D.FabID =c.FabId_1 and D.ColID  = c.ColId_1 and D.CntID =c.CntId_1 and D.DiaID =c.Diaid_1 and D.gsm =c.Gsm_1 and D.LL =c.LL_1  where  Trs_FabAllot1.Ordid = @Ordid  and Prs_Dept =11 and  DeptId = 31    and TrType = 1  group by Trs_Del2.rate ,AllotKgs,Trs_FabAllot1.Ordid,Trs_Del2.Kg )y group by Ordid )Z inner join temp_DomesticPL on temp_DomesticPL.Ordid =Z.OrdId 

-- Ardeur TicktNo-1204
--
-- and D.PRINT_DESIGNID  =c.DesignId_1

 /*Yarn Details */

 update temp_DomesticPL set  fabriccost = fabriccost + Z.amount from(



 select isnull(sum(amount),0) as amount,Ordid from( select (isnull(trs_del2.kg,0) * isnull(D.Rate,0)) as amount,Trs_Del2.Ordid  from  Trs_FabAllot2 c  inner join Trs_FabAllot1 on Trs_FabAllot1.id = c.id inner join Trs_Del2 on trs_DEL2.OrdId = Trs_FabAllot1.Ordid inner         join trs_del1 on trs_del1.id = trs_del2.id inner join StockTable  D on D.StockID = Trs_Del2.StockID  and D.OrdId =c.YarnLotOrdid and D.FabID =c.FabId_1 and D.ColID  = c.ColId_1 and D.CntID =c.CntId_1 and D.DiaID =c.Diaid_1 and D.gsm 
=c.Gsm_1 and D.LL =c.LL_1  and D.Dept = C.DeptId  where  Trs_FabAllot1.Ordid = @Ordid  and DeptId<>31   and TrType = 1 )y group by Ordid )Z  inner join temp_DomesticPL on temp_DomesticPL.Ordid =Z.OrdId 

-- Ardeur TicktNo-1204

--and D.PRINT_DESIGNID  =c.DesignId_1

/* acc Cost */



update temp_DomesticPL set trimscost =ISNULL(trimscost,0)+amount  from (





 select b.Ordid,isnull(sum(b.kg * BudRate),0) as amount  from trs_del1 a inner join trs_del2 b on a.id = b.id inner join stocktable c on b.StockID = c.StockID inner join Pro_AccBudRate D on b.OrdId = D.ordid and d.Siz = c.Siz and d.Clr = c.ColID and c.Atype = D.Acc_Type and c.Ades = d.Acc_Desc where b.Ordid in(@ORDID) and Prs_Dept = 16 and TrType = 7  group by b.Ordid  )x inner join temp_DomesticPL on temp_DomesticPL.Ordid =x.OrdId 








/*INProdction cost */



update temp_DomesticPL set Productioncost =y.amount from (

select x.ordid,sum(x.amt) as Amount from (select isnull(avg(Trs_ProdBillDetNew.rate),0)  as avgrate, isnull( (Trs_ProdBillDetNew.ThisBillQty),0) as qty ,isnull((Trs_ProdBillDetNew.rate*Trs_ProdBillDetNew.ThisBillQty),0) as amt ,Trs_ProdBillDetNew.id,Mas_JobWrkComp.WorkComplDet,Mas_JobWrkComp.Id as stageid,Trs_ProdBillDetNew.Ordid as ordid,Mas_Part.PartName as partname,Trs_ProdBillDetNew.styleno from Trs_ProdBillDetNew inner join Mas_JobWrkComp on Mas_JobWrkComp.id=Trs_ProdBillDetNew.StageID inner join Mas_Part on Mas_Part.PartID=Trs_ProdBillDetNew.Partid where Trs_ProdBillDetNew.Ordid = @ORDID group by Trs_ProdBillDetNew.rate,Trs_ProdBillDetNew.ThisBillQty,Trs_ProdBillDetNew.id,Mas_JobWrkComp.WorkComplDet,Mas_JobWrkComp.Id,Trs_ProdBillDetNew.Ordid,Mas_Part.PartName,Trs_ProdBillDetNew.styleno )X where X.Ordid = @ORDID  group by x.ordid)y inner join temp_DomesticPL on y.ordid = temp_DomesticPL.Ordid 



/*Pcs dc*/





update temp_DomesticPL set Productioncost = Productioncost + isnull(x.amount,0) from (

SELECT  Ordid ,ISNULL(SUM(Trs_BillRate.Amount), 0) AS Amount  FROM Trs_BillRate INNER JOIN Trs_Bills ON Trs_BillRate.ID = Trs_Bills.ID INNER JOIN Mas_JobWrkComp ON Trs_Billrate.dept = Mas_JobWrkComp.ID INNER JOIN Mas_Dept ON Mas_JobWrkComp.deptId = Mas_Dept.DeptID WHERE (Trs_BillRate.ID = (SELECT DISTINCT invid FROM Trs_PcsGrn1 Left Join Trs_PcsGrn3 On Trs_PcsGrn1.Id=Trs_PcsGrn3.Id WHERE Trs_PcsGrn1.Invid = trs_billrate.id AND Trs_PcsGrn1.Invid = trs_bills.id AND StageID = Trs_Billrate.Dept and Trs_PcsGrn1.OrdJob=trs_billrate.OrdId and Mas_JobWrkComp.deptId not in (12,13) and Trs_PcsGrn1.OrdJob = @ORDID and GrnType<>'Supplier Order Receipt'  )) GROUP BY Trs_BillRate.OrdID )x inner join temp_DomesticPL on x.OrdID = temp_DomesticPL.Ordid 


/*Supplier Order*/





update temp_DomesticPL set Productioncost = Productioncost + isnull(x.amount,0) from (

SELECT  Ordid ,ISNULL(SUM(Trs_BillRate.Amount), 0) AS Amount  FROM Trs_BillRate INNER JOIN Trs_Bills ON Trs_BillRate.ID = Trs_Bills.ID INNER JOIN Mas_JobWrkComp ON Trs_Billrate.dept = Mas_JobWrkComp.ID INNER JOIN Mas_Dept ON Mas_JobWrkComp.deptId = Mas_Dept.DeptID WHERE (Trs_BillRate.ID = (SELECT DISTINCT invid FROM Trs_PcsGrn1  WHERE Trs_PcsGrn1.Invid = trs_billrate.id AND Trs_PcsGrn1.Invid = trs_bills.id AND Trs_PcsGrn1.TargetStageID  = Trs_Billrate.Dept and Trs_PcsGrn1.OrdJob=trs_billrate.OrdId and Mas_JobWrkComp.deptId not in (12,13) and Trs_PcsGrn1.OrdJob = @ORDID and GrnType='Supplier Order Receipt'  )) GROUP BY Trs_BillRate.OrdID )x inner join temp_DomesticPL on x.OrdID = temp_DomesticPL.Ordid 









/*Pcsdc emblish*/


update temp_DomesticPL set emblish =x.amount from (

SELECT  Ordid ,ISNULL(SUM(Trs_BillRate.Amount), 0) AS Amount  FROM Trs_BillRate INNER JOIN Trs_Bills ON Trs_BillRate.ID = Trs_Bills.ID INNER JOIN Mas_JobWrkComp ON Trs_Billrate.dept = Mas_JobWrkComp.ID INNER JOIN Mas_Dept ON Mas_JobWrkComp.deptId = Mas_Dept.DeptID WHERE (Trs_BillRate.ID = (SELECT DISTINCT invid FROM Trs_PcsGrn1 Left Join Trs_PcsGrn3 On Trs_PcsGrn1.Id=Trs_PcsGrn3.Id WHERE Trs_PcsGrn1.Invid = trs_billrate.id AND Trs_PcsGrn1.Invid = trs_bills.id AND StageID = Trs_Billrate.Dept and Trs_PcsGrn1.OrdJob=trs_billrate.OrdId and Mas_JobWrkComp.deptId in (12,13) and Trs_PcsGrn1.OrdJob = @ORDID and GrnType<>'Supplier Order Receipt' )) GROUP BY Trs_BillRate.OrdID )x inner join temp_DomesticPL on x.OrdID = temp_DomesticPL.Ordid 




/* Commerical */



update temp_DomesticPL set commercialcost  =x.amount from (







SELECT ISNULL(SUM(ShippingBill_Det.BillAmount), 0) AS Amount,ShippingBill_Det.Ordid  FROM ShippingBill_Det INNER JOIN Mas_Commercial ON ShippingBill_Det.CommID = Mas_Commercial.Id INNER JOIN ShippingBill ON ShippingBill.ID = ShippingBill_Det.CId WHERE (isnull(Mas_Commercial.Type,'+') = '-') and ShippingBill_Det.OrdId = @ORDID GROUP BY ShippingBill_Det.Ordid )x inner join temp_DomesticPL on x.ordid = temp_DomesticPL.Ordid   



/*shipped details*/


update temp_DomesticPL set shippedvalue  =x.amount,shippedQty =x.PCS  from (

SELECT ISNULL(SUM(dbo.Trs_Pcs2.Pcs * ISNULL(dbo.OrdQtyClrDtl.SaleRate,0) * isnull(trs_pcs2.cRate,0)),0) AS Amount,SUM(dbo.Trs_Pcs2.Pcs) AS PCS,trs_pcs1.Ordjobno   FROM dbo.Trs_Pcs1 INNER JOIN dbo.Trs_Pcs2 ON dbo.Trs_Pcs1.ID = dbo.Trs_Pcs2.ID Inner JOIN OrderMas ON Trs_Pcs1.Ordjobno = OrderMas.OrdId Inner JOIN OrdQtyClrDtl ON Trs_Pcs1.Ordjobno = OrdQtyClrDtl.OrdId And Trs_Pcs2.StyleNo = OrdQtyClrDtl.Styleno And Trs_Pcs2.ColID = OrdQtyClrDtl.CmbClrID And Trs_Pcs2.SizeID = OrdQtyClrDtl.SizeID and OrdQtyClrDtl.LotNo=Trs_Pcs2.LotNo WHERE  (Trs_Pcs1.DelType = 'Despatch') and OrdJobno = @ORDID GROUP BY trs_pcs1.Ordjobno)x   inner join temp_DomesticPL on temp_DomesticPL.Ordid = x.Ordjobno 







/*sales details*/





update temp_DomesticPL set shippedvalue =shippedvalue+isnull(x.amount,0) ,shippedQty =shippedQty+isnull(x.pcs,0) from (

select sum(isnull(kgs,0)) as pcs ,sum(isnull(Totamt,0) ) as amount,Ordjobno  from Vue_PcsSalesinvoice where Ordjobno = @ORDID group by Ordjobno)x   inner join temp_DomesticPL on temp_DomesticPL.Ordid = x.Ordjobno 







/*Deldate*/



UPDATE temp_DomesticPL SET Deldate = X.dtDCDate FROM (SELECT Ordjobno,dtDCDate    FROM dbo.Trs_Pcs1 INNER JOIN dbo.Trs_Pcs2 ON dbo.Trs_Pcs1.ID = dbo.Trs_Pcs2.ID Inner JOIN OrderMas ON Trs_Pcs1.Ordjobno = OrderMas.OrdId Inner JOIN OrdQtyClrDtl ON Trs_Pcs1.
Ordjobno = OrdQtyClrDtl.OrdId And Trs_Pcs2.StyleNo = OrdQtyClrDtl.Styleno And Trs_Pcs2.ColID = OrdQtyClrDtl.CmbClrID And Trs_Pcs2.SizeID = OrdQtyClrDtl.SizeID and OrdQtyClrDtl.LotNo=Trs_Pcs2.LotNo WHERE  Trs_Pcs1.DelType in ('Despatch','sales') and OrdJobno in (@ORDID) GROUP BY trs_pcs1.Ordjobno,dtDCDate )X INNER JOIN  temp_DomesticPL on temp_DomesticPL.Ordid = x.Ordjobno 



/* Overheads */




update temp_DomesticPL set Overheads = x.amount from (select isnull(OverallOH,0) as amount,Ordid  from Ordermas2 where Ordid in (@ORDID)  group by  Ordid,OverallOH  )X INNER JOIN  temp_DomesticPL on temp_DomesticPL.Ordid = x.Ordid 







/*direct Debit */



 



update temp_DomesticPL set  Otherexp =  x.amount from(select isnull(SUM(DebitValue),0) as amount,Trs_DirectDeb1.Ordid  from Trs_DirectDeb1 inner join Ordermas on Ordermas.Ordid =Trs_DirectDeb1.OrdId   where Trs_DirectDeb1.Ordid in (@ORDID) and Trs_DirectDeb1.Type ='C'  group by Trs_DirectDeb1.Ordid,DebitValue ) X INNER JOIN  temp_DomesticPL on temp_DomesticPL.Ordid = x.Ordid 



/* Others Debit */




update temp_DomesticPL set  othersale = y.amount from (

select sum(x.amount) as amount,x.Ordid from(select isnull(SUM(DebitValue),0) as amount,Trs_DirectDeb1.Ordid  from Trs_DirectDeb1 inner join Ordermas on Ordermas.Ordid =Trs_DirectDeb1 .OrdId   where Trs_DirectDeb1.Ordid in (@Ordid) and Trs_DirectDeb1.Type 
='D'  group by Trs_DirectDeb1.Ordid,DebitValue ) X  group by ordid)y  INNER JOIN  temp_DomesticPL on temp_DomesticPL.Ordid = y.Ordid