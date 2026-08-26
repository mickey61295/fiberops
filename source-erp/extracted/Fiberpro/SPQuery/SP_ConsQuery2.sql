/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  03/12/2022 10.14 AM 
; =============================================  */  
CREATE PROCEDURE SP_ConsQuery2 (@Ordid int,@Styleno Varchar(30),@Coycode int,@StageID int)
AS 

SELECT Prog_ClrComb.Yd, Prog_ClrComb.compID, Prog_ClrComb.ID, Prog_ClrComb.ClrCombID, Prog_ClrComb.FabClr, Prog_ClrComb.FabDesc, Prog_ClrComb.GreyGsm, Prog_ClrComb.FinalGsm, Prog_ClrComb.GG, Prog_ClrComb.LL, Prog_Cns.FABWIDTH AS FabWid, Prog_ClrComb.WtUom, Prog_ClrComb.LooseFab, Prog_Cns.sizid, Prog_Cns.pcswgt, Prog_Cns.kdia, Prog_Cns.fdia, Prog_Cns.ldia, Sum(Prodentry.ProdPcs) AS OrderQty, 0 AS Exs_Per, Prog_ClrComb.CompGrdSlno,  Prog_ClrComb.PExc, ISNULL(Prog_Cns.NoofPiece, 1) AS NoofPiece, ISNULL(OrderQtyDtl.CutPlanQty, 0)AS CutPlanQty,PcsPerBit,PcsWt1 FROM Prog_ClrComb INNER JOIN Prog_Cns ON Prog_ClrComb.ID = Prog_Cns.ID INNER JOIN  (select OrdID,StyleNo,SizeId,ColID,CmbClrID,PartId,  ISNULL(sum(OrderQtyDtl.CutPlanQty), 0)AS CutPlanQty,Lotno from OrderQtyDtl where OrdID = @OrdId AND StyleNo = @StyleNo group by OrdID,StyleNo,SizeId,ColID,CmbClrID,PartId,Lotno) OrderQtyDtl ON Prog_ClrComb.OrdID = OrderQtyDtl.OrdID AND Prog_ClrComb.StyleNo = OrderQtyDtl.StyleNo AND Prog_Cns.sizid = OrderQtyDtl.SizeId AND Prog_ClrComb.ClrCombID = OrderQtyDtl.ColID

INNER JOIN (Select ORdid,Styleno,bitsizeID,SizeId,PcsPerBit,bitSize FROM Pro_ProdBitCutDet inner join Mas_Bitsize on Pro_ProdBitCutDet.BitSizeID = Mas_Bitsize.id ) AA on AA.Ordid = OrderQtyDtl.OrdID 
AND AA.Styleno = OrderQtyDtl.StyleNo AND AA.SizeId = OrderQtyDtl.SizeId 

INNER JOIN (Select Distinct ORdid,Styleno,bitsizeID,Wrk_ID,Partid,DesignDescription,IsNull(pcswt,0) as PcsWt1 FROM Pro_Prod_BitCutRate inner join Mas_Bitsize on Pro_Prod_BitCutRate.BitSizeID = Mas_Bitsize.id ) BB on BB.Ordid = OrderQtyDtl.OrdID 
AND BB.Styleno = OrderQtyDtl.StyleNo AND BB.Partid = OrderQtyDtl.PartID 

 INNER JOIN (select Trs_Prodentry.id,Trs_Prodentry.ordid,Trs_Prodentry.StyleNo,ClrId,LotNo,Trs_Prodentry.PARTID,StageID,CoyId,FabDesc,(ProdPcs) ProdPcs,SizId,DesignDescription from  Trs_Prodentry inner  join Trs_Prodentryqty on Trs_Prodentry.id=Trs_Prodentryqty.id inner join (select distinct PARTID,FabDesc,Ordid,StyleNo from Prog_ClrComb  WHERE Ordid = @Ordid and Styleno=@styleno )x on Trs_Prodentry.OrdId=x.OrdID and  Trs_Prodentry.StyleNo=x.StyleNo and   Trs_Prodentry.PARTID=x.PartID 


  WHERE Trs_Prodentry.Ordid = @Ordid and Trs_Prodentry.Styleno=@styleno and StageID=@StageID ) Prodentry  on Prodentry .ordid =OrderQtyDtl.OrdID  AND Prodentry.StyleNo = OrderQtyDtl.StyleNo and Prodentry.clrid = OrderQtyDtl.ColID  and Prodentry.Sizid = OrderQtyDtl.SizeId    and Prodentry.PARTID = OrderQtyDtl.PartID   and  Prodentry.FabDesc = Prog_ClrComb.FabDesc
   AND  Prodentry.DesignDescription = AA.BitSize 
   AND BB.DesignDescription = Prodentry.DesignDescription 

   LEFT OUTER JOIN Prog_Component ON Prog_ClrComb.OrdID = Prog_Component.OrdID AND Prog_ClrComb.StyleNo = Prog_Component.StyleNo AND Prog_ClrComb.compID = Prog_Component.CompID AND Prog_ClrComb.ID = Prog_Component.sl INNER JOIN  (Select Distinct A.Ordid,A.Styleno,Stocktable.FabId,StockTable.Colid,StockTable.gsm,stocktable.fingsm,stocktable.gg,stocktable.ll From TRS_Del2 A  INNER JOIN Trs_Del1 B ON A.ID = B.ID  INNER JOIN StockTable ON Stocktable.Stockid = A.StockId Where TrType = -2 and Prs_Dept=11  and stocktable.YF='F' ) X ON X.FabID = Prog_ClrComb.FabDesc And X.colid = prog_clrcomb.fabclr And X.gsm = Prog_ClrComb.GreyGsm And X.FinGsm = Prog_ClrComb.FinalGsm and X.GG = Prog_ClrComb.GG  And X.LL = Prog_ClrComb.LL and X.ordid = OrderQtyDtl.Ordid and x.styleno = OrderQtyDtl.Styleno And Prodentry.Lotno=OrderQtyDtl.Lotno  WHERE     (Prog_ClrComb.OrdID = @OrdId) AND (Prog_ClrComb.StyleNo =  @StyleNo) and Prodentry.stageid=@StageId and Prodentry.coyid=@Coycode and Prog_ClrComb.yd <> 1 group by Prog_ClrComb.Yd, Prog_ClrComb.compID, Prog_ClrComb.ID, Prog_ClrComb.ClrCombID, Prog_ClrComb.FabClr, Prog_ClrComb.FabDesc, Prog_ClrComb.GreyGsm, Prog_ClrComb.FinalGsm, Prog_ClrComb.GG, Prog_ClrComb.LL, Prog_Cns.FABWIDTH , Prog_ClrComb.WtUom, Prog_ClrComb.LooseFab, Prog_Cns.sizid, Prog_Cns.pcswgt, Prog_Cns.kdia, Prog_Cns.fdia, Prog_Cns.ldia,  Prog_ClrComb.CompGrdSlno, Prog_ClrComb.PExc,OrderQtyDtl.CutPlanQty,Prog_Cns.NoofPiece,PcsPerBit,PcsWt1


 UNION ALL SELECT Prog_ClrComb.Yd, Prog_ClrComb.compID, Prog_ClrComb.ID, Prog_ClrComb.ClrCombID, Prog_ClrComb.Fincol, Prog_ClrComb.FabDesc, Prog_ClrComb.GreyGsm, Prog_ClrComb.FinalGsm, Prog_ClrComb.GG, Prog_ClrComb.LL, Prog_Cns.FABWIDTH AS FabWid, Prog_ClrComb.WtUom, Prog_ClrComb.LooseFab, Prog_Cns.sizid, Prog_Cns.pcswgt, Prog_Cns.kdia, Prog_Cns.fdia, Prog_Cns.ldia, Sum(Trs_ProdentryQty.ProdPcs) AS OrderQty, 0 AS Exs_Per, Prog_ClrComb.CompGrdSlno,  Prog_ClrComb.PExc, ISNULL(Prog_Cns.NoofPiece, 1) AS NoofPiece, ISNULL(OrderQtyDtl.CutPlanQty, 0)AS CutPlanQty,PcsPerBit,PcsWt1 FROM Prog_ClrComb INNER JOIN Prog_Cns ON Prog_ClrComb.ID = Prog_Cns.ID INNER JOIN  (select OrdID,StyleNo,SizeId,ColID,CmbClrID,PartId, Lotno, ISNULL(sum(OrderQtyDtl.CutPlanQty), 0)AS CutPlanQty from OrderQtyDtl where OrdID = @OrdId AND StyleNo = @StyleNo group by OrdID,StyleNo,SizeId,ColID,CmbClrID,PartId,Lotno)  OrderQtyDtl ON Prog_ClrComb.OrdID = OrderQtyDtl.OrdID AND Prog_ClrComb.StyleNo = OrderQtyDtl.StyleNo AND Prog_Cns.sizid = OrderQtyDtl.SizeId AND Prog_ClrComb.ClrCombID = OrderQtyDtl.ColID 
 
 INNER JOIN (Select ORdid,Styleno,bitsizeID,SizeId,PcsPerBit,bitSize FROM Pro_ProdBitCutDet inner join Mas_Bitsize on Pro_ProdBitCutDet.BitSizeID = Mas_Bitsize.id ) AA on AA.Ordid = OrderQtyDtl.OrdID 
AND AA.Styleno = OrderQtyDtl.StyleNo AND AA.SizeId = OrderQtyDtl.SizeId 

INNER JOIN (Select Distinct ORdid,Styleno,bitsizeID,Wrk_ID,Partid,DesignDescription,IsNull(pcswt,0) as PcsWt1 FROM Pro_Prod_BitCutRate inner join Mas_Bitsize on Pro_Prod_BitCutRate.BitSizeID = Mas_Bitsize.id ) BB on BB.Ordid = OrderQtyDtl.OrdID 
AND BB.Styleno = OrderQtyDtl.StyleNo AND BB.Partid = OrderQtyDtl.PartID 


   INNER JOIN (select Trs_Prodentry.id,Trs_Prodentry.ordid,Trs_Prodentry.StyleNo,ClrId,LotNo,Trs_Prodentry.PARTID,StageID,CoyId,FabDesc,(ProdPcs) ProdPcs,SizId,DesignDescription from  Trs_Prodentry inner  join Trs_Prodentryqty on Trs_Prodentry.id=Trs_Prodentryqty.id inner join (select distinct PARTID,FabDesc,Ordid,StyleNo from Prog_ClrComb  WHERE Ordid = @Ordid and Styleno=@styleno )x on Trs_Prodentry.OrdId=x.OrdID and  Trs_Prodentry.StyleNo=x.StyleNo and   Trs_Prodentry.PARTID=x.PartID  WHERE Trs_Prodentry.Ordid = @Ordid and Trs_Prodentry.Styleno=@styleno and StageID=@StageID ) Prodentry on Prodentry .ordid =OrderQtyDtl.OrdID  AND Prodentry.StyleNo = OrderQtyDtl.StyleNo and Prodentry.clrid = OrderQtyDtl.ColID 
    AND Prodentry.DesignDescription = AA.BitSize 
	AND BB.DesignDescription = Prodentry.DesignDescription 
    inner join Trs_ProdentryQty on Prodentry.id=Trs_ProdentryQty.id and Trs_ProdentryQty.Sizid = OrderQtyDtl.SizeId  and   OrderQtyDtl.PartID  =Prodentry.PARTID   and Prodentry.LotNo = OrderQtyDtl.LotNo and  Prodentry.FabDesc = Prog_ClrComb.FabDesc LEFT OUTER JOIN Prog_Component ON Prog_ClrComb.OrdID = Prog_Component.OrdID AND Prog_ClrComb.StyleNo = Prog_Component.StyleNo AND Prog_ClrComb.compID = Prog_Component.CompID AND Prog_ClrComb.ID = Prog_Component.sl INNER JOIN  (Select Distinct A.Ordid,A.Styleno,Stocktable.FabId,StockTable.Colid,StockTable.gsm,stocktable.fingsm,stocktable.gg,stocktable.ll From TRS_Del2 A  INNER JOIN Trs_Del1 B ON A.ID = B.ID  INNER JOIN StockTable ON Stocktable.Stockid = A.StockId Where TrType = -2 and Prs_Dept=11  and stocktable.YF='F' ) X ON X.FabID = Prog_ClrComb.FabDesc And X.colid = prog_clrcomb.fincol And X.gsm = Prog_ClrComb.GreyGsm And X.FinGsm = Prog_ClrComb.FinalGsm and X.GG = Prog_ClrComb.GG  And X.LL = Prog_ClrComb.LL and X.ordid = OrderQtyDtl.Ordid and x.styleno = OrderQtyDtl.Styleno And Prodentry.Lotno=OrderQtyDtl.Lotno  WHERE     (Prog_ClrComb.OrdID = @OrdId) AND (Prog_ClrComb.StyleNo =  @StyleNo) and Prodentry.stageid=@StageID and Prodentry.coyid=@Coycode and Prog_ClrComb.yd = 1 group by Prog_ClrComb.Yd, Prog_ClrComb.compID, Prog_ClrComb.ID, Prog_ClrComb.ClrCombID, Prog_ClrComb.Fincol, Prog_ClrComb.FabDesc, Prog_ClrComb.GreyGsm, Prog_ClrComb.FinalGsm, Prog_ClrComb.GG, Prog_ClrComb.LL, Prog_Cns.FABWIDTH , Prog_ClrComb.WtUom, Prog_ClrComb.LooseFab, Prog_Cns.sizid, Prog_Cns.pcswgt, Prog_Cns.kdia, Prog_Cns.fdia, Prog_Cns.ldia,  Prog_ClrComb.CompGrdSlno, Prog_ClrComb.PExc,OrderQtyDtl.CutPlanQty,Prog_Cns.NoofPiece,PcsPerBit,PcsWt1 ORDER BY Prog_ClrComb.compID

--SP_ConsQuery2 601,'ASJASDAJSD',2,-2

