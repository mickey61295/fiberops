/*;=============================================   
; Author           :  Global Software's    
; Create date      :  08/04/2023 
; Create By        :  SHAJAHAN  
; Description      :  QUERY
; Change Person    :  SHAJAHAN
; Last Change Date :  10/04/2023 10.05 AM 
; =============================================  */  

      
 CREATE PROCEDURE SP_Qry19 (@Ordid int,@StyleNo varchar(50)) AS
BEGIN

  Select Combo, Sum(OrderQty) as OrderQty,Sum(CutQty) as CutQty, Sum(DespQty) as DespQty , Sum(OrderQty - DespQty) as BalanceQty From ( Select ColorDesc as Combo,IsNull(Sum(OrderQty),0) as OrderQty,0 as CutQty, 0 as DespQty from OrderQtyDtl A INNER JOIN Mas_Color ON A.CmbClrID = Mas_Color.ColID Where Ordid = @Ordid  and A.styleno =@StyleNo Group by ColorDesc  UNION Select ColorDesc as Combo,0 as OrderQty,Sum(ProdPcs) as CutQty, 0 as DespQty from Trs_Prodentry A INNER JOIN Trs_ProdentryQty B ON A.ID = B.ID 
INNER JOIN (select OrdID,StyleNo,PartID,ColID,SizeId,CmbClrID,sum(orderqty) orderqty from  OrderQtyDtl group by OrdID,StyleNo,PartID,ColID,SizeId,CmbClrID) C ON A.OrdId = C.OrdID   And A.StyleNo = C.StyleNo and A.PARTID = C.PartID  and A.ClrId = C.ColID and B.SizId = C.SizeId   INNER JOIN Mas_Color on C.CmbClrID =  Mas_Color.ColId  Where A.Ordid = @Ordid  And a.StyleNo =@StyleNo And StageID = 1 and orderqty >0 Group by ColorDesc UNION Select ColorDesc as Combo,0 as OrderQty,Sum(RecPcs) as CutQty,0 as DespQty  from Trs_PcsGrn1 A INNER JOIN Trs_PcsGrn2 B ON A.ID = B.ID INNER JOIN (select OrdID,StyleNo,PartID,ColID,SizeId,CmbClrID,sum(orderqty) orderqty from  OrderQtyDtl group by OrdID,StyleNo,PartID,ColID,SizeId,CmbClrID) C ON A.OrdJob = C.OrdID   And B.StyleNo = C.StyleNo and B.PARTID = C.PartID  and B.ColID = C.ColID and B.SizId = C.SizeId    INNER JOIN Mas_Color on C.CmbClrID =  Mas_Color.ColId   Where A.Ordjob = @Ordid  and B.StyleNo =@StyleNo and grntype = 'Process Receipt' and TargetStageID = 1  Group by ColorDesc UNION  Select ColorDesc as Combo ,0 as OrderQty,0 as CutQty,Sum(Pcs) as DespQty from Trs_Pcs1 A INNER JOIN Trs_Pcs2 B ON A.ID = B.ID INNER JOIN (select OrdID,StyleNo,CmbClrID,SizeId ,sum(orderqty) orderqty from OrderQtyDtl group by OrdID,StyleNo,CmbClrID,SizeId) C ON A.OrdJobno = C.OrdID   And B.StyleNo = C.StyleNo   and B.ColID = C.CmbClrID and B.SizeId = C.SizeId  INNER JOIN Mas_Color on C.CmbClrID =  Mas_Color.ColId   Where A.OrdjobNo = @Ordid  And B.StyleNo=@StyleNo and DelType ='Despatch' and orderqty> 0 Group by ColorDesc ) X Group by Combo
 END