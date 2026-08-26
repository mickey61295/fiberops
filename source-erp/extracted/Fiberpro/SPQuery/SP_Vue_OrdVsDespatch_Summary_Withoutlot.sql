/*;=============================================   
; Author           :  Global Software's    
; Create date      :  05/11/2022    
; Create By        :  SHAJAHAN
; Description      :  SP FOR SALES INVOICE
; Change Person    :  SHAJAHAN
; Last Change Date :  27/03/2023 10.06 AM 
; =============================================  */  
CREATE PROCEDURE SP_Vue_OrdVsDespatch_Summary_Withoutlot  AS 
BEGIN 

DECLARE @sql1 NVARCHAR(MAX);

SET @sql1 = 'Alter  VIEW Vue_OrdVsDespatch_Summary  as 

Select  MAs_exporter.ExporterName, ordermas.ORdid,Jobno,Finyear,orderqtydtl.styleno,ordermas.Buyerid,Ordermas.Merchid,BuyOrdno,ORdDate,ActDelDt,Ordermas.Expid,Ordertype,completed,
OrderStyleDtl.uom,ordermas.Season,fcy,Avg(orderqtydtl.salerate) as salerate,sum(orderqtydtl.Orderqty) as Orderqty,sum(orderqtydtl.Orderqty*orderqtydtl.salerate) as OrdAmt,sum(cutplanqty*orderqtydtl.Salerate) as OrdExcAmt,sum(Cutplanqty) as ExcQty,sum(isnull(VueDespatchStock.Pcs,0)) as DesPcs ,Avg(isnull(orderqtydtl.Salerate,0)) as Avgrate, sum(isnull(VueDespatchStock.Pcs,0)*isnull(orderqtydtl.Salerate,0)) as DesAmt,sum(orderqtydtl.Orderqty*orderqtydtl.Salerate)-sum(isnull(VueDespatchStock.Pcs,0)*isnull( orderqtydtl.Salerate,0)) as balAmt,sum(orderqtydtl.Orderqty)-sum(isnull(VueDespatchStock.Pcs,0)) as BalQty , fcyname,BuyerName,MerchName from ordermas INNER JOIN OrderStyleDtl ON OrderMas.Ordid = OrderStyleDtl.Ordid  inner join (select styleno,SizeId,ordid,styleid,colid,sum(Orderqty) as Orderqty,sum(Salerate) as Salerate,sum(cutplanqty) as cutplanqty from orderqtydtl group by styleno,SizeId,ordid,styleid,colid ) orderqtydtl on ordermas.ordid=orderqtydtl.ordid AND OrderQtyDtl.StyleNo = OrderStyleDtl.StyleNo INNER JOIN OrderMas2 ON OrderMas.OrdId = OrderMas2.Ordid left outer  join  VueDespatchStock1   as   VueDespatchStock on   orderqtydtl.ordid=VueDespatchStock.ordjobno  and orderqtydtl.styleno=VueDespatchStock.styleno and orderqtydtl.styleid=VueDespatchStock.styleid and orderqtydtl.colid=VueDespatchStock.colid and 
orderqtydtl.sizeid=VueDespatchStock.sizeid left outer  join Mas_buyer  on ordermas.Buyerid=MAs_buyer.Buyerid left outer join Mas_MErchandiser on Ordermas.merchid=Mas_MErchandiser.merchid left outer join MAs_season on ordermas.season=MAs_season.seasid left
 outer join MAs_fcy on Ordermas.Fcy=MAs_fcy.id  left outer join MAs_exporter on Ordermas.Expid=MAs_Exporter.Expid WHERE OrderStyleDtl.EntryOption =1  group by ordermas.ORdid,Jobno,Finyear,orderqtydtl.styleno,ordermas.Buyerid,Ordermas.Merchid,BuyOrdno,ORdDate,ActDelDt,Ordermas.Expid,Ordertype,completed,OrderStyleDtl.uom,ordermas.Season, fcyname,fcy,MAs_exporter.ExporterName,BuyerName,MerchName 




UNION 



Select MAs_exporter.ExporterName,ordermas.ORdid,Jobno,Finyear,orderqtydtl.styleno,ordermas.Buyerid,Ordermas.Merchid,BuyOrdno,ORdDate,ActDelDt,
Ordermas.Expid,Ordertype,completed,OrderStyleDtl.uom,ordermas.Season,fcy,Avg(orderqtydtl.salerate) as salerate,
sum(orderqtydtl.SizeQty) as Orderqty,sum(orderqtydtl.SizeQty*orderqtydtl.salerate) as OrdAmt,sum((SizeQty + (SizeQty * isnull(Exs_Per,0) /100))*orderqtydtl.Salerate) as OrdExcAmt,sum(SizeQty + (SizeQty * isnull(Exs_Per,0) /100) ) as ExcQty,sum(isnull(VueDespatchStock.Pcs,0)) as DesPcs ,Avg(isnull(orderqtydtl.Salerate,0)) as Avgrate, sum(isnull(VueDespatchStock.Pcs,0)*isnull(orderqtydtl.Salerate,0)) as DesAmt,sum(orderqtydtl.SizeQty*orderqtydtl.Salerate)-sum(isnull(VueDespatchStock.Pcs,0)*isnull(orderqtydtl.Salerate,0)) as balAmt,sum(orderqtydtl.SizeQty)-sum(isnull(VueDespatchStock.Pcs,0)) as BalQty , fcyname,BuyerName,MerchName from ordermas  INNER JOIN OrderStyleDtl ON OrderMas.Ordid = OrderStyleDtl.Ordid  
inner join (select OrdID,Styleno,StyleID,sum(Salerate)Salerate,sum (SizeQty)SizeQty,Exs_Per,CmbClrID,sizeid from OrdQtyClrDtl group by Exs_Per,CmbClrID,sizeid,OrdID,Styleno,StyleID) as OrderQtyDtl on ordermas.ordid=orderqtydtl.ordid And OrderQtyDtl.OrdID = OrderStyleDtl.OrdID And OrderQtyDtl.Styleno = OrderStyleDtl.StyleNo And OrderQtyDtl.StyleID = OrderStyleDtl.StyleID INNER JOIN OrderMas2 ON OrderMas.OrdId = OrderMas2.Ordid left outer  join  VueDespatchStock1    as VueDespatchStock on   orderqtydtl.ordid=VueDespatchStock.ordjobno  and orderqtydtl.styleno=VueDespatchStock.styleno and orderqtydtl.styleid=VueDespatchStock.styleid and orderqtydtl.CmbClrID=VueDespatchStock.colid and orderqtydtl.sizeid=VueDespatchStock.sizeid left outer  join Mas_buyer  on ordermas.Buyerid=MAs_buyer.Buyerid left outer join Mas_MErchandiser on Ordermas.merchid=Mas_MErchandiser.merchid left outer join MAs_season on ordermas.season=MAs_season.seasid left outer join MAs_fcy on Ordermas.Fcy=MAs_fcy.id  left outer join MAs_exporter on Ordermas.Expid=MAs_Exporter.Expid WHERE OrderStyleDtl.EntryOption =2 group by   ordermas.ORdid,Jobno,Finyear,orderqtydtl.styleno,ordermas.Buyerid,Ordermas.Merchid,BuyOrdno,ORdDate,ActDelDt,Ordermas.Expid,Ordertype,completed,OrderStyleDtl.uom,ordermas.Season, fcyname,fcy,MAs_exporter.ExporterName,BuyerName,MerchName '

EXEC sp_executesql @sql1 

END


