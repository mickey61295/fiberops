/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  PANEL_Stock  
; Change Person    :  ASLAM
; Last Change Date :  14/06/2023 10.00 AM 
; =============================================  */  
CREATE PROCEDURE PROC_UnitAck_Panel_Delete_2 (@Id Int) AS  DECLARE @OrdId Int,@StageId Int ,@SourceCoycode int ,@StyleNo Varchar(20),@LotNo Varchar(15),@ColId int,@PartID Int,@SizeID Int,@Pcs Int,@PanelId Int,@StyleID Int,@TransId Int,@LotId Int,@compID int ,@SCGodID int

Select @Id = @Id  
SELECT @OrdId = Ordjobno From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.Id=Trs_UnitAck2.TransId Where Trs_UnitAck2.Id=@Id  
SELECT @SourceCoycode = coycode From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.Id=Trs_UnitAck2.TransId Where Trs_UnitAck2.Id=@Id  
/*SELECT @StageId = TargetStageID From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.Id=Trs_UnitAck2.TransId Where Trs_UnitAck2.Id=@Id  */

 SELECT @StageId = Trs_Pcs2.SourceStageID From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.Id=Trs_UnitAck2.TransId 
INNER JOIN Trs_Pcs2 ON Trs_Pcs1.Id = Trs_Pcs2.ID And Trs_Pcs2.StyleNo = Trs_UnitAck2.StyleNo And Trs_Pcs2.ColID = Trs_UnitAck2.ColID 
And Trs_Pcs2.SizeID = Trs_UnitAck2.SizeID and trs_Pcs2.PartID = Trs_UnitAck2.PartID  Where Trs_UnitAck2.Id=@Id 

SELECT Distinct @SCGodID =  GodId From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.Id=Trs_UnitAck2.TransId Where Trs_UnitAck2.Id=@Id  

/*SELECT @CompId = IsNull(CompID,0) From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.Id=Trs_UnitAck2.TransId Where Trs_UnitAck2.Id=@Id  */







BEGIN   

DECLARE LINE_CURSOR CURSOR FOR  Select  A.Id,A.ColId,A.StyleId,A.PanelId,A.SizeID,A.Styleno,A.PartID,A.TransId,A.Pcs,A.LotNo,A.compID,B.SourceStageID FROM Trs_UnitAck2 A INNER JOIN Trs_Pcs2 B ON A.TransID = B.ID 
And A.LotNo = B.LotNo  AND B.StyleNo = A.StyleNo And B.ColID = A.ColID And B.SizeID = A.SizeID and B.PartID = A.PartID And A.CompID = B.CompID 
Where A.ID=@Id  

OPEN LINE_CURSOR  

FETCH NEXT FROM LINE_CURSOR INTO @id,@ColId,@StyleId,@PanelId,@Sizeid,@StyleNo,@PartID,@TransID,@Pcs,@LotNo,@CompID,@StageId    

WHILE @@FETCH_STATUS = 0    

BEGIN 	

if ltrim(@LotNo)<>''  	

SELECT @LotID = LotSno from mas_Lot where LotName =LTrim(@LotNo) 	

ELSE  	

SELECT @LotId = 0  

/* Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.Sto

ckQty+Deleted.Pcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStoc



kId Inner Join Trs_UnitAck1 On Panel_StockTable.Coycode=Trs_UnitAck1.sender And Panel_StockTable.GodId=Trs_UnitAck1.GodId Inner Join Deleted On Trs_UnitAck1.Id=Deleted.Id And Panel_StockTable.StyleNo=Deleted.StyleNo And Panel_StockTable.PartId=Deleted.Par


tId And 



Panel_StockTableQty.ColId=Deleted.ColId And Panel_StockTableQty.SizeId=Deleted.SizeId where Panel_StockTable.coycode=Trs_UnitAck1.sender and Panel_StockTable.Ordid=@Ordid and Panel_StockTable.StyleNo=Deleted.StyleNo and Panel_StockTable.Stageid=@StageId a


nd Pcs_Stock



Table.PartId=Deleted.PartId and Panel_StockTable.GodId=Trs_UnitAck1.GodId and PartyId=0 and Panel_StockTableQty.ColId=Deleted.Colid and Panel_StockTableQty.SizeId=Deleted.SizeId  */  

/*

UPDATE Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty+@Pcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_UnitAck1 On Panel_StockTable.Co
ycode=@SourceCoycode And Panel_StockTable.GodId=@SCGodID And Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.PartId=@PartId And Panel_StockTableQty.ColId=@ColId And Panel_StockTableQty.SizeId=@SizeId And Panel_StockTableQty.CompId=@CompId where Pan
el_StockTable.coycode=@SourceCoycode and Panel_StockTable.Ordid=@Ordid and Panel_StockTable.StyleNo=@StyleNo and Panel_StockTable.Stageid=@StageId and Panel_StockTable.PartId=@PartId and Panel_StockTable.GodId=@SCGodID and PartyId=0 and Panel_StockTableQt
y.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId 

And Panel_StockTableQty.CompId=@CompId 

And Panel_StockTable.LotID = @LotId and Trs_UnitAck1.ID =@ID and Panel_StockTableQty.GoodPcsFlag='G' 

*/

 



UPDATE Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@Pcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_UnitAck1 On Panel_StockTable.Coycode=Trs_UnitAck1.Coycode And Panel_StockTable.GodId=Trs_UnitAck1.GodId And Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.PartId=@PartId And Panel_StockTableQty.ColId=@ColId And Panel_StockTableQty.SizeId=@SizeId And Panel_StockTableQty.CompId=
@CompId where Panel_StockTable.coycode=Trs_UnitAck1.Coycode and Panel_StockTable.Ordid=@Ordid and Panel_StockTable.StyleNo=@StyleNo and Panel_StockTable.Stageid=@StageId and Panel_StockTable.PartId=@PartId and Panel_StockTable.GodId=Trs_UnitAck1.GodId and 
PartyId=0 and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId 



And Panel_StockTableQty.CompId=@CompId 



And Panel_StockTable.LotID = @LotId and Trs_UnitAck1.ID =@ID and Panel_StockTableQty.GoodPcsFlag='G' 





 





FETCH NEXT FROM LINE_CURSOR INTO @id,@ColId,@StyleId,@PanelId,@Sizeid,@StyleNo,@PartID,@TransID,@Pcs,@LotNo ,@CompID ,@StageId

END  CLOSE LINE_CURSOR    

DEALLOCATE LINE_CURSOR    

SET NOCOUNT OFF   

END
