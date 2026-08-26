/*;=============================================   

; Author           :  Global Software's    

; Create date      :  03/10/2022    

; Create By        :  ASLAM  

; Description      :  QUERY

; Change Person    :  SHAJAHAN

; Last Change Date :  18/10/2023 10.00 AM 

; =============================================  */  

CREATE VIEW  Vue_GrnRegFab as 



SELECT     Trs_Grn1.DocNo, Trs_Grn1.Finyear, Trs_Grn1.dt, Trs_Grn1.PartyDCref,Trs_Grn1.partydcdate, Mas_Count.CountName, Mas_Party.Pname, Mas_Dept.Deptname, Mas_Color.ColorDesc, Trs_GRN2.RBag, Trs_GRN2.RecKgs, Trs_GRN2.Recmtr, Mas_Exporter.ExporterName, Trs_Grn1.PoID, Trs_Grn1.DCID, Trs_Po1.DocNo AS PoNo, Trs_Po1.Finyear AS PoFinyear, Trs_Del1.DocNo AS DcNo, Trs_Del1.Finyear AS DcFinyear, Mas_Dia.Dia, Mas_Fabric.Fabdesc, StockTable.Gsm, StockTable.GG, StockTable.ll, OrderMas.BuyOrdNo, OrderMas.OrdId, Trs_Grn1.GRNType, Trs_Grn1.Coycode, Mas_Dept.DeptID, Mas_Party.PID, Trs_GRN2.InvId, Mas_Uom.Uom, CASE Trs_Grn1.GRNType WHEN 'Purchase' THEN 1 WHEN 'Process' THEN 2 WHEN 'Process Return' THEN 3 WHEN 'Sales Return' THEN 4 WHEN 'DirectReceipt'THEN 5 END  AS Type
, OrderMas.Jobno, OrderMas.Finyear AS iofinyear, StockTable.LotNo, OrderMas.Completed, OrderMas.OrderType, Mas_Dept.OrderSno, Trs_Grn1.ID, Trs_Grn1.processtype, Mas_Design.DesignDesc ,StockTable.FabID,StockTable.ColID ,StockTable.DiaID ,StockTable.CntID, 
StockTable.PRINT_DESIGNID ,FinGsm,FinDiaid,stocktable.PrgknitDiaid,Mas_color_1.ColorDesc as ComboColor , PartName,CompDescr,ISNULL(Mas_Buyer.BuyerName,'''')BuyerName,ISNULL(Mas_Season.SeasDesc,'''')Season,ISNULL(CNo,'') CNo,Trs_GRN2.StyleNo,VName FROM OrderMas 
INNER JOIN Trs_Grn1 INNER JOIN Trs_GRN2 ON Trs_Grn1.ID = Trs_GRN2.ID INNER JOIN StockTable ON Trs_GRN2.StockID = StockTable.StockID INNER JOIN Mas_Dept ON Trs_Grn1.Dept = Mas_Dept.DeptID INNER JOIN Mas_Party ON Trs_Grn1.SuppID = Mas_Party.PID ON OrderMas.
OrdId = Trs_GRN2.ordid INNER JOIN Mas_Exporter ON Trs_Grn1.Coycode = Mas_Exporter.ExpID INNER JOIN Mas_Fabric ON StockTable.FabID = Mas_Fabric.FabID INNER JOIN Mas_Dia ON StockTable.DiaID = Mas_Dia.DiaID LEFT OUTER JOIN Mas_Design ON StockTable.PRINT_DESIGNID = Mas_Design.DesignId LEFT OUTER JOIN Mas_Uom ON Mas_Fabric.PriUomID = Mas_Uom.UomID LEFT OUTER JOIN Mas_Count ON StockTable.CntID = Mas_Count.CountID LEFT OUTER JOIN Mas_Color ON StockTable.ColID = Mas_Color.ColID LEFT OUTER JOIN Trs_Del1 ON Trs_Grn1.DCID = Trs_Del1.ID LEFT OUTER JOIN Trs_Po1 ON Trs_Grn1.PoID = Trs_Po1.ID LEFT OUTER JOIN Mas_Color as Mas_Color_1 ON StockTable.CmbClrId = Mas_Color_1.ColID   LEFT OUTER JOIN Mas_Part ON StockTable.PartID = Mas_Part.PartID   LEFT OUTER JOIN Mas_Component ON StockTable.CompID = Mas_Component.CompID LEFT JOIN Mas_Buyer on Mas_Buyer.BuyerID=OrderMas.BuyerID LEFT JOIN Mas_Season on Mas_Season.SeasID=OrderMas.Season LEFT OUTER JOIN  Trs_Certificate ON Trs_Grn1.ID=Trs_Certificate.GrnId AND  Trs_Grn1.SuppID=Trs_Certificate.SuppId AND Trs_Grn1.Dept=Trs_Certificate.DeptId  LEFT JOIN Mas_Vehicle ON Trs_Grn1.VehicleCode = Mas_Vehicle.Code WHERE     (StockTable.YF = 'F')



UNION



SELECT     Trs_Grn1.DocNo, Trs_Grn1.Finyear, Trs_Grn1.GRNDate as Dt, T2.PartyDcRef,T2.partydcdate, Mas_Count.CountName, Mas_Party.Pname, Mas_Dept.Deptname, Mas_Color.ColorDesc, Trs_GRN2.RBag, Trs_GRN2.RecKgs, Trs_GRN2.Recmtr, Mas_Exporter.ExporterName, Trs_grn2.PoID, T2.OurDCID as DCID, Trs_Po1.DocNo AS PoNo, Trs_Po1.Finyear AS PoFinyear, Trs_Del1.DocNo AS DcNo, Trs_Del1.Finyear AS DcFinyear, Mas_Dia.Dia, Mas_Fabric.Fabdesc, StockTable.Gsm, StockTable.GG, StockTable.ll, OrderMas.BuyOrdNo, OrderMas.OrdId, 
Trs_Grn1.GRNType, Trs_Grn1.Coycode, Mas_Dept.DeptID, Mas_Party.PID, Trs_GRN2.InvId, Mas_Uom.Uom, CASE Trs_Grn1.GRNType WHEN 'Purchase' THEN 1 WHEN 'Process' THEN 2 WHEN 'Process Return' THEN 3 WHEN 'Sales Return' THEN 4 WHEN 'DirectReceipt'THEN 5 END  AS 
Type, OrderMas.Jobno, OrderMas.Finyear AS iofinyear, StockTable.LotNo, OrderMas.Completed, OrderMas.OrderType, Mas_Dept.OrderSno, Trs_Grn1.ID, Trs_Grn1.processtype, Mas_Design.DesignDesc ,StockTable.FabID,StockTable.ColID ,StockTable.DiaID ,StockTable.CntID, StockTable.PRINT_DESIGNID ,FinGsm,FinDiaid,stocktable.PrgknitDiaid,Mas_color_1.ColorDesc as ComboColor , PartName,CompDescr,ISNULL(Mas_Buyer.BuyerName,'''')BuyerName,ISNULL(Mas_Season.SeasDesc,'''')Season,ISNULL(CNo,'') CNo,Trs_GRN2.StyleNo,'' as Vname FROM OrderMas INNER JOIN Trs_MultiPrs_Grn1  Trs_Grn1 INNER JOIN Trs_MultiPrs_Grn3 Trs_GRN2 ON Trs_Grn1.ID = Trs_GRN2.ID INNER JOIN Trs_MultiPrs_Grn2 T2 ON Trs_Grn1.ID = T2.ID  And Trs_grn2.DeptID = T2.DeptID and FinalProcess <> 'Y' INNER JOIN StockTable ON Trs_GRN2.StockID = StockTable.StockID INNER JOIN Mas_Dept ON Trs_Grn2.DeptID = Mas_Dept.DeptID INNER JOIN Mas_Party ON T2.PartyID = Mas_Party.PID ON OrderMas.OrdId = Trs_GRN2.ordid INNER JOIN Mas_Exporter ON Trs_Grn1.Coycode = Mas_Exporter.ExpID INNER JOIN Mas_Fabric ON StockTable.FabID = Mas_Fabric.FabID INNER JOIN Mas_Dia ON StockTable.DiaID = Mas_Dia.DiaID LEFT OUTER JOIN Mas_Design ON StockTable.PRINT_DESIGNID = Mas_Design.DesignId LEFT OUTER JOIN Mas_Uom ON Mas_Fabric.PriUomID = Mas_Uom.UomID LEFT OUTER JOIN
 Mas_Count ON StockTable.CntID = Mas_Count.CountID LEFT OUTER JOIN Mas_Color ON StockTable.ColID = Mas_Color.ColID LEFT OUTER JOIN Trs_Del1 ON T2.OurDCID = Trs_Del1.ID LEFT OUTER JOIN Trs_Po1 ON Trs_Grn2.PoID = Trs_Po1.ID LEFT OUTER JOIN Mas_Color as Mas_Color_1 ON StockTable.CmbClrId = Mas_Color_1.ColID   LEFT OUTER JOIN Mas_Part ON StockTable.PartID = Mas_Part.PartID   LEFT OUTER JOIN Mas_Component ON StockTable.CompID = Mas_Component.CompID LEFT JOIN Mas_Buyer on Mas_Buyer.BuyerID=OrderMas.BuyerID LEFT
 JOIN Mas_Season on Mas_Season.SeasID=OrderMas.Season LEFT OUTER JOIN  Trs_Certificate ON Trs_Grn1.ID=Trs_Certificate.GrnId AND  T2.PartyID=Trs_Certificate.SuppId AND Trs_grn2.DeptID=Trs_Certificate.DeptId    WHERE     (StockTable.YF = 'F')