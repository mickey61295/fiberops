/*;=============================================   
; Author           :  Global Software's    
; Create date      :  04/05/2023    
; Create By        :  Swetha  
; Description      :  QUERY
; Change Person    :  M.SUGANYA
; Last Change Date :  19/07/2023 10.32 AM 
; =============================================  */  

CREATE PROCEDURE SP_SalesInv (@Id int)
AS
select isnull(Mas_Exporter.Stateid,0)Stateid,Isnull(Mas_party.Stateid,0) Pstateid,Isnull(mas_Fabric.BrandedFlag,'N')BrandedFlag,Isnull(Mas_hsn.UnitRate,0)UnitRate,Isnull(trs_del2.Rate,0)Rate,isnull(BPercL,0)BPercL,isnull(NBPercL,0)NBPercL,isnull(BPercH,0)BPercH,isnull(NBPercH,0)NBPercH,trs_del2.kg,trs_del2.Rate,Case When IsNull(Mas_RateUom.Uom,'KGS') ='KGS' then (Trs_Del2.Kg * Trs_Del2.rate) ELSE (Trs_Del2.Mtr * Trs_Del2.rate) END  AS  Amount ,isnull(Trs_Del4.CGSTper,0)CGSTper,isnull(Trs_Del4.SGSTper,0)SGSTper,isnull(Trs_Del4.IGSTper,0)IGSTper, '' As HsnDet from Trs_del1 inner join trs_del2 on trs_Del1.id=trs_del2.id inner join Mas_Exporter on Mas_Exporter.ExpID=trs_del1.Coycode inner join mas_party on Mas_party.pid=trs_del1.party inner join Stocktable on trs_Del2.StockID =stocktable.StockID inner join Mas_Fabric on mas_fabric.fabid=StockTable.FabID INNER JOIN Mas_Uom ON Mas_uom.UomID = Mas_Fabric.PriUomID left outer join Mas_hsn On Mas_HSN.id=Mas_Fabric.HSNID left outer join Trs_Del4 on Trs_Del4.DcID = Trs_Del1.ID and Trs_Del2.StockID = Trs_Del4.StockID LEFT JOIN Mas_Uom Mas_RateUom ON Mas_RateUom.UomID = Trs_Del2.RateUomId   where trs_del1.id=@Id