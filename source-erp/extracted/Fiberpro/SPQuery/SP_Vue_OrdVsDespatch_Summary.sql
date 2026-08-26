/*;=============================================   

; Author           :  Global Software's    

; Create date      :  05/11/2022    

; Create By        :  ASLAM 

; Description      :  SP FOR SALES INVOICE

; Change Person    :  KIRUTHIKA

; Last Change Date :  17/11/2025 10.05 AM 

; =============================================  */  

CREATE PROCEDURE SP_Vue_OrdVsDespatch_Summary   AS 

BEGIN 



DECLARE @sql1 NVARCHAR(MAX);



SET @sql1 = 'ALTER VIEW Vue_OrdVsDespatch_Summary  as 



Select MAs_exporter.ExporterName, ordermas.ORdid,Jobno,Finyear,orderqtydtl.styleno,ordermas.Buyerid,Ordermas.Merchid,BuyOrdno,ORdDate,ActDelDt,Ordermas.Expid,Ordertype,completed,OrderStyleDtl.uom,ordermas.Season,fcy,case when sum(orderqtydtl.Orderqty*Orderqtydtl.salerate) > 0 then 
(sum(orderqtydtl.Orderqty*Orderqtydtl.salerate)/sum(orderqtydtl.Orderqty)) else 0 end as salerate,
sum(orderqtydtl.Orderqty) as Orderqty,sum(orderqtydtl.Orderqty*Orderqtydtl.salerate) as OrdAmt,sum(cutplanqty*Orderqtydtl.Salerate) as OrdExcAmt,sum(Cutplanqty) as ExcQty,sum(isnull(VueDespatchStock.Pcs,0)) as DesPcs ,case when sum(isnull(VueDespatchStock.Pcs,0)) >0 then (sum(isnull(VueDespatchStock.Pcs,0)*isnull(orderqtydtl.Salerate,0))/sum(isnull(VueDespatchStock.Pcs,0))) else 0 end  as
 Avgrate, sum(isnull(VueDespatchStock.Pcs,0)*isnull(orderqtydtl.Salerate,0)) as DesAmt,sum(orderqtydtl.Orderqty*Orderqtydtl.Salerate)-sum(isnull(VueDespatchStock.Pcs,0)*isnull(orderqtydtl.Salerate,0)) as balAmt,sum(orderqtydtl.Orderqty)-sum(isnull(VueDespatchStock.Pcs,0)) as BalQty , fcyname,BuyerName,MerchName  from ordermas INNER JOIN OrderStyleDtl ON OrderMas.Ordid = OrderStyleDtl.Ordid  inner join orderqtydtl on ordermas.ordid=orderqtydtl.ordid AND OrderQtyDtl.StyleNo = OrderStyleDtl.StyleNo 
INNER JOIN OrderMas2 ON OrderMas.OrdId = OrderMas2.Ordid left outer  join VueDespatchStock1 as VueDespatchStock on   orderqtydtl.ordid=VueDespatchStock.ordjobno  and orderqtydtl.styleno=VueDespatchStock.styleno and orderqtydtl.styleid=VueDespatchStock.styleid and orderqtydtl.colid=VueDespatchStock.colid and orderqtydtl.sizeid=VueDespatchStock.sizeid and orderqtydtl.lotno=VueDespatchStock.lotno left outer  join Mas_buyer  on ordermas.Buyerid=MAs_buyer.Buyerid left outer join Mas_MErchandiser on Ordermas.merchid=Mas_MErchandiser.merchid left outer join MAs_season on ordermas.season=MAs_season.seasid left outer join MAs_fcy on Ordermas.Fcy=MAs_fcy.id  left outer join MAs_exporter on Ordermas.Expid=MAs_Exporter.Expid   WHERE OrderStyleDtl.EntryOption =1 
group by  ordermas.ORdid,Jobno,Finyear,orderqtydtl.styleno,ordermas.Buyerid,Ordermas.Merchid,BuyOrdno,ORdDate,ActDelDt,Ordermas.Expid,Ordertype,completed,OrderStyleDtl.uom,ordermas.Season, fcyname,fcy,MAs_exporter.ExporterName,BuyerName,MerchName





UNION





Select MAs_exporter.ExporterName, ordermas.ORdid,Jobno,Finyear,orderqtydtl.styleno,ordermas.Buyerid,Ordermas.Merchid,BuyOrdno,ORdDate,ActDelDt,Ordermas.Expid,Ordertype,completed,OrderStyleDtl.uom,ordermas.Season,fcy,Avg(orderqtydtl.salerate) as salerate,sum(orderqtydtl.SizeQty) as Orderqty,sum(orderqtydtl.SizeQty*orderqtydtl.salerate) as OrdAmt,sum((SizeQty + (SizeQty * isnull(Exs_Per,0) /100))*orderqtydtl.Salerate) as OrdExcAmt,sum(SizeQty + (SizeQty * isnull(Exs_Per,0) /100) ) as ExcQty,sum(isnull(VueDespatchStock.Pcs,0)) as DesPcs ,Avg(isnull(orderqtydtl.Salerate,0)) as Avgrate, sum(isnull(VueDespatchStock.Pcs,0)*isnull(orderqtydtl.Salerate,0)) as DesAmt,sum(orderqtydtl.SizeQty*orderqtydtl.Salerate)-sum(isnull(VueDespatchStock.Pcs,0)*isnull(orderqtydtl.Salerate,0)) as balAmt,sum(orderqtydtl.SizeQty)-sum(isnull(VueDespatchStock.Pcs,0)) as BalQty , fcyname,BuyerName,MerchName  from ordermas  INNER JOIN OrderStyleDtl ON OrderMas.Ordid = OrderStyleDtl.Ordid  inner join OrdQtyClrDtl as OrderQtyDtl on ordermas.ordid=orderqtydtl.ordid And OrderStyleDtl.StyleNo = OrderQtyDtl.Styleno  INNER JOIN OrderMas2 ON OrderMas.OrdId = OrderMas2.Ordid left outer  join VueDespatchStock1 as VueDespatchStock on   orderqtydtl.ordid=VueDespatchStock.ordjobno  and orderqtydtl.styleno=VueDespatchStock.styleno and orderqtydtl.styleid=VueDespatchStock.styleid and orderqtydtl.CmbClrID=VueDespatchStock.colid and orderqtydtl.sizeid=VueDespatchStock.sizeid and orderqtydtl.lotno=VueDespatchStock.lotno left outer  join Mas_buyer  on ordermas.Buyerid=MAs_buyer.Buyerid left outer join Mas_MErchandiser on Ordermas.merchid=Mas_MErchandiser.merchid left outer join MAs_season on ordermas.season=MAs_season.seasid left outer join MAs_fcy on Ordermas.Fcy=MAs_fcy.id  left outer join MAs_exporter on Ordermas.Expid=MAs_Exporter.Expid   

WHERE OrderStyleDtl.EntryOption =2 

group by  ordermas.ORdid,Jobno,Finyear,orderqtydtl.styleno,ordermas.Buyerid,Ordermas.Merchid,BuyOrdno,ORdDate,ActDelDt,Ordermas.Expid,Ordertype,completed,OrderStyleDtl.uom,ordermas.Season, fcyname,fcy,MAs_exporter.ExporterName,BuyerName,MerchName'



EXEC sp_executesql @sql1 



END




